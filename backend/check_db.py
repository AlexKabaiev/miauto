"""Quick check: count records in each table."""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "data", "miauto.db")
print(f"DB: {db_path}")
print(f"Exists: {os.path.exists(db_path)}")
print()

conn = sqlite3.connect(db_path)
cur = conn.cursor()

tables = [
    "suppliers", "manufacturers", "product_groups", "products",
    "clients", "client_vehicles", "orders", "order_positions", "payments",
]

for t in tables:
    try:
        count = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f"  {t}: {count}")
    except Exception as e:
        print(f"  {t}: ERROR - {e}")

conn.close()
