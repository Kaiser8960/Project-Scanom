"""
Risk router — GET /risk/summary
Returns disease risk level and dominant disease for a location.
Used by the Map screen header to show area risk context.
"""

from fastapi import APIRouter, HTTPException, Query
from database.queries import get_risk_summary

router = APIRouter()


@router.get("/summary")
async def risk_summary(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
):
    """
    Summarise the disease risk in a 5km area around (lat, lng).
    Returns: area_risk_level, total_cases_nearby, dominant_disease.
    Public endpoint — no auth required (data is aggregated, not user-specific).
    """
    try:
        summary = get_risk_summary(lat, lng)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
