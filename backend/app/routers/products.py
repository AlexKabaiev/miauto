"""Products & Suppliers CRUD routers."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import OrderPosition
from app.models.product import Manufacturer, Product, ProductGroup
from app.models.supplier import Supplier
from app.schemas.product import (
    ManufacturerRead,
    ProductCreate,
    ProductListItem,
    ProductRead,
    ProductGroupRead,
    ProductUpdate,
)
from app.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate

# ══════════════════════════════════════════════════════════════════════════
# Products
# ══════════════════════════════════════════════════════════════════════════
products_router = APIRouter(prefix="/api/products", tags=["products"])


@products_router.get("", response_model=dict)
def list_products(
    search: Optional[str] = Query(None),
    group_id: Optional[int] = Query(None),
    manufacturer_id: Optional[int] = Query(None),
    in_stock: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Product)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Product.code.ilike(like), Product.name.ilike(like)))
    if group_id:
        q = q.filter(Product.group_id == group_id)
    if manufacturer_id:
        q = q.filter(Product.manufacturer_id == manufacturer_id)
    if in_stock is True:
        q = q.filter(Product.stock > 0)

    total = q.count()
    items = q.order_by(Product.name).offset(skip).limit(limit).all()

    result = []
    for p in items:
        result.append(
            ProductListItem(
                id=p.id,
                code=p.code,
                name=p.name,
                group_name=p.group.name if p.group else None,
                manufacturer_name=p.manufacturer.name if p.manufacturer else None,
                stock=p.stock,
                price=p.price,
            )
        )
    return {"items": result, "total": total}


@products_router.get("/groups", response_model=list[ProductGroupRead])
def list_product_groups(db: Session = Depends(get_db)):
    return db.query(ProductGroup).order_by(ProductGroup.name).all()


@products_router.get("/manufacturers", response_model=list[ManufacturerRead])
def list_manufacturers(db: Session = Depends(get_db)):
    return db.query(Manufacturer).order_by(Manufacturer.name).all()


@products_router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Товар не знайдено")
    return ProductRead(
        id=product.id,
        code=product.code,
        name=product.name,
        group_id=product.group_id,
        manufacturer_id=product.manufacturer_id,
        stock=product.stock,
        price=product.price,
        supplier_id=product.supplier_id,
        location=product.location,
        info=product.info,
        group_name=product.group.name if product.group else None,
        manufacturer_name=product.manufacturer.name if product.manufacturer else None,
        supplier_name=product.supplier.name if product.supplier else None,
    )


@products_router.post("", response_model=ProductRead, status_code=201)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return get_product(product.id, db)


@products_router.put("/{product_id}", response_model=ProductRead)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Товар не знайдено")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return get_product(product.id, db)


# ══════════════════════════════════════════════════════════════════════════
# Suppliers
# ══════════════════════════════════════════════════════════════════════════
suppliers_router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


@suppliers_router.get("", response_model=dict)
def list_suppliers(
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Supplier)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Supplier.name.ilike(like), Supplier.phone.ilike(like)))
    total = q.count()
    items = q.order_by(Supplier.name).offset(skip).limit(limit).all()
    return {"items": [SupplierRead.model_validate(s) for s in items], "total": total}


@suppliers_router.get("/{supplier_id}", response_model=SupplierRead)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(404, "Постачальника не знайдено")
    return supplier


@suppliers_router.post("", response_model=SupplierRead, status_code=201)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@suppliers_router.put("/{supplier_id}", response_model=SupplierRead)
def update_supplier(supplier_id: int, data: SupplierUpdate, db: Session = Depends(get_db)):
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(404, "Постачальника не знайдено")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, key, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@suppliers_router.delete("/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(404, "Постачальника не знайдено")
    
    # Nullify supplier links in products and order_positions to avoid IntegrityError
    db.query(Product).filter(Product.supplier_id == supplier_id).update({Product.supplier_id: None})
    db.query(OrderPosition).filter(OrderPosition.supplier_id == supplier_id).update({OrderPosition.supplier_id: None})
    
    db.delete(supplier)
    db.commit()
    return None
