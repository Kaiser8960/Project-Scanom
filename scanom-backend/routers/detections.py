"""
Endpoints for reading nearby map detections, user scan history, and resolving detections.
"""

from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional
from database.supabase_client import verify_token
from database.queries import (
    get_detections_nearby,
    get_user_detections,
    resolve_detection as resolve_detection_query,
)

router = APIRouter()


def _reconstruct_for_frontend(record: dict) -> dict:
    """Convert flat database columns back into nested explanation and weather objects."""
    rec = dict(record)

    if any(k in rec for k in ("ai_overview", "ai_causes", "ai_prevention", "ai_treatment", "ai_severity")):
        rec["explanation"] = {
            "overview":   rec.pop("ai_overview",   "") or "",
            "causes":     rec.pop("ai_causes",     "") or "",
            "prevention": rec.pop("ai_prevention", []) or [],
            "treatment":  rec.pop("ai_treatment",  []) or [],
            "severity":   rec.pop("ai_severity",   "moderate") or "moderate",
        }

    if "humidity" in rec or "temperature" in rec:
        rec["weather"] = {
            "humidity":    rec.pop("humidity",    70.0),
            "temperature": rec.pop("temperature", 29.0),
        }

    rec.setdefault("valid",     True)
    rec.setdefault("timestamp", rec.get("created_at", ""))
    rec.setdefault("lat",       0.0)
    rec.setdefault("lng",       0.0)

    return rec


@router.get("/nearby")
async def detections_nearby(
    lat:       float = Query(..., description="Latitude of center point"),
    lng:       float = Query(..., description="Longitude of center point"),
    radius_km: float = Query(5.0, description="Search radius in kilometers (default 5km)"),
):
    """Return active disease detections within radius_km from the last 14 days."""
    try:
        detections   = get_detections_nearby(lat, lng, radius_km, max_age_days=14, active_only=True)
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
    """Return the logged-in user's scan history."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    token = authorization.split(" ", 1)[1]
    user  = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    try:
        raw        = get_user_detections(user, limit=limit, offset=offset)
        detections = [_reconstruct_for_frontend(d) for d in raw]
        return {
            "detections": detections,
            "total":      len(detections),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{detection_id}/resolve")
async def resolve_detection(
    detection_id:  str,
    authorization: Optional[str] = Header(None),
):
    """Mark a detection as resolved so its risk circle is removed from the map."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    token = authorization.split(" ", 1)[1]
    user  = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    try:
        success = resolve_detection_query(detection_id, user)
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Detection not found or you are not the owner.",
            )
        return {"success": True, "message": "Detection marked as resolved. Risk circle removed from map."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
