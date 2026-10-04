"""Pydantic schemas for Product, ProductGroup, and Manufacturer."""

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProductGroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class ManufacturerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class ProductBase(BaseModel):
    code: str
    analogs: Optional[str] = None
    name: str
    group_id: Optional[int] = None
    manufacturer_id: Optional[int] = None
    stock: int = 0
    price: Decimal = Decimal("0.00")
    supplier_id: Optional[int] = None
    location: Optional[str] = None
    info: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    code: Optional[str] = None
    analogs: Optional[str] = None
    name: Optional[str] = None
    group_id: Optional[int] = None
    manufacturer_id: Optional[int] = None
    stock: Optional[int] = None
    price: Optional[Decimal] = None
    supplier_id: Optional[int] = None
    location: Optional[str] = None
    info: Optional[str] = None


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    group_name: Optional[str] = None
    manufacturer_name: Optional[str] = None
    supplier_name: Optional[str] = None


class ProductListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    analogs: Optional[str] = None
    name: str
    group_name: Optional[str] = None
    manufacturer_name: Optional[str] = None
    stock: int = 0
    price: Decimal = Decimal("0.00")
