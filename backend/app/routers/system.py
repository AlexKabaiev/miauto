from datetime import datetime
import os
from pathlib import Path
import signal
import sys
import threading
import time
import zipfile

from fastapi import APIRouter, HTTPException
from app.config import settings
from app.database import engine
from sqlalchemy import text

router = APIRouter(prefix="/api/system", tags=["system"])


def create_backup_archive(is_manual: bool = True) -> str:
    """Safely back up the SQLite database to a ZIP archive using VACUUM INTO."""
    backup_dir = settings.BACKUP_DIR
    backup_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    if is_manual:
        archive_name = f"miauto_manual_{now.strftime('%Y%m%d_%H%M%S')}.zip"
    else:
        archive_name = f"miauto_auto_backup_{now.strftime('%Y%m%d')}.zip"

    archive_path = backup_dir / archive_name
    temp_db = backup_dir / f"temp_{now.strftime('%Y%m%d_%H%M%S')}.db"

    try:
        # SQLite's VACUUM INTO requires target path to NOT exist.
        if temp_db.exists():
            temp_db.unlink()

        with engine.connect() as conn:
            conn.execute(text(f"VACUUM INTO '{temp_db}'"))
            conn.commit()

        # Package target db into zip
        with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zip_f:
            zip_f.write(temp_db, arcname="miauto.db")

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Помилка створення резервної копії: {str(e)}"
        )
    finally:
        # Delete temp uncompressed database file
        if temp_db.exists():
            temp_db.unlink()

    return archive_name


def cleanup_auto_backups(keep_count: int = 5):
    """Retain only the last `keep_count` daily auto backups."""
    backup_dir = settings.BACKUP_DIR
    if not backup_dir.exists():
        return

    files = sorted(
        [f for f in backup_dir.glob("miauto_auto_backup_*.zip")],
        key=lambda x: x.name
    )

    if len(files) > keep_count:
        for f in files[:-keep_count]:
            try:
                f.unlink()
            except Exception:
                pass


@router.post("/backup")
def backup_db():
    """Trigger manual database backup."""
    archive_name = create_backup_archive(is_manual=True)
    return {"status": "success", "file": archive_name}


@router.post("/shutdown")
def shutdown_app():
    """Create automatic backup, clean old ones, and stop application server."""
    # 1. Automatic daily backup
    archive_name = create_backup_archive(is_manual=False)

    # 2. Delete older backups (keep last 5)
    cleanup_auto_backups(keep_count=5)

    # 3. Shutdown Uvicorn from background thread to allow response delivery
    def stop_server():
        time.sleep(0.5)
        # Send KeyboardInterrupt signal to the main thread of Uvicorn
        os.kill(os.getpid(), signal.SIGINT)

    threading.Thread(target=stop_server, daemon=True).start()

    return {
        "status": "success",
        "message": "Застосунок успішно зупиняється. Резервна копія збережена.",
        "backup": archive_name
    }
