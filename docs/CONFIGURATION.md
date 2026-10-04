# Конфігурація застосунку (Configuration Guide) — MIAUTO

## 1. Загальні принципи налаштування

Конфігурація застосунку реалізована за допомогою бібліотеки `pydantic-settings` у модулі `backend/app/config.py`.
Параметри можуть передаватися:
1. Через значення за замовчуванням у коді.
2. Через змінні середовища з префіксом `MIAUTO_`.
3. Через локальний файл конфігурації `.env` у корені проєкту.

---

## 2. Перелік параметрів конфігурації

| Змінна | Тип | За замовчуванням | Опис | Обов'язкова |
| :--- | :--- | :--- | :--- | :--- |
| `MIAUTO_APP_NAME` | `string` | `MIAUTO` | Назва застосунку | Ні |
| `MIAUTO_APP_VERSION` | `string` | `1.0.0` | Поточна версія релізу | Ні |
| `MIAUTO_HOST` | `string` | `127.0.0.1` | IP-адреса для прив'язки локального сервера | Ні |
| `MIAUTO_PORT` | `int` | `8421` | Мережевий порт сервера | Ні |
| `MIAUTO_DB_NAME` | `string` | `miauto.db` | Назва файлу бази даних SQLite | Ні |
| `MIAUTO_MONOBANK_API_URL` | `string` | `https://api.monobank.ua/bank/currency` | Ендпоінт курсів валют | Ні |
| `MIAUTO_CURRENCY_CACHE_TTL`| `int` | `300` | Час життя кешу курсів валют у секундах (5 хв) | Ні |

---

## 3. Каталоги збереження даних та шляхи

Поведінка визначення шляхів адаптується залежно від режиму запуску:

### Режим розробки (Development)
* **Каталог бази даних:** `backend/data/`
* **Шлях до БД:** `backend/data/miauto.db`
* **Резервні копії:** `backups/` у корені проекту.

### Режим автономного EXE (Frozen / Standalone PyInstaller)
* Визначається за допомогою перевірки `getattr(sys, 'frozen', False)`.
* **Каталог бази даних:** `<каталог_з_MIAUTO.exe>/data/`
* **Шлях до БД:** `<каталог_з_MIAUTO.exe>/data/miauto.db`
* **Резервні копії:** `<каталог_з_MIAUTO.exe>/backups/`

---

## 4. Приклад файлу `.env`

```ini
MIAUTO_APP_NAME=MIAUTO
MIAUTO_APP_VERSION=1.0.0
MIAUTO_HOST=127.0.0.1
MIAUTO_PORT=8421
MIAUTO_DB_NAME=miauto.db
MIAUTO_MONOBANK_API_URL=https://api.monobank.ua/bank/currency
MIAUTO_CURRENCY_CACHE_TTL=300
```
