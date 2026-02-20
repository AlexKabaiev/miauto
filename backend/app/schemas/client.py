"""Pydantic schemas for Client and ClientVehicle."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# ClientVehicle
# ---------------------------------------------------------------------------
class VehicleBase(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    engine_volume: Optional[str] = None
    engine_type: Optional[str] = None
    year: Optional[str] = None
    info: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(VehicleBase):
    pass


class VehicleRead(VehicleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------
class ClientBase(BaseModel):
    fio: str
    phone: Optional[str] = None
    email: Optional[str] = None
    inn: Optional[str] = None
    firm: Optional[str] = None
    discount: float = 0.0
    is_bad: bool = False
    is_archived: bool = False
    info: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    """All fields optional for partial update."""
    fio: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    inn: Optional[str] = None
    firm: Optional[str] = None
    discount: Optional[float] = None
    is_bad: Optional[bool] = None
    is_archived: Optional[bool] = None
    info: Optional[str] = None


class ClientRead(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    vehicles: list[VehicleRead] = []


class ClientListItem(BaseModel):
    """Lightweight representation for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    fio: str
    phone: Optional[str] = None
    firm: Optional[str] = None
    discount: float = 0.0
    is_bad: bool = False
    is_archived: bool = False
