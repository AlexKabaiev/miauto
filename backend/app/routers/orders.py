"""Orders API — CRUD with positions and payments."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.client import Client, ClientVehicle
from app.models.order import Order, OrderPosition
from app.models.payment import Payment
from app.schemas.order import (
    OrderCreate,
    OrderListItem,
    OrderRead,
    OrderUpdate,
    PositionCreate,
    PositionRead,
    PositionUpdate,
)
from app.schemas.payment import PaymentCreate, PaymentRead

router = APIRouter(prefix="/api/orders", tags=["orders"])


def _order_to_list_item(o: Order) -> OrderListItem:
    """Convert an Order ORM object to a lightweight list representation."""
    vehicle_display = None
    if o.vehicle:
        parts = [p for p in [o.vehicle.brand, o.vehicle.model] if p]
        vehicle_display = " ".join(parts) if parts else None

    return OrderListItem(
        id=o.id,
        client_id=o.client_id,
        date=o.date,
        client_name=o.client.fio if o.client else "—",
        client_phone=o.client.phone if o.client else None,
        vehicle_display=vehicle_display,
        positions_count=len(o.positions),
        total=o.total,
        paid=o.paid,
        debt=o.debt,
        profit=o.profit,
        group=o.group,
        is_active=o.is_active,
    )


def _order_to_read(o: Order) -> OrderRead:
    """Convert an Order ORM object to full read representation."""
    vehicle_display = None
    if o.vehicle:
        parts = [p for p in [o.vehicle.brand, o.vehicle.model] if p]
        vehicle_display = " ".join(parts) if parts else None

    positions = [
        PositionRead(
            id=p.id,
            order_id=p.order_id,
            code=p.code,
            analogs=p.analogs,
            name=p.name,
            supplier_id=p.supplier_id,
            quantity=p.quantity,
            price_purchase=p.price_purchase,
            price_sell=p.price_sell,
            manufacturer=p.manufacturer,
            condition=p.condition,
            arrival_date=p.arrival_date,
            sale_date=p.sale_date,
            note=p.note,
            supplier_name=p.supplier.name if p.supplier else None,
        )
        for p in o.positions
    ]

    return OrderRead(
        id=o.id,
        client_id=o.client_id,
        vehicle_id=o.vehicle_id,
        date=o.date,
        currency=o.currency,
        exchange_rate=o.exchange_rate,
        markup=o.markup,
        discount=o.discount,
        total=o.total,
        debt=o.debt,
        is_active=o.is_active,
        group=o.group,
        archive_group=o.archive_group,
        final_date=o.final_date,
        info=o.info,
        author=o.author,
        paid=o.paid,
        profit=o.profit,
        client_name=o.client.fio if o.client else "—",
        client_phone=o.client.phone if o.client else None,
        vehicle_display=vehicle_display,
        positions_count=len(o.positions),
        positions=positions,
    )


# Дозволені колонки для сортування (захист від довільного getattr)
_ALLOWED_SORT_COLS = {"id", "date", "total", "debt", "paid", "client_id", "group"}


def _recalculate_order(order: Order) -> None:
    """Recalculate total (з урахуванням markup/discount) та debt."""
    base = sum(
        (p.price_sell * p.quantity for p in order.positions), Decimal("0.00")
    )
    markup_factor = Decimal(str(1 + (order.markup or 0.0) / 100))
    discount_factor = Decimal(str(1 - (order.discount or 0.0) / 100))
    order.total = (base * markup_factor * discount_factor).quantize(Decimal("0.01"))
    order.debt = order.total - order.paid


# ── List ─────────────────────────────────────────────────────────────────
@router.get("", response_model=dict)
def list_orders(
    search: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    group: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    status_filter: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    sort_by: str = Query("date"),
    sort_dir: str = Query("desc"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    # Моделі вже мають lazy="selectin" — joinedload зайвий і призводить до дублювання
    q = db.query(Order)

    if status_filter == "completed":
        q = q.filter(Order.group == "Виконано")
    elif status_filter == "active":
        q = q.filter(~Order.group.in_(["Виконано", "Скасовано"]))
    elif is_active is not None:
        q = q.filter(Order.is_active == is_active)
    if group:
        q = q.filter(Order.group == group)
    if date_from:
        q = q.filter(Order.date >= date_from)
    if date_to:
        q = q.filter(Order.date <= date_to)
    if client_id is not None:
        q = q.filter(Order.client_id == client_id)
    if search:
        like = f"%{search}%"
        # Явний JOIN замість relationship join — уникає конфлікту з client_id фільтром
        q = q.join(Client, Order.client_id == Client.id).filter(
            or_(Client.fio.ilike(like), Client.phone.ilike(like))
        )

    # Sorting — whitelist захищає від довільного getattr
    safe_sort = sort_by if sort_by in _ALLOWED_SORT_COLS else "date"
    sort_col = getattr(Order, safe_sort)
    if sort_dir == "asc":
        q = q.order_by(sort_col.asc())
    else:
        q = q.order_by(sort_col.desc())

    total = q.count()
    items = q.offset(skip).limit(limit).all()

    return {
        "items": [_order_to_list_item(o) for o in items],
        "total": total,
    }


# ── Detail ───────────────────────────────────────────────────────────────
@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Замовлення не знайдено")
    return _order_to_read(order)


# ── Create ───────────────────────────────────────────────────────────────
@router.post("", response_model=OrderRead, status_code=201)
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    # Validate client exists
    if not db.get(Client, data.client_id):
        raise HTTPException(404, "Клієнт не знайдений")

    positions_data = data.positions
    order_data = data.model_dump(exclude={"positions", "paid"})
    order = Order(**order_data)
    db.add(order)
    db.flush()  # get order.id

    for pos_data in positions_data:
        pos = OrderPosition(order_id=order.id, **pos_data.model_dump())
        db.add(pos)

    if data.paid is not None and data.paid > 0:
        payment = Payment(order_id=order.id, amount=data.paid, comment="Початкова оплата", author=order.author)
        order.payments.append(payment)

    db.flush()
    _recalculate_order(order)

    # Валідація статусу "Виконано"
    if order.group == "Виконано":
        if order.debt > 0 or order.paid < order.total:
            raise HTTPException(
                status_code=400,
                detail=f"Неможливо встановити статус 'Виконано', оскільки замовлення не оплачено повністю. Поточний борг: {order.debt} грн."
            )

    db.commit()
    db.refresh(order)
    return _order_to_read(order)


# ── Update ───────────────────────────────────────────────────────────────
@router.put("/{order_id}", response_model=OrderRead)
def update_order(order_id: int, data: OrderUpdate, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Замовлення не знайдено")

    update_data = data.model_dump(exclude_unset=True)
    positions_list = update_data.pop("positions", None)
    paid_val = update_data.pop("paid", None)

    for key, value in update_data.items():
        setattr(order, key, value)

    if positions_list is not None:
        # Cascade delete-orphan автоматично видалить старі позиції
        order.positions = [
            OrderPosition(order_id=order_id, **pos_dict)
            for pos_dict in positions_list
        ]
        db.flush()

    if paid_val is not None:
        current_paid = order.paid
        if paid_val != current_paid:
            order.payments.clear()
            if paid_val > 0:
                payment = Payment(order_id=order_id, amount=paid_val, comment="Оплата", author=order.author)
                order.payments.append(payment)
            db.flush()

    _recalculate_order(order)

    # Валідація статусу "Виконано"
    if order.group == "Виконано":
        if order.debt > 0 or order.paid < order.total:
            raise HTTPException(
                status_code=400,
                detail=f"Неможливо встановити статус 'Виконано', оскільки замовлення не оплачено повністю. Поточний борг: {order.debt} грн."
            )

    db.commit()
    db.refresh(order)
    return _order_to_read(order)


# ── Delete ───────────────────────────────────────────────────────────────
@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Замовлення не знайдено")
    db.delete(order)
    db.commit()


# ══════════════════════════════════════════════════════════════════════════
# Positions
# ══════════════════════════════════════════════════════════════════════════
@router.post("/{order_id}/positions", response_model=PositionRead, status_code=201)
def add_position(order_id: int, data: PositionCreate, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Замовлення не знайдено")
    pos = OrderPosition(order_id=order_id, **data.model_dump())
    db.add(pos)
    db.flush()
    _recalculate_order(order)
    db.commit()
    db.refresh(pos)
    return PositionRead(
        **{k: getattr(pos, k) for k in PositionRead.model_fields if k != "supplier_name"},
        supplier_name=pos.supplier.name if pos.supplier else None,
    )


@router.put("/{order_id}/positions/{pos_id}", response_model=PositionRead)
def update_position(
    order_id: int, pos_id: int, data: PositionUpdate, db: Session = Depends(get_db)
):
    pos = db.query(OrderPosition).filter_by(id=pos_id, order_id=order_id).first()
    if not pos:
        raise HTTPException(404, "Позицію не знайдено")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pos, key, value)
    order = db.get(Order, order_id)
    _recalculate_order(order)
    db.commit()
    db.refresh(pos)
    return PositionRead(
        **{k: getattr(pos, k) for k in PositionRead.model_fields if k != "supplier_name"},
        supplier_name=pos.supplier.name if pos.supplier else None,
    )


@router.delete("/{order_id}/positions/{pos_id}", status_code=204)
def delete_position(order_id: int, pos_id: int, db: Session = Depends(get_db)):
    pos = db.query(OrderPosition).filter_by(id=pos_id, order_id=order_id).first()
    if not pos:
        raise HTTPException(404, "Позицію не знайдено")
    db.delete(pos)
    db.flush()
    order = db.get(Order, order_id)
    _recalculate_order(order)
    db.commit()


# ══════════════════════════════════════════════════════════════════════════
# Payments
# ══════════════════════════════════════════════════════════════════════════
@router.post("/{order_id}/payments", response_model=PaymentRead, status_code=201)
def add_payment(order_id: int, data: PaymentCreate, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Замовлення не знайдено")
    payment = Payment(order_id=order_id, **data.model_dump())
    db.add(payment)
    db.flush()
    _recalculate_order(order)
    db.commit()
    db.refresh(payment)
    return payment
