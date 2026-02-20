"""Pydantic schemas for Order and OrderPosition."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# OrderPosition
# ---------------------------------------------------------------------------
class PositionBase(BaseModel):
    code: str
    name: str
    supplier_id: Optional[int] = None
    quantity: int = 1
    price_purchase: Decimal = Decimal("0.00")
    price_sell: Decimal = Decimal("0.00")
    manufacturer: Optional[str] = None
    condition: Optional[str] = None
    arrival_date: Optional[datetime] = None
    sale_date: Optional[datetime] = None
    note: Optional[str] = None


class PositionCreate(PositionBase):
    pass


class PositionUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    supplier_id: Optional[int] = None
    quantity: Optional[int] = None
    price_purchase: Optional[Decimal] = None
    price_sell: Optional[Decimal] = None
    manufacturer: Optional[str] = None
    condition: Optional[str] = None
    arrival_date: Optional[datetime] = None
    sale_date: Optional[datetime] = None
    note: Optional[str] = None


class PositionRead(PositionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    supplier_name: Optional[str] = None  # joined from Supplier


# ---------------------------------------------------------------------------
# Order
# ---------------------------------------------------------------------------
class OrderBase(BaseModel):
    client_id: int
    vehicle_id: Optional[int] = None
    currency: str = "грн."
    exchange_rate: float = 1.0
    markup: float = 0.0
    discount: float = 0.0
    info: Optional[str] = None
    author: Optional[str] = None


class OrderCreate(OrderBase):
    positions: list[PositionCreate] = []


class OrderUpdate(BaseModel):
    client_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    markup: Optional[float] = None
    discount: Optional[float] = None
    is_active: Optional[bool] = None
    group: Optional[str] = None
    info: Optional[str] = None


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    vehicle_id: Optional[int] = None
    date: datetime
    currency: str
    exchange_rate: float
    markup: float
    discount: float
    total: Decimal
    debt: Decimal
    is_active: bool
    group: str
    archive_group: Optional[str] = None
    final_date: Optional[datetime] = None
    info: Optional[str] = None
    author: Optional[str] = None
    # Computed / joined
    paid: Decimal = Decimal("0.00")
    profit: Decimal = Decimal("0.00")
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    vehicle_display: Optional[str] = None
    positions_count: int = 0
    positions: list[PositionRead] = []


class OrderListItem(BaseModel):
    """Lightweight representation for the main orders table."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: datetime
    client_name: str
    client_phone: Optional[str] = None
    vehicle_display: Optional[str] = None
    positions_count: int = 0
    total: Decimal
    paid: Decimal = Decimal("0.00")
    debt: Decimal
    profit: Decimal = Decimal("0.00")
    group: str
    is_active: bool
