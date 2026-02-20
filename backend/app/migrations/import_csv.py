"""Import legacy CSV data into the SQLite database.

Run:  python -m app.migrations.import_csv
"""

import csv
import sys
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from sqlalchemy.orm import Session

# Allow running as ``python -m app.migrations.import_csv`` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import settings  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models.client import Client, ClientVehicle  # noqa: E402
from app.models.order import Order, OrderPosition  # noqa: E402
from app.models.payment import Payment  # noqa: E402
from app.models.product import Manufacturer, Product, ProductGroup  # noqa: E402
from app.models.supplier import Supplier  # noqa: E402

CSV_DIR = settings.CSV_DIR
BATCH_SIZE = 500


def _dec(val: str) -> Decimal:
    """Parse a decimal value, defaulting to 0."""
    try:
        return Decimal(str(val).strip().replace(",", "."))
    except (InvalidOperation, ValueError):
        return Decimal("0.00")


def _int(val: str, default: int = 0) -> int:
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return default


def _bool(val: str) -> bool:
    return str(val).strip().upper() in ("T", "TRUE", "1", "Y")


def _str(val: str) -> str | None:
    v = str(val).strip()
    return v if v else None


def _dt(val: str) -> datetime | None:
    """Parse datetime from CSV — tries common formats."""
    v = str(val).strip()
    if not v:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%d.%m.%Y %H:%M:%S", "%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(v, fmt)
        except ValueError:
            continue
    return None


def _read_csv(filename: str) -> list[dict]:
    """Read a CSV file and return a list of dicts."""
    path = CSV_DIR / filename
    if not path.exists():
        print(f"  ⚠ File not found: {path}")
        return []
    with open(path, encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f, delimiter=",")
        return list(reader)


def _import_suppliers(db: Session) -> int:
    rows = _read_csv("SUPPLIER.csv")
    count = 0
    for r in rows:
        sid = _int(r.get("SUPLIER_ID", ""))
        if not sid:
            continue
        db.merge(Supplier(
            id=sid,
            name=_str(r.get("SUPLIER", "")) or f"Supplier-{sid}",
            address=_str(r.get("SUPPLIER_ADRESS", "")),
            phone=_str(r.get("SUPPLIER_PHONE", "")),
            contact=_str(r.get("SUPPLIER_FIO", "")),
            email=_str(r.get("SUPPLIER_EMAIL", "")),
            delivery_days=_int(r.get("SUPPLIER_DAYS", ""), default=None),
        ))
        count += 1
    db.commit()
    return count


def _import_manufacturers(db: Session) -> int:
    rows = _read_csv("PRODUSER.csv")
    count = 0
    for r in rows:
        mid = _int(r.get("PRODUSER_ID", ""))
        if not mid:
            continue
        db.merge(Manufacturer(
            id=mid,
            name=_str(r.get("PRODUSER", "")) or f"Manufacturer-{mid}",
        ))
        count += 1
    db.commit()
    return count


def _import_product_groups(db: Session) -> int:
    rows = _read_csv("TGROUP.csv")
    count = 0
    for r in rows:
        gid = _int(r.get("TGROUP_ID", ""))
        if not gid:
            continue
        db.merge(ProductGroup(
            id=gid,
            name=_str(r.get("TGROUP", "")) or f"Group-{gid}",
        ))
        count += 1
    db.commit()
    return count


def _import_products(db: Session) -> int:
    rows = _read_csv("TOVAR.csv")
    count = 0
    batch = []
    for r in rows:
        pid = _int(r.get("TOVAR_ID", ""))
        if not pid:
            continue
        batch.append(Product(
            id=pid,
            group_id=_int(r.get("TGROUP_ID", "")) or None,
            manufacturer_id=_int(r.get("PRODUSER_ID", "")) or None,
            code=_str(r.get("KOD", "")) or "",
            name=_str(r.get("NAME", "")) or "",
            stock=_int(r.get("COUNTS", "")),
            price=_dec(r.get("PRICE", "")),
            supplier_id=_int(r.get("SUPPLIER_ID", "")) or None,
            location=_str(r.get("PLACE", "")),
        ))
        count += 1
        if len(batch) >= BATCH_SIZE:
            for item in batch:
                db.merge(item)
            db.commit()
            batch.clear()

    for item in batch:
        db.merge(item)
    db.commit()
    return count


def _import_clients(db: Session) -> int:
    rows = _read_csv("CLIENTS.csv")
    count = 0
    for r in rows:
        cid = _int(r.get("CLIENT_ID", ""))
        if not cid:
            continue
        db.merge(Client(
            id=cid,
            fio=_str(r.get("FIO", "")) or f"Client-{cid}",
            phone=_str(r.get("PHONE", "")),
            email=_str(r.get("EMAIL", "")),
            inn=_str(r.get("INN", "")),
            firm=_str(r.get("FIRM", "")),
            discount=float(_dec(r.get("DISCOUNT", "0"))),
            is_bad=_bool(r.get("BADCLIENT", "F")),
            is_archived=_bool(r.get("CLIENT_ARCH", "F")),
            info=_str(r.get("INFO", "")),
        ))
        count += 1
    db.commit()
    return count


def _import_vehicles(db: Session) -> int:
    rows = _read_csv("CLIENTM.csv")
    count = 0
    for r in rows:
        vid = _int(r.get("CLIENTM_ID", ""))
        if not vid:
            continue
        model_raw = _str(r.get("MODEL", "")) or ""
        parts = model_raw.split(maxsplit=1)
        brand = parts[0] if parts else None
        model = parts[1] if len(parts) > 1 else None

        db.merge(ClientVehicle(
            id=vid,
            client_id=_int(r.get("CLIENT_ID", "")),
            brand=brand,
            model=model,
            vin=_str(r.get("VIN", "")),
            license_plate=_str(r.get("GOSNOMER", "")),
            engine_volume=_str(r.get("ENGINEV", "")),
            engine_type=_str(r.get("ENGINETYPE", "")),
            year=_str(r.get("AYEAR", "")),
            info=_str(r.get("INFO", "")),
        ))
        count += 1
    db.commit()
    return count


def _import_orders(db: Session) -> int:
    rows = _read_csv("ZAKAZ.csv")
    count = 0
    for r in rows:
        oid = _int(r.get("ZAKAZN", ""))
        if not oid:
            continue
        db.merge(Order(
            id=oid,
            client_id=_int(r.get("CLIENT_ID", "")),
            vehicle_id=_int(r.get("CLIENTM_ID", "")) or None,
            date=_dt(r.get("DATAZ", "")) or datetime.now(),
            currency=_str(r.get("CUR_NAME", "")) or "грн.",
            exchange_rate=float(_dec(r.get("CUR_CURS", "1"))),
            markup=float(_dec(r.get("NACENKA", "0"))),
            discount=float(_dec(r.get("DISCONT", "0"))),
            total=_dec(r.get("SUMM", "")),
            debt=_dec(r.get("DOLG", "")),
            is_active=_bool(r.get("ZAKAZ_ACTIVE", "F")),
            group=_str(r.get("GROUPZ", "")) or "Клієнт",
            archive_group=_str(r.get("ZAKAZ_GROUP", "")),
            final_date=_dt(r.get("ZAKAZ_FINALDATE", "")),
            info=_str(r.get("INFO", "")),
            author=_str(r.get("AUTOR", "")),
        ))
        count += 1
    db.commit()
    return count


def _import_positions(db: Session) -> int:
    rows = _read_csv("POSITIONS.csv")
    count = 0
    batch = []
    for r in rows:
        pid = _int(r.get("POSITIONS_ID", ""))
        if not pid:
            continue
        batch.append(OrderPosition(
            id=pid,
            order_id=_int(r.get("ZAKAZN", "")),
            code=_str(r.get("KOD", "")) or "",
            name=_str(r.get("NAME", "")) or "",
            supplier_id=_int(r.get("SUPLIER_ID", "")) or None,
            quantity=_int(r.get("COUNTS", ""), default=1),
            price_purchase=_dec(r.get("PRICEZ", "")),
            price_sell=_dec(r.get("PRICEP", "")),
            manufacturer=_str(r.get("PRODUSER", "")),
            condition=_str(r.get("CONDITION", "")),
            arrival_date=_dt(r.get("PRIHOD_DATE", "")),
            sale_date=_dt(r.get("SALE_DATE", "")),
            note=_str(r.get("PRIMECHANIE", "")),
        ))
        count += 1
        if len(batch) >= BATCH_SIZE:
            for item in batch:
                db.merge(item)
            db.commit()
            batch.clear()

    for item in batch:
        db.merge(item)
    db.commit()
    return count


def _import_payments(db: Session) -> int:
    rows = _read_csv("OPL.csv")
    count = 0
    for r in rows:
        pid = _int(r.get("OPL_N", ""))
        if not pid:
            continue
        db.merge(Payment(
            id=pid,
            order_id=_int(r.get("ZAKAZN", "")),
            date=_dt(r.get("OPL_DATE", "")) or datetime.now(),
            amount=_dec(r.get("OPL_SUMM", "")),
            comment=_str(r.get("OPL_COMMENT", "")),
            author=_str(r.get("OPL_AUTOR", "")),
            payment_type=_str(r.get("OPL_VID", "")) or "Готівка",
            operation=_str(r.get("OPERATION", "")),
        ))
        count += 1
    db.commit()
    return count


def run_import() -> None:
    """Execute the full CSV → SQLite migration."""
    print("=" * 60)
    print("MIAUTO — CSV Data Import")
    print(f"Source: {CSV_DIR}")
    print(f"Target: {settings.database_url}")
    print("=" * 60)

    # Drop and recreate all tables for a clean import
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Disable FK enforcement for legacy data with orphaned references
        db.execute(__import__("sqlalchemy").text("PRAGMA foreign_keys=OFF"))

        steps = [
            ("Suppliers", _import_suppliers),
            ("Manufacturers", _import_manufacturers),
            ("Product Groups", _import_product_groups),
            ("Products", _import_products),
            ("Clients", _import_clients),
            ("Client Vehicles", _import_vehicles),
            ("Orders", _import_orders),
            ("Order Positions", _import_positions),
            ("Payments", _import_payments),
        ]

        for name, fn in steps:
            print(f"  → Importing {name}...", end=" ", flush=True)
            count = fn(db)
            print(f"✓ {count} records")

        # Re-enable FK enforcement
        db.execute(__import__("sqlalchemy").text("PRAGMA foreign_keys=ON"))

        print("=" * 60)
        print("Import complete!")
    finally:
        db.close()


if __name__ == "__main__":
    run_import()
