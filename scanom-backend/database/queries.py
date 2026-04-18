"""
Database queries — all Supabase/PostGIS query functions.
Centralises data access so routers stay clean.
"""

from database.supabase_client import get_supabase
from services.geo import haversine_distance
from datetime import datetime, timezone


# ── DETECTIONS ───────────────────────────────────────────────────────────────

def save_detection(detection: dict) -> dict:
    """Insert a new detection record. Returns the saved record with its UUID."""
    sb   = get_supabase()
    resp = sb.table("detections").insert(detection).execute()
    return resp.data[0] if resp.data else {}


def get_detections_nearby(lat: float, lng: float, radius_km: float = 5.0) -> list:
    """
    Fetch all detections within radius_km of (lat, lng).
    Uses PostGIS ST_DWithin for efficient spatial query.
    Falls back to in-memory Haversine if PostGIS query fails.
    """
    sb = get_supabase()
    radius_meters = radius_km * 1000

    try:
        # PostGIS spatial query — most efficient
        resp = sb.rpc(
            "get_nearby_detections",
            {"user_lat": lat, "user_lng": lng, "radius_m": radius_meters},
        ).execute()
        return resp.data or []
    except Exception:
        # Fallback: fetch recent detections and filter in-memory
        resp = sb.table("detections").select(
            "id,lat,lng,plant,disease,disease_display,is_healthy,"
            "risk_level,spread_radius,created_at"
        ).order("created_at", desc=True).limit(200).execute()

        result = []
        for d in (resp.data or []):
            dist = haversine_distance(lat, lng, d["lat"], d["lng"])
            if dist <= radius_km:
                result.append({**d, "distance_km": round(dist, 2)})
        return result


def get_user_detections(user_id: str, limit: int = 20, offset: int = 0) -> list:
    """Fetch a user's own detection history, newest first."""
    sb   = get_supabase()
    resp = (
        sb.table("detections")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return resp.data or []


def get_detection_by_id(detection_id: str) -> dict | None:
    """Fetch a single detection record by UUID."""
    sb   = get_supabase()
    resp = sb.table("detections").select("*").eq("id", detection_id).single().execute()
    return resp.data


# ── RISK SUMMARY ──────────────────────────────────────────────────────────────

def get_risk_summary(lat: float, lng: float, radius_km: float = 5.0) -> dict:
    """
    Summarise disease risk in an area: count, dominant disease, overall level.
    """
    detections = get_detections_nearby(lat, lng, radius_km)
    active      = [d for d in detections if not d.get("is_healthy", False)]

    if not active:
        return {
            "area_risk_level":       "none",
            "area_risk_score":       0.0,
            "total_cases_nearby":    0,
            "dominant_disease":      None,
            "dominant_disease_display": None,
        }

    # Tally risk levels
    level_scores = {"low": 20, "moderate": 55, "high": 85}
    avg_score = sum(level_scores.get(d.get("risk_level", "low"), 20) for d in active) / len(active)

    if avg_score < 35:
        area_risk = "low"
    elif avg_score < 70:
        area_risk = "moderate"
    else:
        area_risk = "high"

    # Most common disease
    disease_counts: dict[str, int] = {}
    for d in active:
        disease_counts[d["disease"]] = disease_counts.get(d["disease"], 0) + 1
    dominant = max(disease_counts, key=disease_counts.get)
    dominant_display = next(
        (d["disease_display"] for d in active if d["disease"] == dominant), dominant
    )

    return {
        "area_risk_level":          area_risk,
        "area_risk_score":          round(avg_score, 2),
        "total_cases_nearby":       len(active),
        "dominant_disease":         dominant,
        "dominant_disease_display": dominant_display,
    }


# ── USERS ────────────────────────────────────────────────────────────────────

def get_user_profile(user_id: str) -> dict | None:
    sb   = get_supabase()
    resp = sb.table("users").select("id,name,location,avatar_url").eq("id", user_id).single().execute()
    return resp.data


def upsert_user_profile(user_id: str, data: dict) -> dict:
    sb   = get_supabase()
    resp = sb.table("users").upsert({"id": user_id, **data}).execute()
    return resp.data[0] if resp.data else {}


# ── RETENTION ────────────────────────────────────────────────────────────────

def enforce_retention(user_id: str, max_records: int = 50):
    """
    Keep only the most recent `max_records` scans per user.
    Called after every successful detection save.
    """
    sb = get_supabase()
    try:
        resp = (
            sb.table("detections")
            .select("id")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(max_records, 9999)
            .execute()
        )
        old_ids = [d["id"] for d in (resp.data or [])]
        if old_ids:
            sb.table("detections").delete().in_("id", old_ids).execute()
    except Exception as e:
        print(f"Retention cleanup error: {e}")
