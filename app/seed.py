from app.database import engine, SessionLocal, Base
from app.models import Hub, Cycle, User, Trip, IoTTelemetry
import random
import datetime

# 10 IIM Bodh Gaya Campus Hubs
CAMPUS_HUBS = [
    {
        "name": "Main Gate",
        "code": "HUB-MG",
        "latitude": 24.6985,
        "longitude": 84.9855,
        "radius_meters": 60.0,
        "capacity": 30,
        "description": "Primary campus entrance & visitor security check.",
        "icon": "door-open"
    },
    {
        "name": "Academic Block",
        "code": "HUB-AB",
        "latitude": 24.6965,
        "longitude": 84.9875,
        "radius_meters": 60.0,
        "capacity": 40,
        "description": "Main lecture halls, library, and faculty offices.",
        "icon": "book-open"
    },
    {
        "name": "Mess / Annapurna",
        "code": "HUB-MS",
        "latitude": 24.6955,
        "longitude": 84.9865,
        "radius_meters": 60.0,
        "capacity": 30,
        "description": "Central dining hall and student cafeteria.",
        "icon": "utensils"
    },
    {
        "name": "Sports Complex / Udaan",
        "code": "HUB-SC",
        "latitude": 24.6945,
        "longitude": 84.9880,
        "radius_meters": 60.0,
        "capacity": 25,
        "description": "Gymnasium, indoor badminton, and sports grounds.",
        "icon": "activity"
    },
    {
        "name": "H1 & H2 Hostel",
        "code": "HUB-H1H2",
        "latitude": 24.6970,
        "longitude": 84.9890,
        "radius_meters": 60.0,
        "capacity": 25,
        "description": "Student residence blocks H1 and H2.",
        "icon": "home"
    },
    {
        "name": "H3 & H4 Hostel",
        "code": "HUB-H3H4",
        "latitude": 24.6960,
        "longitude": 84.9895,
        "radius_meters": 60.0,
        "capacity": 25,
        "description": "Student residence blocks H3 and H4.",
        "icon": "home"
    },
    {
        "name": "Hostel Block",
        "code": "HUB-HSTL",
        "latitude": 24.6950,
        "longitude": 84.9900,
        "radius_meters": 60.0,
        "capacity": 20,
        "description": "Executive hostel and guest residence.",
        "icon": "building"
    },
    {
        "name": "Siang + Bose Hostel",
        "code": "HUB-SB",
        "latitude": 24.6940,
        "longitude": 84.9890,
        "radius_meters": 60.0,
        "capacity": 20,
        "description": "Siang and Bose student accommodation wings.",
        "icon": "home"
    },
    {
        "name": "Gargi Hostel",
        "code": "HUB-GH",
        "latitude": 24.6935,
        "longitude": 84.9875,
        "radius_meters": 60.0,
        "capacity": 20,
        "description": "Gargi women's hostel precinct.",
        "icon": "home"
    },
    {
        "name": "Aryabhatta Hostel",
        "code": "HUB-AH",
        "latitude": 24.6975,
        "longitude": 84.9880,
        "radius_meters": 60.0,
        "capacity": 20,
        "description": "Aryabhatta post-graduate student residence.",
        "icon": "home"
    }
]

def seed_database():
    print("Initializing database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        print("Seeding 10 IIM Bodh Gaya campus hubs...")
        created_hubs = []
        for hub_data in CAMPUS_HUBS:
            hub = Hub(**hub_data)
            db.add(hub)
            created_hubs.append(hub)
        db.commit()

        for hub in created_hubs:
            db.refresh(hub)

        print("Seeding student & admin users...")
        test_student = User(
            name="Aarav Sharma",
            email="aarav.s2025@iimbg.ac.in",
            role="student",
            trust_score=98.5
        )
        demo_student = User(
            name="Priya Patel",
            email="priya.p2025@iimbg.ac.in",
            role="student",
            trust_score=92.0
        )
        admin_user = User(
            name="Campus Fleet Admin",
            email="admin@iimbg.ac.in",
            role="admin",
            trust_score=100.0
        )
        db.add(test_student)
        db.add(demo_student)
        db.add(admin_user)
        db.commit()

        print("Seeding 200 cycles fleet across 10 hubs (~20 cycles per hub)...")
        TOTAL_CYCLES = 200
        cycles_per_hub = TOTAL_CYCLES // len(created_hubs)

        cycle_counter = 1
        for i, hub in enumerate(created_hubs):
            # Distribute 20 cycles per hub (with slight variation for realism)
            count_for_this_hub = cycles_per_hub + (1 if i < (TOTAL_CYCLES % len(created_hubs)) else 0)
            
            for _ in range(count_for_this_hub):
                code = f"BG-CYCLE-{cycle_counter:03d}"
                qr_code = f"IIMBG-RIDE-{cycle_counter:03d}"
                pin = f"{(1000 + cycle_counter * 137) % 9000 + 1000}"
                ble_mac = f"C0:26:BG:{(cycle_counter*7)%99:02X}:{(cycle_counter*13)%99:02X}:{(cycle_counter*19)%99:02X}"
                battery = random.randint(70, 100)
                
                # ~5% in maintenance, 95% available
                status = "maintenance" if (cycle_counter % 25 == 0) else "available"

                cycle = Cycle(
                    code=code,
                    qr_code=qr_code,
                    status=status,
                    battery_pct=battery,
                    lock_pin=pin,
                    ble_mac=ble_mac,
                    current_hub_id=hub.id,
                    latitude=hub.latitude + random.uniform(-0.0003, 0.0003),
                    longitude=hub.longitude + random.uniform(-0.0003, 0.0003),
                    total_trips=random.randint(5, 85)
                )
                db.add(cycle)
                cycle_counter += 1

        db.commit()

        # Seed sample trip history
        print("Seeding trip history and IoT telemetry logs...")
        cycles = db.query(Cycle).all()
        for c in cycles[:15]:
            start_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=random.randint(2, 48))
            end_time = start_time + datetime.timedelta(minutes=random.randint(8, 25))
            trip = Trip(
                user_id=test_student.id,
                cycle_id=c.id,
                start_hub_id=c.current_hub_id,
                end_hub_id=c.current_hub_id,
                start_time=start_time,
                end_time=end_time,
                duration_minutes=14.0,
                status="completed",
                photo_verified=True,
                verification_score=0.95,
                trust_score_delta=+2.0
            )
            db.add(trip)

            telemetry = IoTTelemetry(
                cycle_id=c.id,
                battery_pct=c.battery_pct,
                lat=c.latitude,
                lng=c.longitude,
                lock_status="locked",
                rssi=-60
            )
            db.add(telemetry)

        db.commit()
        print(f"Successfully seeded database! Total Hubs: {len(created_hubs)}, Total Cycles Seeded: {cycle_counter-1}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
