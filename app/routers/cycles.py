from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Cycle, Hub, User
from app.schemas import CycleResponse, CycleScanResponse, HubResponse
from app.utils.auth import get_current_user
from app.utils.geo import is_within_geofence, find_nearest_hub

router = APIRouter(prefix="/api/cycles", tags=["Cycles & Locks"])

@router.get("/", response_model=list[CycleResponse])
def get_all_cycles(db: Session = Depends(get_db)):
    cycles = db.query(Cycle).all()
    return [CycleResponse.model_validate(c) for c in cycles]

@router.get("/scan/{qr_code}", response_model=CycleScanResponse)
def scan_cycle_qr(
    qr_code: str,
    lat: float = Query(24.6961, description="User latitude"),
    lng: float = Query(84.9869, description="User longitude"),
    db: Session = Depends(get_db)
):
    cycle = db.query(Cycle).filter(
        (Cycle.qr_code == qr_code) | (Cycle.code == qr_code)
    ).first()

    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cycle with QR code '{qr_code}' not found."
        )

    hubs = db.query(Hub).all()
    nearest_hub_obj, dist = find_nearest_hub(lat, lng, hubs)
    within_geo = dist <= (nearest_hub_obj.radius_meters if nearest_hub_obj else 60.0)

    nearest_hub_resp = HubResponse.model_validate(nearest_hub_obj) if nearest_hub_obj else None

    return CycleScanResponse(
        cycle=CycleResponse.model_validate(cycle),
        nearest_hub=nearest_hub_resp,
        distance_to_hub_meters=round(dist, 1),
        within_geofence=within_geo,
        lock_pin=cycle.lock_pin,
        ble_mac=cycle.ble_mac
    )
