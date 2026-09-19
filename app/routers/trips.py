import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Trip, Cycle, Hub, User
from app.schemas import TripStartRequest, TripEndRequest, TripResponse
from app.utils.auth import get_current_user
from app.utils.geo import find_nearest_hub, is_within_geofence
from app.ai.photo_validator import validate_parking_photo

router = APIRouter(prefix="/api/trips", tags=["Trips & Rides"])

@router.post("/start", response_model=TripResponse)
def start_trip(
    payload: TripStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user already has active trip
    if current_user.active_trip_id:
        existing_trip = db.query(Trip).filter(Trip.id == current_user.active_trip_id, Trip.status == "active").first()
        if existing_trip:
            return TripResponse.model_validate(existing_trip)

    cycle = db.query(Cycle).filter(
        (Cycle.code == payload.cycle_code) | (Cycle.qr_code == payload.cycle_code)
    ).first()

    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found.")

    if cycle.status == "in_use":
        raise HTTPException(status_code=400, detail="Cycle is currently in use by another student.")
    
    if cycle.status == "maintenance":
        raise HTTPException(status_code=400, detail="Cycle is undergoing maintenance.")

    hubs = db.query(Hub).all()
    nearest_hub, dist = find_nearest_hub(payload.user_lat, payload.user_lng, hubs)

    if not nearest_hub:
        raise HTTPException(status_code=400, detail="No campus hub detected near location.")

    start_hub_id = nearest_hub.id if nearest_hub else (cycle.current_hub_id or hubs[0].id)

    # Create new trip
    trip = Trip(
        user_id=current_user.id,
        cycle_id=cycle.id,
        start_hub_id=start_hub_id,
        start_time=datetime.datetime.utcnow(),
        status="active"
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # Update cycle & user status
    cycle.status = "in_use"
    cycle.latitude = payload.user_lat
    cycle.longitude = payload.user_lng
    current_user.active_trip_id = trip.id
    
    db.commit()
    db.refresh(trip)

    return TripResponse.model_validate(trip)


@router.post("/end", response_model=TripResponse)
def end_trip(
    payload: TripEndRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trip = db.query(Trip).filter(Trip.id == payload.trip_id, Trip.user_id == current_user.id).first()
    if not trip or trip.status != "active":
        raise HTTPException(status_code=400, detail="No active trip found with this ID.")

    cycle = db.query(Cycle).filter(Cycle.id == trip.cycle_id).first()
    hubs = db.query(Hub).all()
    end_hub, dist = find_nearest_hub(payload.user_lat, payload.user_lng, hubs)

    within_hub = dist <= (end_hub.radius_meters if end_hub else 60.0)

    # AI Photo verification pipeline check
    ai_result = validate_parking_photo(payload.photo_base64, within_hub)
    is_verified = ai_result["is_valid"]
    verification_score = ai_result["confidence"]

    # Calculate duration
    now = datetime.datetime.utcnow()
    duration_sec = (now - trip.start_time).total_seconds()
    duration_min = round(max(1.0, duration_sec / 60.0), 1)

    # Trust Score reward or penalty
    trust_delta = 0.0
    if within_hub and is_verified:
        trust_delta = +2.0  # Reward proper parking within hub geofence
    elif within_hub and not is_verified:
        trust_delta = +0.5
    else:
        trust_delta = -5.0  # Penalty for out-of-geofence drop off

    # Update Trip
    trip.end_hub_id = end_hub.id if end_hub else trip.start_hub_id
    trip.end_time = now
    trip.duration_minutes = duration_min
    trip.status = "completed"
    trip.photo_url = payload.photo_base64[:100] if payload.photo_base64 else None
    trip.photo_verified = is_verified
    trip.verification_score = verification_score
    trip.trust_score_delta = trust_delta

    # Update Cycle & User
    if cycle:
        cycle.status = "available"
        cycle.current_hub_id = end_hub.id if end_hub else trip.start_hub_id
        cycle.latitude = payload.user_lat
        cycle.longitude = payload.user_lng
        cycle.total_trips = (cycle.total_trips or 0) + 1

    current_user.active_trip_id = None
    current_user.trust_score = max(0.0, min(100.0, current_user.trust_score + trust_delta))

    db.commit()
    db.refresh(trip)

    return TripResponse.model_validate(trip)


@router.get("/active", response_model=TripResponse)
def get_active_trip(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.active_trip_id:
        raise HTTPException(status_code=404, detail="No active trip found.")
    
    trip = db.query(Trip).filter(Trip.id == current_user.active_trip_id, Trip.status == "active").first()
    if not trip:
        raise HTTPException(status_code=404, detail="Active trip not found.")

    return TripResponse.model_validate(trip)


@router.get("/history", response_model=list[TripResponse])
def get_trip_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trips = db.query(Trip).filter(Trip.user_id == current_user.id).order_by(Trip.start_time.desc()).limit(20).all()
    return [TripResponse.model_validate(t) for t in trips]
