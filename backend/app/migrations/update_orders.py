"""Migration: update all orders to 'Виконано' status, set debt to 0, and is_active to False."""
import sqlite3
import os

def migrate():
    appdata = os.environ.get("APPDATA")
    db_paths = [
        os.path.join(os.path.dirname(__file__), "..", "..", "data", "miauto.db"),
    ]
    if appdata:
        db_paths.append(os.path.join(appdata, "MIAUTO", "data", "miauto.db"))

    for db_path in db_paths:
        print(f"Checking DB Path: {db_path}")
        if not os.path.exists(db_path):
            print("  File not found, skipping.")
            continue

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("UPDATE orders SET debt = 0.00, [group] = 'Виконано', is_active = 0")
        conn.commit()
        print(f"  Successfully updated {cur.rowcount} orders in database: {db_path}")
        conn.close()

if __name__ == "__main__":
    migrate()
