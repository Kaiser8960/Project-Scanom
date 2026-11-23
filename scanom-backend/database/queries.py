"""
Database query functions for detections, risk summaries, and user profiles.
"""

from database.supabase_client import get_supabase
from services.geo import haversine_distance
from datetime import datetime, timezone, timedelta


# Detection queries

def save_detection(detection: dict) -> dict:
    """Insert a new detection record and return the saved row."""
    sb   = get_supabase()
    resp = sb.table("detections").insert(detection).execute()
    return resp.data[0] if resp.data else {}


def find_duplicate_detection(user_id: str, image_hash: str) -> dict | None:
    """Check if this user already scanned the exact same image."""
    try:
        sb   = get_supabase()
        resp = (
            sb.table("detections")
            .select("*")
            .eq("user_id", user_id)
            .eq("image_hash", image_hash)
            .limit(1)
            .execute()
        )
        return resp.data[0] if resp.data else None
    except Exception as e:
        print(f"Duplicate check skipped: {e}")
        return None


def get_detections_nearby(
    lat: float,
    lng: float,
    radius_km: float = 5.0,
    max_age_days: int = 14,
    active_only: bool = True,
) -> list:
    """
    Get active detections within radius_km of (lat, lng) from the last 14 days.
    Uses PostGIS RPC first, or falls back to Haversine distance in Python.
    """
    sb            = get_supabase()
    radius_meters = radius_km * 1000
    cutoff_dt     = datetime.now(timezone.utc) - timedelta(days=max_age_days)
    cutoff_iso    = cutoff_dt.isoformat()

    try:
        # Query nearby detections via PostGIS function
        resp    = sb.rpc(
            "get_nearby_detections",
            {"user_lat": lat, "user_lng": lng, "radius_m": radius_meters},
        ).execute()
        results = resp.data or []
    except Exception:
        # Fallback: fetch recent rows and filter by distance in Python
        resp    = (
            sb.table("detections")
            .select(
                "id,lat,lng,plant,disease,disease_display,is_healthy,"
                "risk_level,spread_radius,created_at,status"
            )
            .gte("created_at", cutoff_iso)
            .order("created_at", desc=True)
            .limit(200)
            .execute()
        )
        results = []
        for d in (resp.data or []):
            dist = haversine_distance(lat, lng, d["lat"], d["lng"])
            if dist <= radius_km:
                results.append({**d, "distance_km": round(dist, 2)})

    # Filter out expired (>14 days) or resolved detections
    filtered = []
    for d in results:
        created = d.get("created_at", "")
        if created:
            try:
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                if dt < cutoff_dt:
                    continue
            except Exception:
                pass

        if active_only:
            status = d.get("status", "active")
            if status not in ("active", None):
                continue

        filtered.append(d)

    return filtered


def get_user_detections(user_id: str, limit: int = 20, offset: int = 0) -> list:
    """Get a user's scan history ordered from newest to oldest."""
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
    """Get a single detection record by ID."""
    sb   = get_supabase()
    resp = sb.table("detections").select("*").eq("id", detection_id).single().execute()
    return resp.data


def resolve_detection(detection_id: str, user_id: str) -> bool:
    """Mark a detection as resolved if it belongs to the current user."""
    sb   = get_supabase()
    resp = (
        sb.table("detections")
        .update({"status": "resolved"})
        .eq("id",      detection_id)
        .eq("user_id", user_id)
        .execute()
    )
    return len(resp.data) > 0


# Area risk summary

def get_risk_summary(lat: float, lng: float, radius_km: float = 5.0) -> dict:
    """Compute overall risk level, case count, and top disease within 5 km."""
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

    # Average the risk scores of nearby active detections
    level_scores = {"low": 20, "moderate": 55, "high": 85}
    avg_score = sum(level_scores.get(d.get("risk_level", "low"), 20) for d in active) / len(active)

    if avg_score < 35:
        area_risk = "low"
    elif avg_score < 70:
        area_risk = "moderate"
    else:
        area_risk = "high"

    # Find the most frequent disease in the area
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


# User profile queries

def get_user_profile(user_id: str) -> dict | None:
    sb   = get_supabase()
    resp = sb.table("users").select("id,name,location,avatar_url").eq("id", user_id).single().execute()
    return resp.data


def upsert_user_profile(user_id: str, data: dict) -> dict:
    sb   = get_supabase()
    resp = sb.table("users").upsert({"id": user_id, **data}).execute()
    return resp.data[0] if resp.data else {}


# History limit cleanup

def enforce_retention(user_id: str, max_records: int = 50):
    """Keep only the latest 50 scans per user and delete older records."""
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
