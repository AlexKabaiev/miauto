"""Pydantic schemas for Supplier."""

from typing import Optional

from pydantic import BaseModel, ConfigDict


class SupplierBase(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    delivery_days: Optional[int] = None
    info: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    delivery_days: Optional[int] = None
    info: Optional[str] = None


class SupplierRead(SupplierBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
