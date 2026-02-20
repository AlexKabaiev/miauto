"""Supplier ORM model."""

from typing import Optional

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Supplier(Base):
    """Auto parts supplier."""

    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True, comment="Назва")
    address: Mapped[Optional[str]] = mapped_column(String(500), default=None)
    phone: Mapped[Optional[str]] = mapped_column(String(50), default=None)
    contact: Mapped[Optional[str]] = mapped_column(String(255), default=None, comment="Контакт. особа")
    email: Mapped[Optional[str]] = mapped_column(String(255), default=None)
    delivery_days: Mapped[Optional[int]] = mapped_column(Integer, default=None, comment="Термін доставки (днів)")
    info: Mapped[Optional[str]] = mapped_column(Text, default=None)

    def __repr__(self) -> str:
        return f"<Supplier id={self.id} name={self.name!r}>"
