"""
Endpoint for fetching the 5 km area risk summary (GET /risk/summary).
"""

from fastapi import APIRouter, HTTPException, Query
from database.queries import get_risk_summary

router = APIRouter()


@router.get("/summary")
async def risk_summary(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
):
    """Return the overall risk level, active case count, and top disease within 5 km."""
    try:
        summary = get_risk_summary(lat, lng)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
