"""Dashboard statistics API."""

from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.client import Client
from app.models.order import Order, OrderPosition
from app.models.payment import Payment

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Summary statistics for the dashboard header."""
    # Active orders (not completed or cancelled)
    active_orders = db.query(sa_func.count(Order.id)).filter(~Order.group.in_(["Виконано", "Скасовано"])).scalar() or 0

    # Total debt across all orders except cancelled
    total_debt = (
        db.query(sa_func.sum(Order.debt))
        .filter(Order.group != "Скасовано")
        .scalar()
        or Decimal("0.00")
    )

    # Profit this month
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_profit = (
        db.query(sa_func.sum((OrderPosition.price_sell - OrderPosition.price_purchase) * OrderPosition.quantity))
        .join(Order)
        .filter(Order.date >= month_start)
        .filter(Order.group != "Скасовано")
        .scalar()
        or Decimal("0.00")
    )

    # Total clients
    total_clients = db.query(sa_func.count(Client.id)).scalar() or 0

    # Orders with debt > 0 except cancelled
    orders_with_debt = (
        db.query(sa_func.count(Order.id))
        .filter(Order.debt > 0.01)
        .filter(Order.group != "Скасовано")
        .scalar()
        or 0
    )

    # Orders this month except cancelled
    month_orders = (
        db.query(sa_func.count(Order.id))
        .filter(Order.date >= month_start)
        .filter(Order.group != "Скасовано")
        .scalar()
        or 0
    )

    return {
        "active_orders": active_orders,
        "total_debt": float(total_debt),
        "month_profit": float(month_profit),
        "total_clients": total_clients,
        "orders_with_debt": orders_with_debt,
        "month_orders": month_orders,
    }
