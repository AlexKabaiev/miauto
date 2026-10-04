"""SQLAlchemy engine, session factory, and Base declarative class."""

from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # required for SQLite
    echo=False,
)


# Enable WAL mode and foreign key enforcement for SQLite
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables() -> None:
    """Create all tables defined in ORM models."""
    # Ensure all models are imported so that SQLAlchemy knows about all tables
    import app.models.client
    import app.models.order
    import app.models.product
    import app.models.supplier
    import app.models.payment
    
    Base.metadata.create_all(bind=engine)

    # Perform lightweight migration for SQLite to add new client status fields
    with engine.connect() as conn:
        cursor = conn.execute(text("PRAGMA table_info(clients)"))
        existing_cols = {row[1] for row in cursor.fetchall()}
        
        # Alter table if columns are missing
        if "status" not in existing_cols:
            conn.execute(text("ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'Активний'"))
        if "flags" not in existing_cols:
            conn.execute(text("ALTER TABLE clients ADD COLUMN flags TEXT DEFAULT ''"))
        if "problem_reason" not in existing_cols:
            conn.execute(text("ALTER TABLE clients ADD COLUMN problem_reason TEXT"))
        if "problem_comment" not in existing_cols:
            conn.execute(text("ALTER TABLE clients ADD COLUMN problem_comment TEXT"))
        if "status_updated_at" not in existing_cols:
            conn.execute(text("ALTER TABLE clients ADD COLUMN status_updated_at TIMESTAMP"))
        if "status_updated_by" not in existing_cols:
            conn.execute(text("ALTER TABLE clients ADD COLUMN status_updated_by TEXT"))
        
        # Alter order_positions if analogs is missing
        cursor_pos = conn.execute(text("PRAGMA table_info(order_positions)"))
        existing_pos_cols = {row[1] for row in cursor_pos.fetchall()}
        if "analogs" not in existing_pos_cols:
            conn.execute(text("ALTER TABLE order_positions ADD COLUMN analogs TEXT"))

        # Alter products if analogs is missing
        cursor_prod = conn.execute(text("PRAGMA table_info(products)"))
        existing_prod_cols = {row[1] for row in cursor_prod.fetchall()}
        if "analogs" not in existing_prod_cols:
            conn.execute(text("ALTER TABLE products ADD COLUMN analogs TEXT"))

        conn.commit()

