from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Hub, Cycle, Trip, User, RebalanceAlert
from app.schemas import HubResponse, UserResponse
from app.utils.auth import get_current_user
from app.ai.demand_forecaster import predict_hub_demands
import datetime

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

def verify_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin" and not current_user.email.startswith("admin@"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required."
        )
    return current_user

@router.get("/stats")
def get_admin_dashboard_stats(db: Session = Depends(get_db)):
    total_hubs = db.query(Hub).count()
    total_cycles = db.query(Cycle).count()
    active_cycles = db.query(Cycle).filter(Cycle.status == "in_use").count()
    available_cycles = db.query(Cycle).filter(Cycle.status == "available").count()
    maintenance_cycles = db.query(Cycle).filter(Cycle.status == "maintenance").count()
    
    total_users = db.query(User).filter(User.role == "student").count()
    active_trips = db.query(Trip).filter(Trip.status == "active").count()
    total_trips = db.query(Trip).count()

    users = db.query(User).filter(User.role == "student").all()
    avg_trust = round(sum([u.trust_score for u in users]) / max(1, len(users)), 1) if users else 100.0

    return {
        "total_hubs": total_hubs,
        "total_cycles": total_cycles,
        "active_cycles": active_cycles,
        "available_cycles": available_cycles,
        "maintenance_cycles": maintenance_cycles,
        "total_students": total_users,
        "active_trips": active_trips,
        "total_trips_completed": total_trips,
        "avg_trust_score": avg_trust,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

@router.get("/hubs")
def get_admin_hubs(db: Session = Depends(get_db)):
    hubs = db.query(Hub).all()
    result = []
    for h in hubs:
        avail = db.query(Cycle).filter(Cycle.current_hub_id == h.id, Cycle.status == "available").count()
        in_use = db.query(Cycle).filter(Cycle.current_hub_id == h.id, Cycle.status == "in_use").count()
        maint = db.query(Cycle).filter(Cycle.current_hub_id == h.id, Cycle.status == "maintenance").count()
        
        cycles_list = db.query(Cycle).filter(Cycle.current_hub_id == h.id).all()
        
        result.append({
            "id": h.id,
            "name": h.name,
            "code": h.code,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "radius_meters": h.radius_meters,
            "capacity": h.capacity,
            "description": h.description,
            "available_cycles": avail,
            "in_use_cycles": in_use,
            "maintenance_cycles": maint,
            "cycles": [
                {
                    "id": c.id,
                    "code": c.code,
                    "status": c.status,
                    "battery_pct": c.battery_pct,
                    "lock_pin": c.lock_pin,
                    "ble_mac": c.ble_mac
                } for c in cycles_list
            ]
        })
    return result

@router.get("/rebalance")
def get_rebalance_forecast(db: Session = Depends(get_db)):
    hubs = db.query(Hub).all()
    predictions = predict_hub_demands(hubs)
    return predictions

@router.get("/users")
def get_students_trust_scores(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.trust_score.desc()).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "trust_score": u.trust_score,
            "active_trip_id": u.active_trip_id,
            "created_at": u.created_at.isoformat() if u.created_at else None
        } for u in users
    ]
