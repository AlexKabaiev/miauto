"""Pydantic schemas for Payment."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PaymentBase(BaseModel):
    amount: Decimal
    comment: Optional[str] = None
    author: Optional[str] = None
    payment_type: str = "Готівка"
    operation: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentRead(PaymentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_id: int
    date: datetime
