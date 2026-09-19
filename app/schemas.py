import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

# User Schemas
class UserLoginRequest(BaseModel):
    email: str
    name: str = "Campus Student"
    bypass_token: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    trust_score: float
    active_trip_id: Optional[int] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Hub Schemas
class HubResponse(BaseModel):
    id: int
    name: str
    code: str
    latitude: float
    longitude: float
    radius_meters: float
    capacity: int
    description: Optional[str] = None
    icon: str
    available_cycles: int = 0

    class Config:
        from_attributes = True

# Cycle Schemas
class CycleResponse(BaseModel):
    id: int
    code: str
    qr_code: str
    status: str
    battery_pct: int
    lock_pin: str
    ble_mac: str
    current_hub_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_trips: int

    class Config:
        from_attributes = True

class CycleScanResponse(BaseModel):
    cycle: CycleResponse
    nearest_hub: Optional[HubResponse] = None
    distance_to_hub_meters: float = 0.0
    within_geofence: bool = False
    lock_pin: str
    ble_mac: str

# Trip Schemas
class TripStartRequest(BaseModel):
    cycle_code: str
    user_lat: float
    user_lng: float

class TripEndRequest(BaseModel):
    trip_id: int
    user_lat: float
    user_lng: float
    photo_base64: Optional[str] = None

class TripResponse(BaseModel):
    id: int
    user_id: int
    cycle_id: int
    start_hub_id: int
    end_hub_id: Optional[int] = None
    start_time: datetime.datetime
    end_time: Optional[datetime.datetime] = None
    duration_minutes: Optional[float] = None
    status: str
    photo_url: Optional[str] = None
    photo_verified: bool
    verification_score: float
    trust_score_delta: float

    class Config:
        from_attributes = True

# IoT & BLE Schemas
class IoTUnlockRequest(BaseModel):
    cycle_code: str
    unlock_method: str = "BLE" # 'BLE' or 'PIN'
    ble_mac: Optional[str] = None

class IoTTelemetryPayload(BaseModel):
    cycle_code: str
    battery_pct: int
    lat: float
    lng: float
    lock_status: str # 'locked' or 'unlocked'
    rssi: Optional[int] = -65

# Rebalance Schemas
class RebalanceAlertResponse(BaseModel):
    id: int
    hub_id: int
    hub_name: str
    current_count: int
    predicted_demand: int
    deficit: int
    severity: str
    recommended_action: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True
