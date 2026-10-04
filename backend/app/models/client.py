"""Client and ClientVehicle ORM models."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.order import Order


class Client(Base):
    """Customer / buyer of auto parts."""

    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    fio: Mapped[str] = mapped_column(String(255), index=True, comment="ФИО / Назва фірми")
    phone: Mapped[Optional[str]] = mapped_column(String(50), index=True, default=None)
    email: Mapped[Optional[str]] = mapped_column(String(255), default=None)
    inn: Mapped[Optional[str]] = mapped_column(String(20), default=None, comment="ІПН / ЄДРПОУ")
    firm: Mapped[Optional[str]] = mapped_column(String(255), default=None, comment="Назва компанії")
    discount: Mapped[float] = mapped_column(Float, default=0.0, comment="Знижка %")
    is_bad: Mapped[bool] = mapped_column(Boolean, default=False, comment="Чорний список")
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, comment="В архіві")
    info: Mapped[Optional[str]] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # --- New Status Fields ---------------------------------------------------
    status: Mapped[str] = mapped_column(String(50), default="Новий", server_default="Новий")
    flags: Mapped[str] = mapped_column(String(255), default="", server_default="")
    problem_reason: Mapped[Optional[str]] = mapped_column(String(255), default=None)
    problem_comment: Mapped[Optional[str]] = mapped_column(Text, default=None)
    status_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=None)
    status_updated_by: Mapped[Optional[str]] = mapped_column(String(100), default=None)

    # --- Relationships -------------------------------------------------------
    vehicles: Mapped[list["ClientVehicle"]] = relationship(
        back_populates="client", cascade="all, delete-orphan", lazy="selectin"
    )
    orders: Mapped[list["Order"]] = relationship(
        back_populates="client", lazy="select"
    )
    status_history: Mapped[list["ClientStatusHistory"]] = relationship(
        back_populates="client", cascade="all, delete-orphan", lazy="selectin",
        order_by="ClientStatusHistory.created_at.desc()"
    )

    def __repr__(self) -> str:
        return f"<Client id={self.id} fio={self.fio!r}>"


class ClientStatusHistory(Base):
    """History of client status transitions."""

    __tablename__ = "client_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    old_status: Mapped[str] = mapped_column(String(50))
    new_status: Mapped[str] = mapped_column(String(50))
    comment: Mapped[Optional[str]] = mapped_column(Text, default=None)
    author: Mapped[Optional[str]] = mapped_column(String(100), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # --- Relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="status_history")



class ClientVehicle(Base):
    """Vehicle belonging to a client."""

    __tablename__ = "client_vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    brand: Mapped[Optional[str]] = mapped_column(String(100), default=None, comment="Марка")
    model: Mapped[Optional[str]] = mapped_column(String(100), default=None, comment="Модель")
    vin: Mapped[Optional[str]] = mapped_column(String(17), default=None, index=True)
    license_plate: Mapped[Optional[str]] = mapped_column(String(20), default=None, comment="Держ. номер")
    engine_volume: Mapped[Optional[str]] = mapped_column(String(20), default=None)
    engine_type: Mapped[Optional[str]] = mapped_column(String(30), default=None)
    year: Mapped[Optional[str]] = mapped_column(String(4), default=None, comment="Рік випуску")
    info: Mapped[Optional[str]] = mapped_column(Text, default=None)

    # --- Relationships -------------------------------------------------------
    client: Mapped["Client"] = relationship(back_populates="vehicles")
    orders: Mapped[list["Order"]] = relationship(back_populates="vehicle", lazy="select")

    def __repr__(self) -> str:
        return f"<Vehicle id={self.id} {self.brand} {self.model}>"
