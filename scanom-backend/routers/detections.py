"""
Detections router — read endpoints for scan data + resolve endpoint.
GET   /detections/nearby        — public, returns active risk circles for the map
GET   /detections/user          — authenticated, returns user's own scan history
PATCH /detections/{id}/resolve  — authenticated, marks a detection as cured/resolved
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


# ── Helper: reconstruct nested objects from flat DB columns ───────────────────

def _reconstruct_for_frontend(record: dict) -> dict:
    """
    The detect router saves AI explanation as flat columns (ai_overview, ai_causes …).
    This converts them back into the nested `explanation` and `weather` objects
    that the frontend DetectionResult type expects.
    """
    rec = dict(record)

    # Build nested explanation from flat ai_* columns
    if any(k in rec for k in ("ai_overview", "ai_causes", "ai_prevention", "ai_treatment", "ai_severity")):
        rec["explanation"] = {
            "overview":   rec.pop("ai_overview",   "") or "",
            "causes":     rec.pop("ai_causes",     "") or "",
            "prevention": rec.pop("ai_prevention", []) or [],
            "treatment":  rec.pop("ai_treatment",  []) or [],
            "severity":   rec.pop("ai_severity",   "moderate") or "moderate",
        }

    # Build nested weather from flat humidity/temperature columns
    if "humidity" in rec or "temperature" in rec:
        rec["weather"] = {
            "humidity":    rec.pop("humidity",    70.0),
            "temperature": rec.pop("temperature", 29.0),
        }

    # Ensure required frontend fields are present
    rec.setdefault("valid",     True)
    rec.setdefault("timestamp", rec.get("created_at", ""))
    rec.setdefault("lat",       0.0)
    rec.setdefault("lng",       0.0)

    return rec


# ── GET /detections/nearby ────────────────────────────────────────────────────

@router.get("/nearby")
async def detections_nearby(
    lat:       float = Query(..., description="Latitude of center point"),
    lng:       float = Query(..., description="Longitude of center point"),
    radius_km: float = Query(5.0, description="Search radius in kilometers (default 5km)"),
):
    """
    Return all active non-healthy detections within radius_km of (lat, lng),
    limited to the last 14 days. Used to draw risk circles on the Map screen.
    Public endpoint — no auth required.
    """
    try:
        detections   = get_detections_nearby(lat, lng, radius_km, max_age_days=14, active_only=True)
        disease_only = [d for d in detections if not d.get("is_healthy", False)]
        return {
            "detections": disease_only,
            "count":      len(disease_only),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /detections/user ──────────────────────────────────────────────────────

@router.get("/user")
async def user_detections(
    limit:  int = Query(20, ge=1, le=50),
    offset: int = Query(0,  ge=0),
    authorization: Optional[str] = Header(None),
):
    """
    Return the authenticated user's own scan history, newest first.
    Reconstructs the nested explanation + weather objects from flat DB columns.
    Requires: Authorization: Bearer <supabase_token>
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    token = authorization.split(" ", 1)[1]
    user  = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    try:
        raw        = get_user_detections(user["id"], limit=limit, offset=offset)
        detections = [_reconstruct_for_frontend(d) for d in raw]
        return {
            "detections": detections,
            "total":      len(detections),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── PATCH /detections/{detection_id}/resolve ──────────────────────────────────

@router.patch("/{detection_id}/resolve")
async def resolve_detection(
    detection_id:  str,
    authorization: Optional[str] = Header(None),
):
    """
    Mark a detection as resolved/cured. Only the owner can resolve their scan.
    This hides the risk circle from the public map without deleting the record
    (historical analytics are preserved, status is simply updated to 'resolved').
    Requires: Authorization: Bearer <supabase_token>
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    token = authorization.split(" ", 1)[1]
    user  = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    try:
        success = resolve_detection_query(detection_id, user["id"])
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
