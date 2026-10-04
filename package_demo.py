"""Скрипт пакування демонстраційної версії MIAUTO для Windows (GitHub Releases)."""

import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
DIST_EXE = ROOT_DIR / "dist" / "MIAUTO.exe"
SOURCE_DB = ROOT_DIR / "backend" / "data" / "miauto.db"
RELEASE_DIR = ROOT_DIR / "release"
BUNDLE_DIR = RELEASE_DIR / "MIAUTO-demo-windows"
ZIP_PATH = RELEASE_DIR / "MIAUTO-v1.0.0-demo-windows.zip"

README_TEXT = """========================================================================
 MIAUTO — Демонстраційна версія для Windows
========================================================================

Дякуємо за інтерес до програми MIAUTO!
Цей пакет містить повністю автономну робочу демо-версію застосунку,
яка не потребує встановлення додаткового ПЗ (Python, Node.js чи баз даних).

ЯК ЗАПУСТИТИ ДЕМО-ВЕРСІЮ:
1. Запустіть файл "MIAUTO.exe" (двічі клацніть лівою кнопкою миші).
2. Застосунок автоматично запустить локальний сервер та відкриє інтерфейс
   у вашому веб-браузері за адресою: http://127.0.0.1:8421
3. Усі розділи (Замовлення, Клієнти, Товари, Аналітика) вже наповнені
   демонстраційними даними (без персональної інформації).

ЩО МОЖНА СПРОБУВАТИ:
- Створення, редагування та фільтрація замовлень;
- Перегляд карток клієнтів та їхнього фінансового балансу;
- Розрахунок прибутку та маржинальності позицій у реальному часі;
- Перегляд аналітики та графіків на дашборді.

ЯК ЗАВЕРШИТИ РОБОТУ:
- Закрийте консольне вікно сервера або натисніть у ньому Ctrl + C.

ДАНІ:
- Ваша база даних зберігається локально у файлі "data\\miauto.db".
- Усі створені під час тестування записи залишаються у вашому файлі бази.

Офіційний репозиторій проекту:
https://github.com/AlexKabaiev/miauto
========================================================================
"""


def main() -> None:
    print("=" * 60)
    print(" Пакування релізного демо-архіву MIAUTO для Windows")
    print("=" * 60)

    if not DIST_EXE.exists():
        print(f"Помилка: Файл {DIST_EXE} не знайдено!")
        print("Спочатку виконайте збірку: pyinstaller --clean miauto.spec")
        sys.exit(1)

    if not SOURCE_DB.exists():
        print(f"Демо-базу {SOURCE_DB} не знайдено. Генеруємо синтетичні дані...")
        subprocess.run([sys.executable, "-m", "app.seed"], cwd=ROOT_DIR / "backend", check=True)

    # Очищення попереднього бандлу
    if BUNDLE_DIR.exists():
        shutil.rmtree(BUNDLE_DIR)
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()

    # Створення структури папок
    (BUNDLE_DIR / "data").mkdir(parents=True, exist_ok=True)
    (BUNDLE_DIR / "backups").mkdir(parents=True, exist_ok=True)

    # Копіювання виконуваного файлу
    print(f"Копіювання {DIST_EXE.name}...")
    shutil.copy2(DIST_EXE, BUNDLE_DIR / "MIAUTO.exe")

    # Копіювання чистої демо бази
    print("Копіювання демонстраційної бази даних miauto.db...")
    shutil.copy2(SOURCE_DB, BUNDLE_DIR / "data" / "miauto.db")

    # Створення інструкції
    print("Створення README_DEMO.txt...")
    (BUNDLE_DIR / "README_DEMO.txt").write_text(README_TEXT, encoding="utf-8")

    # Створення ZIP архіву
    print(f"Створення архіву {ZIP_PATH}...")
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(BUNDLE_DIR):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(BUNDLE_DIR)
                zipf.write(file_path, arcname)

    size_mb = ZIP_PATH.stat().st_size / (1024 * 1024)
    print("=" * 60)
    print(f" Успішно створено демо-архів: {ZIP_PATH.name} ({size_mb:.2f} MB)")
    print(f" Шлях: {ZIP_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    main()
