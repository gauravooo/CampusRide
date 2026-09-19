from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Cycle, IoTTelemetry
from app.schemas import IoTUnlockRequest, IoTTelemetryPayload
from app.utils.auth import get_current_user
import datetime

router = APIRouter(prefix="/api/iot", tags=["IoT Smart Lock Simulator"])

@router.post("/unlock")
def trigger_virtual_lock_unlock(
    request: IoTUnlockRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cycle = db.query(Cycle).filter(
        (Cycle.code == request.cycle_code) | (Cycle.qr_code == request.cycle_code)
    ).first()

    if not cycle:
        raise HTTPException(status_code=404, detail="Smart Lock device not found.")

    # Record telemetry signal
    telemetry = IoTTelemetry(
        cycle_id=cycle.id,
        battery_pct=cycle.battery_pct,
        lat=cycle.latitude or 24.6961,
        lng=cycle.longitude or 84.9869,
        lock_status="unlocked",
        rssi=-58,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(telemetry)
    db.commit()

    return {
        "status": "success",
        "message": f"Virtual {request.unlock_method} signal emitted successfully.",
        "lock_state": "UNLOCKED",
        "ble_mac": cycle.ble_mac,
        "lock_pin": cycle.lock_pin,
        "battery_pct": cycle.battery_pct,
        "ack_timestamp": datetime.datetime.utcnow().isoformat()
    }

@router.post("/telemetry")
def receive_lock_telemetry(
    payload: IoTTelemetryPayload,
    db: Session = Depends(get_db)
):
    cycle = db.query(Cycle).filter(Cycle.code == payload.cycle_code).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found.")

    cycle.battery_pct = payload.battery_pct
    cycle.latitude = payload.lat
    cycle.longitude = payload.lng

    telemetry = IoTTelemetry(
        cycle_id=cycle.id,
        battery_pct=payload.battery_pct,
        lat=payload.lat,
        lng=payload.lng,
        lock_status=payload.lock_status,
        rssi=payload.rssi or -65,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(telemetry)
    db.commit()

    return {"status": "received", "cycle_code": payload.cycle_code}

@router.get("/status/{cycle_code}")
def get_lock_telemetry(
    cycle_code: str,
    db: Session = Depends(get_db)
):
    cycle = db.query(Cycle).filter(
        (Cycle.code == cycle_code) | (Cycle.qr_code == cycle_code)
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found.")

    latest_telemetry = db.query(IoTTelemetry).filter(
        IoTTelemetry.cycle_id == cycle.id
    ).order_by(IoTTelemetry.timestamp.desc()).first()

    return {
        "cycle_code": cycle.code,
        "status": cycle.status,
        "battery_pct": cycle.battery_pct,
        "ble_mac": cycle.ble_mac,
        "lock_pin": cycle.lock_pin,
        "latitude": cycle.latitude,
        "longitude": cycle.longitude,
        "latest_telemetry": {
            "lock_status": latest_telemetry.lock_status if latest_telemetry else "locked",
            "rssi": latest_telemetry.rssi if latest_telemetry else -65,
            "timestamp": latest_telemetry.timestamp.isoformat() if latest_telemetry else None
        }
    }
