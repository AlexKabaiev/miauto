"""Order and OrderPosition ORM models."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.client import Client, ClientVehicle
    from app.models.payment import Payment
    from app.models.supplier import Supplier


class Order(Base):
    """Auto parts order."""

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("client_vehicles.id"), default=None
    )
    date: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
    currency: Mapped[str] = mapped_column(String(10), default="грн.")
    exchange_rate: Mapped[float] = mapped_column(Float, default=1.0)
    markup: Mapped[float] = mapped_column(Float, default=0.0, comment="Наценка %")
    discount: Mapped[float] = mapped_column(Float, default=0.0, comment="Знижка %")
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    debt: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    group: Mapped[str] = mapped_column(String(50), default="Клієнт", comment="Статус / група")
    archive_group: Mapped[Optional[str]] = mapped_column(String(50), default=None)
    final_date: Mapped[Optional[datetime]] = mapped_column(DateTime, default=None)
    info: Mapped[Optional[str]] = mapped_column(Text, default=None)
    author: Mapped[Optional[str]] = mapped_column(String(100), default=None)

    # --- Relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="orders", lazy="selectin")
    vehicle: Mapped[Optional["ClientVehicle"]] = relationship(
        back_populates="orders", lazy="selectin"
    )
    positions: Mapped[list["OrderPosition"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def paid(self) -> Decimal:
        """Total amount paid."""
        return sum((p.amount for p in self.payments), Decimal("0.00"))

    @property
    def profit(self) -> Decimal:
        """Gross profit: Σ (sell_price − purchase_price) × qty."""
        return sum(
            ((p.price_sell - p.price_purchase) * p.quantity for p in self.positions),
            Decimal("0.00"),
        )

    def __repr__(self) -> str:
        return f"<Order id={self.id} total={self.total}>"


class OrderPosition(Base):
    """Single line-item within an order."""

    __tablename__ = "order_positions"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    code: Mapped[str] = mapped_column(String(100), index=True, comment="Артикул")
    analogs: Mapped[Optional[str]] = mapped_column(Text, default=None, comment="Коди аналогів")
    name: Mapped[str] = mapped_column(String(500))
    supplier_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("suppliers.id"), default=None
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    price_purchase: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), comment="Ціна закупки"
    )
    price_sell: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), comment="Ціна продажу"
    )
    manufacturer: Mapped[Optional[str]] = mapped_column(String(100), default=None)
    condition: Mapped[Optional[str]] = mapped_column(
        String(50), default=None, comment="Стан позиції"
    )
    arrival_date: Mapped[Optional[datetime]] = mapped_column(DateTime, default=None)
    sale_date: Mapped[Optional[datetime]] = mapped_column(DateTime, default=None)
    note: Mapped[Optional[str]] = mapped_column(Text, default=None)

    # --- Relationships -------------------------------------------------------
    order: Mapped["Order"] = relationship(back_populates="positions")
    supplier: Mapped[Optional["Supplier"]] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return f"<Position id={self.id} code={self.code!r}>"
