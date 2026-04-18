"""
Detections router — read-only endpoints for scan data.
GET /detections/nearby  — public, returns area risk circles for the map
GET /detections/user    — authenticated, returns the user's own scan history
"""

from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional
from database.supabase_client import verify_token
from database.queries import get_detections_nearby, get_user_detections

router = APIRouter()


@router.get("/nearby")
async def detections_nearby(
    lat:       float = Query(..., description="Latitude of center point"),
    lng:       float = Query(..., description="Longitude of center point"),
    radius_km: float = Query(5.0, description="Search radius in kilometers (default 5km)"),
):
    """
    Return all non-healthy detections within radius_km of (lat, lng).
    Used to draw risk circles on the Map screen. Public endpoint — no auth required.
    """
    try:
        detections = get_detections_nearby(lat, lng, radius_km)
        # Exclude healthy detections from the risk map
        disease_only = [d for d in detections if not d.get("is_healthy", False)]
        return {
            "detections": disease_only,
            "count":      len(disease_only),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user")
async def user_detections(
    limit:  int = Query(20, ge=1, le=50),
    offset: int = Query(0,  ge=0),
    authorization: Optional[str] = Header(None),
):
    """
    Return the authenticated user's own scan history, newest first.
    Requires: Authorization: Bearer <supabase_token>
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    token = authorization.split(" ", 1)[1]
    user  = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    try:
        detections = get_user_detections(user["id"], limit=limit, offset=offset)
        return {
            "detections": detections,
            "total":      len(detections),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
