"""Payment ORM model."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.order import Order


class Payment(Base):
    """Payment linked to an order."""

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    date: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    comment: Mapped[Optional[str]] = mapped_column(Text, default=None)
    author: Mapped[Optional[str]] = mapped_column(String(100), default=None)
    payment_type: Mapped[str] = mapped_column(
        String(50), default="Готівка", comment="Тип: Готівка / Безготівковий"
    )
    operation: Mapped[Optional[str]] = mapped_column(String(50), default=None)

    # --- Relationships -------------------------------------------------------
    order: Mapped["Order"] = relationship(back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment id={self.id} amount={self.amount}>"
