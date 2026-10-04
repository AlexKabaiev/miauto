import unittest
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.client import Client, ClientVehicle
from app.models.order import Order, OrderPosition
from app.models.supplier import Supplier

from app.schemas.order import OrderCreate, PositionCreate
from app.schemas.client import ClientCreate, ClientUpdate, VehicleCreate, VehicleUpdate
from app.routers.orders import create_order, get_order
from app.routers.clients import create_client, update_client

# In-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class TestBugfixesDirect(unittest.TestCase):
    def setUp(self):
        # Create tables
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()

        # Seed initial supplier and client
        self.supplier = Supplier(name="Test Supplier")
        self.db.add(self.supplier)
        self.db.commit()

        self.test_client_obj = Client(fio="Test Client", phone="123456")
        self.db.add(self.test_client_obj)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    def test_order_positions_analogs_saved_and_read(self):
        # 1. Create order with analogs in positions
        order_data = OrderCreate(
            client_id=self.test_client_obj.id,
            currency="грн.",
            exchange_rate=1.0,
            markup=0.0,
            discount=0.0,
            paid=Decimal("0.00"),
            positions=[
                PositionCreate(
                    code="PART-123",
                    name="Part 123",
                    analogs="ANALOG-A, ANALOG-B",
                    supplier_id=self.supplier.id,
                    quantity=2,
                    price_purchase=Decimal("100.00"),
                    price_sell=Decimal("150.00"),
                    manufacturer="OEM",
                    condition="New"
                )
            ]
        )
        
        # Call router function directly
        order_read = create_order(order_data, self.db)
        
        # Verify response contains analogs
        self.assertEqual(len(order_read.positions), 1)
        self.assertEqual(order_read.positions[0].analogs, "ANALOG-A, ANALOG-B")

        # Verify DB directly
        db_pos = self.db.query(OrderPosition).filter_by(order_id=order_read.id).first()
        self.assertIsNotNone(db_pos)
        self.assertEqual(db_pos.analogs, "ANALOG-A, ANALOG-B")

        # 2. Get order details and check if analogs is still there
        order_read_get = get_order(order_read.id, self.db)
        self.assertEqual(order_read_get.positions[0].analogs, "ANALOG-A, ANALOG-B")

    def test_client_vehicles_creation_and_updating(self):
        # 1. Create client with vehicles
        client_data = ClientCreate(
            fio="New Client With Vehicles",
            phone="999999",
            vehicles=[
                VehicleCreate(
                    brand="Toyota",
                    model="Camry",
                    vin="VINTOYOTA12345",
                    license_plate="AA1111AA",
                    engine_volume="2.5",
                    year="2021"
                ),
                VehicleCreate(
                    brand="Audi",
                    model="A6",
                    vin="VINAUDI12345",
                    license_plate="BB2222BB",
                    engine_volume="3.0",
                    year="2020"
                )
            ]
        )
        
        client_read = create_client(client_data, self.db)
        
        # Verify response includes vehicles
        self.assertEqual(len(client_read.vehicles), 2)
        self.assertEqual(client_read.vehicles[0].brand, "Toyota")
        self.assertEqual(client_read.vehicles[1].brand, "Audi")
        
        client_id = client_read.id
        toyota_id = client_read.vehicles[0].id
        audi_id = client_read.vehicles[1].id

        # 2. Update client: edit Toyota, keep Audi (by sending its ID), and add a new Honda
        client_update = ClientUpdate(
            fio="Updated Client Name",
            vehicles=[
                VehicleUpdate(
                    id=toyota_id,
                    brand="Toyota",
                    model="Camry Updated", # updated model
                    vin="VINTOYOTA12345",
                    license_plate="AA1111AA",
                    engine_volume="2.5",
                    year="2021"
                ),
                # Honda is new (no ID)
                VehicleUpdate(
                    brand="Honda",
                    model="Civic",
                    vin="VINHONDA12345"
                )
                # Audi is deleted (omitted from the list)
            ]
        )
        
        client_read_update = update_client(client_id, client_update, self.db)
        
        # Verify update results
        vehicles_updated = client_read_update.vehicles
        self.assertEqual(len(vehicles_updated), 2)
        
        # We should find Toyota (with same ID and updated model) and Honda (new ID), and no Audi
        toyota_found = next((v for v in vehicles_updated if v.id == toyota_id), None)
        self.assertIsNotNone(toyota_found)
        self.assertEqual(toyota_found.model, "Camry Updated")
        
        audi_found = next((v for v in vehicles_updated if v.id == audi_id), None)
        self.assertIsNone(audi_found) # Audi was deleted
        
        honda_found = next((v for v in vehicles_updated if v.brand == "Honda"), None)
        self.assertIsNotNone(honda_found)
        self.assertNotEqual(honda_found.id, toyota_id)


if __name__ == "__main__":
    unittest.main()
