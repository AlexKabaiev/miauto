from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, and_, func as sa_func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.client import Client, ClientVehicle, ClientStatusHistory
from app.models.order import Order
from app.schemas.client import (
    ClientCreate,
    ClientListItem,
    ClientRead,
    ClientUpdate,
    VehicleCreate,
    VehicleRead,
    VehicleUpdate,
)

router = APIRouter(prefix="/api/clients", tags=["clients"])


def get_computed_client_data(client: Client, db: Session):
    """Compute status, flags and debt dynamically based on business rules."""
    # Check if the client has any completed orders (group == "Виконано")
    has_completed = db.query(Order.id).filter(Order.client_id == client.id, Order.group == "Виконано").first() is not None
    
    # Calculate client total debt
    total_debt = db.query(sa_func.sum(Order.debt)).filter(Order.client_id == client.id, Order.debt > 0.01, Order.group != "Скасовано").scalar() or Decimal("0.00")
    total_debt_val = float(total_debt)
    has_debt = total_debt_val > 0.01
    
    computed_status = client.status
    if computed_status in ("Активний", "Новий", None, ""):
        computed_status = "Активний" if has_completed else "Новий"
        
    # Parse flags
    flags_list = [f.strip() for f in (client.flags or "").split(",") if f.strip()]
    
    # Auto add/remove "Є борг"
    if has_debt:
        if "Є борг" not in flags_list:
            flags_list.append("Є борг")
    else:
        if "Є борг" in flags_list:
            flags_list.remove("Є борг")
            
    return computed_status, ",".join(flags_list), total_debt_val


# ── List ─────────────────────────────────────────────────────────────────
@router.get("", response_model=dict)
def list_clients(
    search: Optional[str] = Query(None, description="Пошук по ФІО або телефону"),
    client_id: Optional[int] = Query(None, description="Пошук за кодом клієнта"),
    status_filter: Optional[str] = Query(None, description="Фільтр по статусу"),
    flag_filter: Optional[str] = Query(None, description="Фільтр по ознаці"),
    skip: int = 0,
    limit: int = 50,
    show_archived: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(Client)
    
    # 1. Archive filter logic
    # We no longer hide archived clients from the main list by default.
        
    # 2. Search parameters
    if client_id is not None:
        q = q.filter(Client.id == client_id)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Client.fio.ilike(like), Client.phone.ilike(like)))
        
    # 3. Status filter
    if status_filter:
        if status_filter == "Новий":
            q = q.filter(
                or_(
                    Client.status == "Новий",
                    and_(
                        or_(Client.status == "Активний", Client.status == None, Client.status == ""),
                        ~Client.orders.any(Order.group == "Виконано")
                    )
                )
            )
        elif status_filter == "Активний":
            q = q.filter(
                or_(Client.status == "Активний", Client.status == None, Client.status == "")
            ).filter(
                Client.orders.any(Order.group == "Виконано")
            )
        else:
            q = q.filter(Client.status == status_filter)
            
    # 4. Flag filter
    if flag_filter:
        if flag_filter == "Є борг":
            q = q.filter(Client.orders.any(and_(Order.debt > 0.01, Order.group != "Скасовано")))
        else:
            q = q.filter(Client.flags.like(f"%{flag_filter}%"))
            
    total = q.count()
    
    # 5. Sorting logic
    if not status_filter:
        from sqlalchemy import case
        has_completed_orders = Client.orders.any(Order.group == "Виконано")
        is_active = or_(
            Client.status == 'Активний',
            and_(
                or_(Client.status == 'Новий', Client.status == None, Client.status == ""),
                has_completed_orders
            )
        )
        q = q.order_by(
            case(
                (is_active, 0),
                else_=1
            ),
            Client.fio
        )
    else:
        q = q.order_by(Client.fio)
        
    items = q.offset(skip).limit(limit).all()
    
    # 5. Populate dynamic fields
    validated_items = []
    for c in items:
        status, flags, debt_val = get_computed_client_data(c, db)
        item = ClientListItem.model_validate(c)
        item.status = status
        item.flags = flags
        item.total_debt = debt_val
        item.is_bad = (status == "Проблемний" or "Ризиковий" in flags.split(","))
        item.is_archived = (status == "Архівний")
        validated_items.append(item)
        
    return {
        "items": validated_items,
        "total": total,
    }


# ── Detail ───────────────────────────────────────────────────────────────
@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)):
    from decimal import Decimal
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Клієнт не знайдений")
    
    status, flags, debt_val = get_computed_client_data(client, db)
    
    read_obj = ClientRead.model_validate(client)
    read_obj.status = status
    read_obj.flags = flags
    read_obj.total_debt = debt_val
    read_obj.is_bad = (status == "Проблемний" or "Ризиковий" in flags.split(","))
    read_obj.is_archived = (status == "Архівний")
    return read_obj


# ── Create ───────────────────────────────────────────────────────────────
@router.post("", response_model=ClientRead, status_code=201)
def create_client(data: ClientCreate, db: Session = Depends(get_db)):
    from decimal import Decimal
    vehicles_data = data.vehicles
    client_fields = {c.key for c in Client.__table__.columns}
    client_data = {k: v for k, v in data.model_dump().items() if k in client_fields}
    client = Client(**client_data)
    db.add(client)
    db.flush()  # get client.id
    
    for v_data in vehicles_data:
        v_dict = v_data.model_dump()
        # check if at least one field is filled
        if any(v is not None and str(v).strip() != "" for v in v_dict.values()):
            vehicle = ClientVehicle(client_id=client.id, **v_dict)
            db.add(vehicle)
            
    db.commit()
    db.refresh(client)
    
    status, flags, debt_val = get_computed_client_data(client, db)
    read_obj = ClientRead.model_validate(client)
    read_obj.status = status
    read_obj.flags = flags
    read_obj.total_debt = debt_val
    read_obj.is_bad = (status == "Проблемний" or "Ризиковий" in flags.split(","))
    read_obj.is_archived = (status == "Архівний")
    return read_obj


# ── Update ───────────────────────────────────────────────────────────────
@router.put("/{client_id}", response_model=ClientRead)
def update_client(client_id: int, data: ClientUpdate, db: Session = Depends(get_db)):
    from decimal import Decimal
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Клієнт не знайдений")
    
    # 1. Fetch current computed status for comparison
    old_status, _, _ = get_computed_client_data(client, db)
    
    # 2. Extract meta fields that are not columns on Client
    manager_name = data.manager_name
    change_comment = data.change_comment
    
    update_data = data.model_dump(exclude_unset=True)
    vehicles_list = update_data.pop("vehicles", None)
    update_data.pop("manager_name", None)
    update_data.pop("change_comment", None)
    
    # Check if status is explicitly being changed
    new_status = update_data.get("status")
    
    if new_status is not None and new_status != old_status:
        # Log history
        history_entry = ClientStatusHistory(
            client_id=client.id,
            old_status=old_status,
            new_status=new_status,
            comment=change_comment,
            author=manager_name or "Система"
        )
        db.add(history_entry)
        
        # Update client metadata
        client.status_updated_at = datetime.now()
        client.status_updated_by = manager_name or "Система"
        
        # If changed from Problematic, clean up problem info
        if new_status != "Проблемний":
            client.problem_reason = None
            client.problem_comment = None
            
    # 3. Apply standard field updates
    for key, value in update_data.items():
        setattr(client, key, value)
        
    if vehicles_list is not None:
        # 1. Map current vehicles by ID
        current_vehicles = {v.id: v for v in client.vehicles}
        
        # 2. Re-build the vehicles list
        new_vehicles = []
        
        for v_dict in vehicles_list:
            # Check if vehicle has any non-empty fields (ignoring id)
            has_data = any(val is not None and str(val).strip() != "" for key, val in v_dict.items() if key != "id")
            if not has_data:
                continue
                
            v_id = v_dict.get("id")
            if v_id is not None and v_id in current_vehicles:
                # Update existing vehicle in-place
                veh = current_vehicles[v_id]
                for key, val in v_dict.items():
                    if key != "id":
                        setattr(veh, key, val)
                new_vehicles.append(veh)
            else:
                # Create a new vehicle (exclude id if present)
                v_dict.pop("id", None)
                new_vehicles.append(ClientVehicle(client_id=client_id, **v_dict))
                
        # SQLAlchemy cascade="all, delete-orphan" will automatically delete orphans
        client.vehicles = new_vehicles
        db.flush()
        
    db.commit()
    db.refresh(client)
    
    # 4. Return computed details
    status, flags, debt_val = get_computed_client_data(client, db)
    read_obj = ClientRead.model_validate(client)
    read_obj.status = status
    read_obj.flags = flags
    read_obj.total_debt = debt_val
    read_obj.is_bad = (status == "Проблемний" or "Ризиковий" in flags.split(","))
    read_obj.is_archived = (status == "Архівний")
    return read_obj



# ── Delete ───────────────────────────────────────────────────────────────
@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Клієнт не знайдений")
    order_count = db.query(Order).filter(Order.client_id == client_id).count()
    if order_count > 0:
        raise HTTPException(
            409,
            f"Неможливо видалити: клієнт має {order_count} замовлень",
        )
    db.delete(client)
    db.commit()


# ══════════════════════════════════════════════════════════════════════════
# Vehicles
# ══════════════════════════════════════════════════════════════════════════
@router.get("/{client_id}/vehicles", response_model=list[VehicleRead])
def list_vehicles(client_id: int, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Клієнт не знайдений")
    return client.vehicles


@router.post("/{client_id}/vehicles", response_model=VehicleRead, status_code=201)
def add_vehicle(client_id: int, data: VehicleCreate, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Клієнт не знайдений")
    vehicle = ClientVehicle(client_id=client_id, **data.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.put("/{client_id}/vehicles/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    client_id: int,
    vehicle_id: int,
    data: VehicleUpdate,
    db: Session = Depends(get_db),
):
    vehicle = db.query(ClientVehicle).filter_by(id=vehicle_id, client_id=client_id).first()
    if not vehicle:
        raise HTTPException(404, "Авто не знайдено")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(vehicle, key, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle
