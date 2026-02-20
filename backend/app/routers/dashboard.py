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
    # Active orders
    active_orders = db.query(sa_func.count(Order.id)).filter(Order.is_active == True).scalar() or 0  # noqa: E712

    # Total debt across all active orders
    total_debt = (
        db.query(sa_func.sum(Order.debt))
        .filter(Order.is_active == True)  # noqa: E712
        .scalar()
        or Decimal("0.00")
    )

    # Revenue this month
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_revenue = (
        db.query(sa_func.sum(Payment.amount))
        .filter(Payment.date >= month_start)
        .scalar()
        or Decimal("0.00")
    )

    # Total clients
    total_clients = db.query(sa_func.count(Client.id)).scalar() or 0

    # Orders this month
    month_orders = (
        db.query(sa_func.count(Order.id))
        .filter(Order.date >= month_start)
        .scalar()
        or 0
    )

    return {
        "active_orders": active_orders,
        "total_debt": float(total_debt),
        "month_revenue": float(month_revenue),
        "total_clients": total_clients,
        "month_orders": month_orders,
    }
