# Інструкція для розробників (Contributing Guide)

Дякуємо за інтерес до розвитку проекту **MIAUTO**! Нижче наведено стандарти розробки, вимоги до коду та процес створення Pull Request.

---

## 🛠️ Налаштування локального середовища

### 1. Бекенд (Python 3.10+)
Ми рекомендуємо використовувати менеджер віртуальних середовищ **`uv`**:

```bash
# Створення віртуального оточення
uv venv

# Активація (PowerShell у Windows)
.venv\Scripts\Activate.ps1

# Встановлення залежностей
uv pip install -r backend/requirements.txt
```

### 2. Фронтенд (Node.js 18+)
```bash
cd frontend
npm install
```

---

## 🌿 Робота з гілками (Branching Model)

1. Створюйте окрему гілку від актуальної гілки `main`:
   - `feat/feature-name` — для нового функціоналу;
   - `fix/bug-name` — для виправлення помилок;
   - `docs/doc-update` — для оновлення документації;
   - `refactor/component-name` — для рефакторингу без зміни поведінки.
2. Не комітьте зміни безпосередньо у `main`.

---

## 💬 Стандарти повідомлень комітів (Conventional Commits)

Формат коміту: `<type>(<scope>): <short description>`

* `feat`: Новий функціонал (наприклад: `feat(orders): add currency conversion toggle`)
* `fix`: Виправлення бага (наприклад: `fix(database): resolve locking issue on migration`)
* `docs`: Зміни в документації (наприклад: `docs(api): update order schemas documentation`)
* `style`: Форматування, відступи (без зміни логіки)
* `refactor`: Рефакторинг коду (наприклад: `refactor(seed): simplify fake data generation`)
* `test`: Додавання або виправлення тестів (наприклад: `test(dashboard): add profit calculation test`)
* `chore`: Збірка, пакети, залежності (наприклад: `chore(deps): bump vite version`)

---

## 🧪 Перевірка перед створенням Pull Request

Перед поданням Pull Request переконайтеся, що:

1. **Тести бекенду проходять без помилок:**
   ```bash
   .venv\Scripts\python.exe -m pytest backend/tests/
   ```
2. **Фронтенд успішно компілюється без помилок типізації:**
   ```bash
   cd frontend
   npm run build
   ```
3. **Відсутні секрети або файли бази даних:**
   Перевірте `git status`, переконайтеся що `*.db`, `.env` або персональні дані не потрапили в індекс.
4. **Оновлено документацію:**
   Якщо змінено контракти API чи налаштування, оновіть відповідні файли в папці `docs/` та додайте запис у `CHANGELOG.md` під секцією `[Unreleased]`.

---

## 📬 Процес створення Pull Request (PR)

1. Відкрийте PR на гілку `main`.
2. Заповніть шаблон Pull Request, зазначивши внесені зміни, причини та спосіб перевірки.
3. Очікуйте на рев'ю від майнтейнерів репозиторію. Усі зауваження мають бути враховані до злиття.
