import unittest
from unittest.mock import patch
from datetime import datetime
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.client import Client
from app.models.order import Order, OrderPosition
from app.models.payment import Payment
from app.routers.dashboard import get_stats

# Створимо фіктивний клас datetime, який дозволяє підміняти now()
class MockDatetime(datetime):
    _mock_now_val = None

    @classmethod
    def now(cls, tz=None):
        if cls._mock_now_val is not None:
            return cls._mock_now_val
        return datetime.now(tz)


class TestDashboardStats(unittest.TestCase):
    def setUp(self):
        # Ініціалізація бази в пам'яті
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        
        # Створимо клієнта
        self.client = Client(fio="Іван Іванов", phone="0991234567")
        self.db.add(self.client)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    @patch('app.routers.dashboard.datetime', new=MockDatetime)
    def test_monthly_stats_reset(self):
        # 1. Симулюємо дату: 25 травня 2026 року
        MockDatetime._mock_now_val = datetime(2026, 5, 25, 12, 0, 0)
        
        # Створюємо замовлення у Травні
        order_may = Order(
            client_id=self.client.id,
            date=datetime(2026, 5, 20, 10, 0, 0),
            group="Нове",
            total=Decimal("1500.00"),
            debt=Decimal("1500.00"),
        )
        self.db.add(order_may)
        self.db.commit() # отримаємо order_may.id

        # Додамо позицію до замовлення травня (з прибутком 500)
        pos_may = OrderPosition(
            order_id=order_may.id,
            code="MAY-PART",
            name="May Part",
            quantity=1,
            price_purchase=Decimal("1000.00"),
            price_sell=Decimal("1500.00"),
        )
        order_may.positions.append(pos_may)
        self.db.commit()
        
        # Додамо оплату у Травні
        payment_may = Payment(
            order_id=order_may.id,
            date=datetime(2026, 5, 20, 10, 5, 0),
            amount=Decimal("500.00")
        )
        order_may.payments.append(payment_may)
        order_may.debt = order_may.total - Decimal("500.00")
        self.db.commit()

        # Викликаємо статистику для Травня
        stats = get_stats(self.db)
        
        # Перевіряємо показники Травня
        self.assertEqual(stats["month_orders"], 1)
        self.assertEqual(stats["month_profit"], 500.0)
        self.assertEqual(stats["active_orders"], 1)
        self.assertEqual(stats["total_debt"], 1000.0)
        self.assertEqual(stats["orders_with_debt"], 1)

        # 2. Симулюємо дату: 1 червня 2026 року (перехід місяця!)
        MockDatetime._mock_now_val = datetime(2026, 6, 1, 0, 0, 0)
        
        # Викликаємо статистику — місячні показники мають скинутися в 0,
        # але активні замовлення та борги мають залишитися (оскільки замовлення травня все ще активне)
        stats = get_stats(self.db)
        self.assertEqual(stats["month_orders"], 0)   # Скинулося!
        self.assertEqual(stats["month_profit"], 0.0) # Скинулося!
        self.assertEqual(stats["active_orders"], 1)   # Активне замовлення з травня
        self.assertEqual(stats["total_debt"], 1000.0) # Борг з травня
        
        # 3. Створимо нове замовлення та оплату у Червні
        order_june = Order(
            client_id=self.client.id,
            date=datetime(2026, 6, 1, 10, 0, 0),
            group="Нове",
            total=Decimal("2000.00"),
            debt=Decimal("2000.00")
        )
        self.db.add(order_june)
        self.db.commit()

        # Додамо позицію до замовлення червня (з прибутком 1200)
        pos_june = OrderPosition(
            order_id=order_june.id,
            code="JUNE-PART",
            name="June Part",
            quantity=1,
            price_purchase=Decimal("800.00"),
            price_sell=Decimal("2000.00"),
        )
        order_june.positions.append(pos_june)
        self.db.commit()
        
        payment_june = Payment(
            order_id=order_june.id,
            date=datetime(2026, 6, 1, 10, 5, 0),
            amount=Decimal("1200.00")
        )
        order_june.payments.append(payment_june)
        order_june.debt = order_june.total - Decimal("1200.00")
        self.db.commit()

        # Викликаємо статистику для Червня
        stats = get_stats(self.db)
        self.assertEqual(stats["month_orders"], 1)     # Тільки замовлення Червня
        self.assertEqual(stats["month_profit"], 1200.0) # Тільки прибуток Червня
        self.assertEqual(stats["active_orders"], 2)     # Травневе + Червневе
        self.assertEqual(stats["total_debt"], 1800.0)   # 1000 (травень) + 800 (червень)

    @patch('app.routers.dashboard.datetime', new=MockDatetime)
    def test_cancelled_orders_excluded(self):
        MockDatetime._mock_now_val = datetime(2026, 6, 15, 12, 0, 0)
        
        # 1. Create a non-cancelled order with debt and profit in June
        order_ok = Order(
            client_id=self.client.id,
            date=datetime(2026, 6, 10, 10, 0, 0),
            group="Нове",
            total=Decimal("1000.00"),
            debt=Decimal("400.00")
        )
        self.db.add(order_ok)
        self.db.commit()
        
        pos_ok = OrderPosition(
            order_id=order_ok.id,
            code="OK-PART",
            name="OK Part",
            quantity=1,
            price_purchase=Decimal("500.00"),
            price_sell=Decimal("1000.00")
        )
        order_ok.positions.append(pos_ok)
        self.db.commit()
        
        # 2. Create a cancelled order with debt and profit in June
        order_cancelled = Order(
            client_id=self.client.id,
            date=datetime(2026, 6, 11, 10, 0, 0),
            group="Скасовано",
            total=Decimal("800.00"),
            debt=Decimal("800.00")
        )
        self.db.add(order_cancelled)
        self.db.commit()
        
        pos_cancelled = OrderPosition(
            order_id=order_cancelled.id,
            code="BAD-PART",
            name="Bad Part",
            quantity=1,
            price_purchase=Decimal("300.00"),
            price_sell=Decimal("800.00")
        )
        order_cancelled.positions.append(pos_cancelled)
        self.db.commit()

        # Call stats
        stats = get_stats(self.db)
        
        # Cancelled order must be excluded from stats:
        # Month orders should only count the non-cancelled one (1)
        self.assertEqual(stats["month_orders"], 1)
        # Month profit should only count the non-cancelled one (500.0)
        self.assertEqual(stats["month_profit"], 500.0)
        # Active orders should be 1
        self.assertEqual(stats["active_orders"], 1)
        # Total debt should be 400.0 (excluding the 800.0 of cancelled)
        self.assertEqual(stats["total_debt"], 400.0)
        # Orders with debt should be 1 (excluding cancelled)
        self.assertEqual(stats["orders_with_debt"], 1)


if __name__ == "__main__":
    unittest.main()
