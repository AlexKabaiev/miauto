"""Product, ProductGroup, and Manufacturer ORM models."""

from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.supplier import Supplier


class ProductGroup(Base):
    """Product category / group."""

    __tablename__ = "product_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)

    products: Mapped[list["Product"]] = relationship(back_populates="group", lazy="select")

    def __repr__(self) -> str:
        return f"<ProductGroup id={self.id} name={self.name!r}>"


class Manufacturer(Base):
    """Product brand / manufacturer."""

    __tablename__ = "manufacturers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)

    products: Mapped[list["Product"]] = relationship(back_populates="manufacturer", lazy="select")

    def __repr__(self) -> str:
        return f"<Manufacturer id={self.id} name={self.name!r}>"


class Product(Base):
    """Inventory item — an auto part."""

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("product_groups.id"), default=None
    )
    manufacturer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("manufacturers.id"), default=None
    )
    code: Mapped[str] = mapped_column(String(100), index=True, comment="Артикул")
    analogs: Mapped[Optional[str]] = mapped_column(Text, default=None, comment="Коди аналогів")
    name: Mapped[str] = mapped_column(String(500))
    stock: Mapped[int] = mapped_column(Integer, default=0, comment="Кількість на складі")
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    supplier_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("suppliers.id"), default=None
    )
    location: Mapped[Optional[str]] = mapped_column(
        String(100), default=None, comment="Місце зберігання"
    )
    info: Mapped[Optional[str]] = mapped_column(Text, default=None)

    # --- Relationships -------------------------------------------------------
    group: Mapped[Optional["ProductGroup"]] = relationship(
        back_populates="products", lazy="selectin"
    )
    manufacturer: Mapped[Optional["Manufacturer"]] = relationship(
        back_populates="products", lazy="selectin"
    )
    supplier: Mapped[Optional["Supplier"]] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return f"<Product id={self.id} code={self.code!r}>"
