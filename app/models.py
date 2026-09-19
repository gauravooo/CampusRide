import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    role = Column(String(20), default="student")  # 'student' or 'admin'
    trust_score = Column(Float, default=100.0)    # 0 to 100 score based on proper parking
    is_active = Column(Boolean, default=True)
    active_trip_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    trips = relationship("Trip", back_populates="user")


class Hub(Base):
    __tablename__ = "hubs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Float, default=60.0)
    capacity = Column(Integer, default=15)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="map-pin")

    cycles = relationship("Cycle", back_populates="current_hub")


class Cycle(Base):
    __tablename__ = "cycles"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)  # e.g., 'CYCLE-001'
    qr_code = Column(String(50), unique=True, index=True, nullable=False) # QR Payload
    status = Column(String(20), default="available") # 'available', 'in_use', 'maintenance'
    battery_pct = Column(Integer, default=95)        # IoT Smart Lock Battery %
    lock_pin = Column(String(4), nullable=False)     # Option A: 4-digit PIN reveal
    ble_mac = Column(String(30), nullable=False)     # Option B: Virtual BLE MAC address
    current_hub_id = Column(Integer, ForeignKey("hubs.id"), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    total_trips = Column(Integer, default=0)
    last_serviced = Column(DateTime, default=datetime.datetime.utcnow)

    current_hub = relationship("Hub", back_populates="cycles")
    trips = relationship("Trip", back_populates="cycle")
    telemetry = relationship("IoTTelemetry", back_populates="cycle", cascade="all, delete-orphan")


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cycle_id = Column(Integer, ForeignKey("cycles.id"), nullable=False)
    start_hub_id = Column(Integer, ForeignKey("hubs.id"), nullable=False)
    end_hub_id = Column(Integer, ForeignKey("hubs.id"), nullable=True)
    
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Float, nullable=True)
    status = Column(String(20), default="active") # 'active', 'completed', 'cancelled'
    
    photo_url = Column(Text, nullable=True)        # End-trip parking photo URL
    photo_verified = Column(Boolean, default=False)
    verification_score = Column(Float, default=0.0) # YOLO/ONNX confidence score
    trust_score_delta = Column(Float, default=0.0)

    user = relationship("User", back_populates="trips")
    cycle = relationship("Cycle", back_populates="trips")
    start_hub = relationship("Hub", foreign_keys=[start_hub_id])
    end_hub = relationship("Hub", foreign_keys=[end_hub_id])


class IoTTelemetry(Base):
    __tablename__ = "iot_telemetry"

    id = Column(Integer, primary_key=True, index=True)
    cycle_id = Column(Integer, ForeignKey("cycles.id"), nullable=False)
    battery_pct = Column(Integer, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    lock_status = Column(String(20), default="locked") # 'locked', 'unlocked'
    rssi = Column(Integer, default=-65)                 # BLE Signal Strength
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    cycle = relationship("Cycle", back_populates="telemetry")


class RebalanceAlert(Base):
    __tablename__ = "rebalance_alerts"

    id = Column(Integer, primary_key=True, index=True)
    hub_id = Column(Integer, ForeignKey("hubs.id"), nullable=False)
    hub_name = Column(String(100), nullable=False)
    current_count = Column(Integer, default=0)
    predicted_demand = Column(Integer, default=0)
    deficit = Column(Integer, default=0)
    severity = Column(String(20), default="low") # 'low', 'medium', 'high', 'critical'
    recommended_action = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
