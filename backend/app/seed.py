"""Seed the MIAUTO database with fictional demo data.

This script drops all existing data and populates the database with
realistic but entirely fictional Ukrainian auto parts business records.
No real personal data is included.

Usage:
    cd backend
    py -m app.seed
"""

import random
import string
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import text

from app.database import Base, SessionLocal, engine

# Import all models so that Base.metadata is fully populated.
from app.models.client import Client, ClientStatusHistory, ClientVehicle
from app.models.order import Order, OrderPosition
from app.models.payment import Payment
from app.models.product import Manufacturer, Product, ProductGroup
from app.models.supplier import Supplier
from app.models.user import User

# ---------------------------------------------------------------------------
# Fictional data pools
# ---------------------------------------------------------------------------
FIRST_NAMES = [
    "Олександр", "Андрій", "Сергій", "Максим", "Дмитро",
    "Іван", "Микола", "Петро", "Василь", "Юрій",
    "Тарас", "Богдан", "Віталій", "Олег", "Роман",
    "Ольга", "Наталія", "Марія", "Тетяна", "Ірина",
    "Анна", "Катерина", "Людмила", "Оксана", "Світлана",
]

LAST_NAMES = [
    "Шевченко", "Бондаренко", "Ткаченко", "Коваленко", "Кравченко",
    "Олійник", "Мельник", "Литвиненко", "Поліщук", "Гончаренко",
    "Савченко", "Руденко", "Марченко", "Тимошенко", "Павленко",
    "Кузьменко", "Ковальчук", "Мороз", "Левченко", "Герасименко",
    "Петренко", "Сидоренко", "Іваненко", "Ковальов", "Панченко",
]

PATRONYMICS = [
    "Олександрович", "Андрійович", "Сергійович", "Іванович",
    "Петрович", "Миколайович", "Васильович", "Юрійович",
    "Олександрівна", "Андріївна", "Сергіївна", "Іванівна",
    "Петрівна", "Миколаївна", "Василівна", "Юріївна",
]

FIRM_NAMES = [
    "АвтоСервіс Плюс", "МоторТех", "ТехноДрайв", "АвтоМайстер",
    "Південний Гараж", "УкрАвтоПарт", "ДрайвСтор", "АвтоТочка",
    "КарПартс Україна", "СервісАвто", None, None, None, None,
]

CITIES = [
    "Київ", "Одеса", "Харків", "Дніпро", "Львів",
    "Запоріжжя", "Вінниця", "Миколаїв", "Полтава", "Чернігів",
]

STREETS = [
    "вул. Центральна", "вул. Промислова", "вул. Заводська",
    "вул. Перемоги", "пр. Миру", "вул. Шевченка",
    "вул. Незалежності", "вул. Соборна", "вул. Індустріальна",
    "вул. Хмельницького",
]

CAR_BRANDS_MODELS = [
    ("Toyota", ["Camry", "Corolla", "RAV4", "Land Cruiser", "Prado"]),
    ("Honda", ["Civic", "Accord", "CR-V", "HR-V"]),
    ("Hyundai", ["Tucson", "Elantra", "Sonata", "Santa Fe"]),
    ("Kia", ["Sportage", "Ceed", "Rio", "Sorento"]),
    ("Volkswagen", ["Golf", "Passat", "Tiguan", "Polo"]),
    ("Nissan", ["Qashqai", "X-Trail", "Juke", "Leaf"]),
    ("Mazda", ["CX-5", "3", "6", "CX-30"]),
    ("BMW", ["3 Series", "5 Series", "X3", "X5"]),
    ("Mercedes-Benz", ["C-Class", "E-Class", "GLC", "GLE"]),
    ("Skoda", ["Octavia", "Superb", "Kodiaq", "Rapid"]),
    ("Ford", ["Focus", "Mondeo", "Kuga", "Fiesta"]),
    ("Renault", ["Duster", "Megane", "Logan", "Kadjar"]),
]

ENGINE_TYPES = ["Бензин", "Дизель", "Гібрид", "Електро"]
ENGINE_VOLUMES = ["1.4", "1.6", "1.8", "2.0", "2.2", "2.4", "2.5", "3.0"]

MANUFACTURER_NAMES = [
    "Bosch", "Denso", "NGK", "TRW", "Sachs", "LuK", "Valeo",
    "Monroe", "KYB", "Brembo", "Ferodo", "Mann-Filter", "Mahle",
    "Continental", "Gates", "SKF", "SNR", "INA", "FAG",
    "Febi Bilstein", "Meyle", "Lemförder", "Moog", "BluePrint",
    "Febest", "Masuma", "CTR", "555", "GMB", "Aisin",
]

PRODUCT_GROUP_NAMES = [
    "Гальмівні колодки", "Гальмівні диски", "Амортизатори",
    "Фільтри масляні", "Фільтри повітряні", "Фільтри паливні",
    "Фільтри салонні", "Свічки запалювання", "Ремені ГРМ",
    "Ролики натяжні", "Кульові опори", "Стійки стабілізатора",
    "Тяги рульові", "Наконечники рульові", "Підшипники маточини",
    "Сайлентблоки", "ШРУС зовнішній", "ШРУС внутрішній",
    "Помпа водяна", "Термостат", "Радіатор охолодження",
    "Генератор", "Стартер", "Датчик ABS", "Лямбда-зонд",
]

SUPPLIER_NAMES = [
    "АвтоОпт Трейд", "МоторІмпорт", "ЗапчастиОнлайн",
    "ТехноПартс", "АвтоАльянс", "УкрЗапчастина",
    "Інтер-Авто", "ПартсХаус", "АвтоЛайн Дистриб'ютор",
    "ГлобалПартс",
]

ORDER_GROUPS = ["Клієнт", "В роботі", "Замовлено", "Доставлено"]
ARCHIVE_GROUPS = ["Виконано", "Повернення", "Скасовано"]
PAYMENT_TYPES = ["Готівка", "Безготівковий"]
POSITION_CONDITIONS = [
    "Замовлено", "В дорозі", "На складі", "Видано", "Повернення",
]
CLIENT_STATUSES = ["Новий", "Активний", "VIP", "Проблемний"]
CLIENT_FLAGS_OPTIONS = [
    "", "", "", "VIP", "Постійний", "Оптовик", "Борг",
]

OPERATORS = [
    "Олександр (Менеджер)", "Андрій (Менеджер)", "Сергій (Адмін)",
]

# Auto parts codes follow a pattern: letters + digits
PART_CODE_PREFIXES = [
    "ADC", "K", "MI-BJ-", "GDB", "DF", "KG", "334",
    "SP-", "FE-", "MB-", "TY-", "NS-", "HY-", "VW-",
    "BM-", "RN-", "SK-", "FD-",
]

PART_NAMES = [
    "Колодки гальмівні передні", "Колодки гальмівні задні",
    "Диск гальмівний передній", "Диск гальмівний задній",
    "Амортизатор передній лівий", "Амортизатор передній правий",
    "Амортизатор задній", "Фільтр масляний",
    "Фільтр повітряний", "Фільтр паливний",
    "Фільтр салонний", "Свічка запалювання",
    "Комплект ГРМ", "Ремінь ГРМ", "Ролик натяжний ГРМ",
    "Кульова опора верхня", "Кульова опора нижня",
    "Стійка стабілізатора передня", "Стійка стабілізатора задня",
    "Тяга рульова", "Наконечник рульовий лівий",
    "Наконечник рульовий правий", "Підшипник маточини передній",
    "Підшипник маточини задній", "Сайлентблок важеля передній",
    "Сайлентблок важеля задній", "ШРУС зовнішній",
    "ШРУС внутрішній", "Пильник ШРУСа",
    "Помпа водяна", "Термостат", "Радіатор охолодження",
    "Опора амортизатора передня", "Прокладка клапанної кришки",
    "Датчик ABS передній", "Датчик ABS задній",
    "Лямбда-зонд", "Котушка запалювання",
    "Стартер", "Генератор",
]


# ---------------------------------------------------------------------------
# Helper generators
# ---------------------------------------------------------------------------
def _random_phone() -> str:
    """Generate a fictional Ukrainian mobile phone number."""
    prefixes = ["050", "063", "066", "067", "068", "093", "095", "096", "097", "098"]
    return random.choice(prefixes) + "".join(random.choices(string.digits, k=7))


def _random_email(name: str) -> str | None:
    """Generate a plausible email from a name, or None."""
    if random.random() < 0.6:
        return None
    slug = name.split()[0].lower()
    # Transliterate a few common letters for a plausible email
    tr = {"о": "o", "а": "a", "і": "i", "е": "e", "у": "u"}
    slug = "".join(tr.get(c, c) for c in slug)
    slug = slug[:8]
    domains = ["gmail.com", "ukr.net", "meta.ua", "i.ua"]
    return f"{slug}{random.randint(10, 99)}@{random.choice(domains)}"


def _random_inn() -> str | None:
    """Generate a fictional 10-digit INN, or None."""
    if random.random() < 0.5:
        return None
    return "".join(random.choices(string.digits, k=10))


def _random_vin() -> str:
    """Generate a fictional 17-character VIN."""
    # VIN uses uppercase letters (excluding I, O, Q) and digits
    chars = string.ascii_uppercase.replace("I", "").replace("O", "").replace("Q", "")
    chars += string.digits
    return "".join(random.choices(chars, k=17))


def _random_license_plate() -> str | None:
    """Generate a fictional Ukrainian license plate, or None."""
    if random.random() < 0.4:
        return None
    region_codes = ["AA", "AB", "AC", "AE", "AH", "AI", "AK", "AM",
                    "AO", "AP", "AT", "AX", "BA", "BB", "BC", "BE",
                    "BH", "BI", "BK", "BM", "BO", "BT", "BX", "CA",
                    "CB", "CE", "CH"]
    digits = "".join(random.choices(string.digits, k=4))
    letters = "".join(random.choices("ABCEHIKMOPTX", k=2))
    return f"{random.choice(region_codes)}{digits}{letters}"


def _random_part_code() -> str:
    """Generate a fictional auto part article code."""
    prefix = random.choice(PART_CODE_PREFIXES)
    digits = "".join(random.choices(string.digits, k=random.randint(4, 7)))
    return f"{prefix}{digits}"


def _random_date_in_range(
    start: datetime, end: datetime
) -> datetime:
    """Return a random datetime between start and end."""
    delta = end - start
    offset = random.randint(0, max(int(delta.total_seconds()), 1))
    return start + timedelta(seconds=offset)


# ---------------------------------------------------------------------------
# Seed functions
# ---------------------------------------------------------------------------
def seed_users(session) -> list[User]:
    """Create demo operator accounts."""
    users_data = [
        User(username="admin", full_name="Сергій Адмін", role="admin"),
        User(username="manager1", full_name="Олександр Менеджер", role="operator"),
        User(username="manager2", full_name="Андрій Менеджер", role="operator"),
    ]
    session.add_all(users_data)
    session.flush()
    print(f"  users: {len(users_data)}")
    return users_data


def seed_suppliers(session) -> list[Supplier]:
    """Create fictional auto parts suppliers."""
    suppliers = []
    for i, name in enumerate(SUPPLIER_NAMES):
        city = random.choice(CITIES)
        street = random.choice(STREETS)
        building = random.randint(1, 150)
        supplier = Supplier(
            name=name,
            address=f"м. {city}, {street}, {building}",
            phone=_random_phone(),
            contact=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
            email=f"info{i + 1}@{name.lower().replace(' ', '').replace(chr(39), '')[:10]}.ua",
            delivery_days=random.choice([1, 2, 3, 5, 7, 10, 14]),
            info=None,
        )
        suppliers.append(supplier)
    session.add_all(suppliers)
    session.flush()
    print(f"  suppliers: {len(suppliers)}")
    return suppliers


def seed_manufacturers(session) -> list[Manufacturer]:
    """Create auto parts manufacturer/brand records."""
    manufacturers = []
    for name in MANUFACTURER_NAMES:
        manufacturers.append(Manufacturer(name=name))
    session.add_all(manufacturers)
    session.flush()
    print(f"  manufacturers: {len(manufacturers)}")
    return manufacturers


def seed_product_groups(session) -> list[ProductGroup]:
    """Create product category groups."""
    groups = []
    for name in PRODUCT_GROUP_NAMES:
        groups.append(ProductGroup(name=name))
    session.add_all(groups)
    session.flush()
    print(f"  product_groups: {len(groups)}")
    return groups


def seed_products(
    session,
    groups: list[ProductGroup],
    manufacturers: list[Manufacturer],
    suppliers: list[Supplier],
) -> list[Product]:
    """Create fictional product/inventory records."""
    products = []
    for _ in range(80):
        code = _random_part_code()
        product = Product(
            group_id=random.choice(groups).id,
            manufacturer_id=random.choice(manufacturers).id,
            code=code,
            name=random.choice(PART_NAMES),
            stock=random.randint(0, 25),
            price=Decimal(str(random.randint(50, 5000))),
            supplier_id=random.choice(suppliers).id if random.random() > 0.3 else None,
            location=random.choice([None, "Полиця A1", "Полиця B2", "Полиця C3", "Склад 1", "Склад 2"]),
            info=None,
        )
        products.append(product)
    session.add_all(products)
    session.flush()
    print(f"  products: {len(products)}")
    return products


def seed_clients(session) -> list[Client]:
    """Create fictional client records."""
    clients = []
    used_names = set()
    for _ in range(35):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        patronymic = random.choice(PATRONYMICS)
        fio = f"{last} {first} {patronymic}"
        # Ensure unique FIO
        while fio in used_names:
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            fio = f"{last} {first} {patronymic}"
        used_names.add(fio)

        status = random.choice(CLIENT_STATUSES)
        client = Client(
            fio=fio,
            phone=_random_phone(),
            email=_random_email(first),
            inn=_random_inn(),
            firm=random.choice(FIRM_NAMES),
            discount=random.choice([0.0, 0.0, 0.0, 3.0, 5.0, 7.0, 10.0]),
            is_bad=random.random() < 0.05,
            is_archived=random.random() < 0.1,
            info=None,
            created_at=_random_date_in_range(
                datetime(2023, 1, 1), datetime(2026, 9, 1)
            ),
            status=status,
            flags=random.choice(CLIENT_FLAGS_OPTIONS),
            problem_reason="Заборгованість" if status == "Проблемний" else None,
            problem_comment="Має непогашений борг" if status == "Проблемний" else None,
        )
        clients.append(client)
    session.add_all(clients)
    session.flush()
    print(f"  clients: {len(clients)}")
    return clients


def seed_vehicles(session, clients: list[Client]) -> list[ClientVehicle]:
    """Create fictional vehicle records for clients."""
    vehicles = []
    for client in clients:
        num_vehicles = random.choices([0, 1, 1, 2, 3], weights=[1, 5, 5, 3, 1])[0]
        for _ in range(num_vehicles):
            brand, models = random.choice(CAR_BRANDS_MODELS)
            model = random.choice(models)
            vehicle = ClientVehicle(
                client_id=client.id,
                brand=brand,
                model=model,
                vin=_random_vin(),
                license_plate=_random_license_plate(),
                engine_volume=random.choice(ENGINE_VOLUMES),
                engine_type=random.choice(ENGINE_TYPES),
                year=str(random.randint(2005, 2025)),
                info=None,
            )
            vehicles.append(vehicle)
    session.add_all(vehicles)
    session.flush()
    print(f"  client_vehicles: {len(vehicles)}")
    return vehicles


def seed_orders(
    session,
    clients: list[Client],
    vehicles: list[ClientVehicle],
    suppliers: list[Supplier],
) -> tuple[list[Order], list[OrderPosition], list[Payment]]:
    """Create fictional orders with positions and payments."""
    all_orders = []
    all_positions = []
    all_payments = []

    # Build a map of client_id -> their vehicles
    client_vehicles_map: dict[int, list[ClientVehicle]] = {}
    for v in vehicles:
        client_vehicles_map.setdefault(v.client_id, []).append(v)

    now = datetime(2026, 10, 1)
    order_start = datetime(2023, 6, 1)

    for _ in range(120):
        client = random.choice(clients)
        client_vehs = client_vehicles_map.get(client.id, [])
        vehicle = random.choice(client_vehs) if client_vehs else None

        order_date = _random_date_in_range(order_start, now)
        is_active = random.random() < 0.25
        group = random.choice(ORDER_GROUPS) if is_active else random.choice(ARCHIVE_GROUPS)

        order = Order(
            client_id=client.id,
            vehicle_id=vehicle.id if vehicle else None,
            date=order_date,
            currency="грн.",
            exchange_rate=1.0,
            markup=random.choice([0.0, 0.0, 5.0, 10.0, 15.0, 20.0]),
            discount=random.choice([0.0, 0.0, 0.0, 3.0, 5.0]),
            total=Decimal("0.00"),  # Will be computed below
            debt=Decimal("0.00"),
            is_active=is_active,
            group=group,
            archive_group=group if not is_active else None,
            final_date=(order_date + timedelta(days=random.randint(1, 30)))
            if not is_active
            else None,
            info=None,
            author=random.choice(OPERATORS),
        )
        session.add(order)
        session.flush()

        # Generate 1..6 positions per order
        num_positions = random.randint(1, 6)
        order_total = Decimal("0.00")

        for _ in range(num_positions):
            purchase = Decimal(str(random.randint(30, 3000)))
            markup_factor = Decimal("1.0") + Decimal(str(random.randint(20, 80))) / Decimal("100")
            sell = (purchase * markup_factor).quantize(Decimal("0.01"))
            qty = random.randint(1, 4)

            condition = random.choice(POSITION_CONDITIONS)
            pos_date = order_date + timedelta(days=random.randint(0, 5))

            position = OrderPosition(
                order_id=order.id,
                code=_random_part_code(),
                name=random.choice(PART_NAMES),
                supplier_id=random.choice(suppliers).id if random.random() > 0.2 else None,
                quantity=qty,
                price_purchase=purchase,
                price_sell=sell,
                manufacturer=random.choice(MANUFACTURER_NAMES),
                condition=condition,
                arrival_date=pos_date + timedelta(days=random.randint(1, 7))
                if condition in ("На складі", "Видано")
                else None,
                sale_date=pos_date + timedelta(days=random.randint(2, 10))
                if condition == "Видано"
                else None,
                note=None,
            )
            all_positions.append(position)
            order_total += sell * qty

        session.add_all(all_positions[-num_positions:])
        session.flush()

        # Update order total
        order.total = order_total

        # Generate payments (0..3 per order)
        paid_total = Decimal("0.00")
        num_payments = random.randint(0, 3)
        for p_idx in range(num_payments):
            remaining = order_total - paid_total
            if remaining <= 0:
                break
            # Last payment covers the rest, or partial
            if p_idx == num_payments - 1 and random.random() < 0.7:
                amount = remaining
            else:
                max_val = max(int(remaining), 100)
                amount = min(
                    Decimal(str(random.randint(100, max_val + 1))),
                    remaining,
                ).quantize(Decimal("0.01"))

            payment = Payment(
                order_id=order.id,
                date=order_date + timedelta(days=random.randint(0, 14)),
                amount=amount,
                comment=None,
                author=random.choice(OPERATORS),
                payment_type=random.choice(PAYMENT_TYPES),
                operation=None,
            )
            all_payments.append(payment)
            paid_total += amount

        order.debt = order_total - paid_total
        all_orders.append(order)

    session.add_all(all_payments)
    session.flush()

    print(f"  orders: {len(all_orders)}")
    print(f"  order_positions: {len(all_positions)}")
    print(f"  payments: {len(all_payments)}")
    return all_orders, all_positions, all_payments


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    """Drop all tables, re-create, and populate with demo data."""
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)

    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    # Run the same lightweight migration as create_tables() to add
    # any ALTER TABLE columns that the ORM model expects.
    with engine.connect() as conn:
        cursor = conn.execute(text("PRAGMA table_info(order_positions)"))
        cols = {row[1] for row in cursor.fetchall()}
        if "analogs" not in cols:
            conn.execute(
                text("ALTER TABLE order_positions ADD COLUMN analogs TEXT")
            )

        cursor_prod = conn.execute(text("PRAGMA table_info(products)"))
        prod_cols = {row[1] for row in cursor_prod.fetchall()}
        if "analogs" not in prod_cols:
            conn.execute(
                text("ALTER TABLE products ADD COLUMN analogs TEXT")
            )
        conn.commit()

    print("Seeding demo data...")
    session = SessionLocal()
    try:
        users = seed_users(session)
        suppliers = seed_suppliers(session)
        manufacturers = seed_manufacturers(session)
        groups = seed_product_groups(session)
        products = seed_products(session, groups, manufacturers, suppliers)
        clients = seed_clients(session)
        vehicles = seed_vehicles(session, clients)
        orders, positions, payments = seed_orders(
            session, clients, vehicles, suppliers
        )
        session.commit()
        print("\nDone. Database seeded successfully.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
