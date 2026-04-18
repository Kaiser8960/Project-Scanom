"""
Detect router — POST /detect
Main endpoint: image → inference → weather → fuzzy logic → AI → save → return result.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from database.supabase_client import verify_token
from database.queries import save_detection, get_detections_nearby, enforce_retention
from services.inference import inference_service
from services.fuzzy_engine import compute_risk
from services.weather import get_weather
from services.ai_explainer import get_disease_explanation
from utils.image_processing import decode_and_preprocess
from utils.class_utils import extract_plant_and_disease, get_display_name, is_healthy

router = APIRouter()


class DetectRequest(BaseModel):
    image_base64: str           # Base64-encoded leaf image (or data URI)
    lat:          float         # User's current latitude
    lng:          float         # User's current longitude


@router.post("/detect")
async def detect(
    req:           DetectRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Full detection pipeline:
    1. Verify auth token
    2. Preprocess image → TFLite/Keras inference
    3. Fetch Open-Meteo weather
    4. Query nearby detections (for density)
    5. Run Mamdani fuzzy logic → risk score + spread radius
    6. Call Gemini for AI disease explanation
    7. Save record to Supabase
    8. Enforce 50-scan retention window
    9. Return full result JSON
    """

    # ── 1. AUTH ───────────────────────────────────────────────────────────────
    user = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        user  = verify_token(token)
    # Allow unauthenticated scans but won't save to history

    # ── 2. INFERENCE ──────────────────────────────────────────────────────────
    try:
        image_array = decode_and_preprocess(req.image_base64)
        prediction  = inference_service.predict(image_array)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Image processing failed: {e}")

    # Low confidence → return rejection immediately
    if not prediction["valid"]:
        return {
            "valid":      False,
            "confidence": prediction["confidence"],
            "message":    prediction["message"],
        }

    class_name   = prediction["class_name"]
    confidence   = prediction["confidence"]
    plant, disease = extract_plant_and_disease(class_name)
    display_name   = get_display_name(class_name)
    healthy        = is_healthy(class_name)

    # Healthy plants: return early with minimal risk info
    if healthy:
        return {
            "valid":           True,
            "disease":         class_name,
            "disease_display": display_name,
            "plant":           plant,
            "confidence":      confidence,
            "is_healthy":      True,
            "risk_level":      "none",
            "risk_score":      0.0,
            "spread_radius":   0,
            "explanation":     {
                "overview":    f"This {plant} plant appears healthy. No disease detected.",
                "causes":      "No disease detected at this time.",
                "prevention":  ["Continue regular monitoring.", "Maintain proper nutrition.", "Ensure adequate water and drainage."],
                "treatment":   ["No treatment required."],
                "severity":    "none",
            },
        }

    # ── 3. WEATHER ────────────────────────────────────────────────────────────
    weather = await get_weather(req.lat, req.lng)

    # ── 4. NEARBY DETECTIONS (for density input) ───────────────────────────
    nearby      = get_detections_nearby(req.lat, req.lng, radius_km=5.0)
    active      = [d for d in nearby if not d.get("is_healthy", False)]
    density     = min(len(active), 10)

    # Days since earliest nearby detection
    if active:
        dates = [d["created_at"] for d in active if d.get("created_at")]
        if dates:
            oldest = min(dates)
            try:
                oldest_dt = datetime.fromisoformat(oldest.replace("Z", "+00:00"))
                days_val  = (datetime.now(timezone.utc) - oldest_dt).days
            except Exception:
                days_val = 0
        else:
            days_val = 0
    else:
        days_val = 0

    # ── 5. FUZZY LOGIC ────────────────────────────────────────────────────────
    fuzzy_result = compute_risk(
        density_val  = density,
        humidity_val = weather["humidity"],
        temp_val     = weather["temperature"],
        days_val     = days_val,
        disease_class = class_name,
    )

    # ── 6. AI EXPLANATION ─────────────────────────────────────────────────────
    explanation = await get_disease_explanation(
        disease_class = class_name,
        plant         = plant,
        confidence    = confidence,
        risk_level    = fuzzy_result["risk_level"],
        humidity      = weather["humidity"],
        temperature   = weather["temperature"],
    )

    # ── 7. SAVE TO SUPABASE ───────────────────────────────────────────────────
    detection_id = None
    if user:
        record = {
            "user_id":        user["id"],
            "lat":            req.lat,
            "lng":            req.lng,
            "plant":          plant,
            "disease":        class_name,
            "disease_display": display_name,
            "is_healthy":     False,
            "confidence":     confidence,
            "risk_level":     fuzzy_result["risk_level"],
            "risk_score":     fuzzy_result["risk_score"],
            "spread_radius":  fuzzy_result["spread_radius"],
            "humidity":       weather["humidity"],
            "temperature":    weather["temperature"],
            "ai_overview":    explanation.get("overview"),
            "ai_causes":      explanation.get("causes"),
            "ai_prevention":  explanation.get("prevention"),
            "ai_treatment":   explanation.get("treatment"),
            "ai_severity":    explanation.get("severity"),
        }
        saved        = save_detection(record)
        detection_id = saved.get("id")

        # ── 8. RETENTION ──────────────────────────────────────────────────────
        enforce_retention(user["id"], max_records=50)

    # ── 9. RETURN RESULT ──────────────────────────────────────────────────────
    return {
        "valid":           True,
        "disease":         class_name,
        "disease_display": display_name,
        "plant":           plant,
        "confidence":      confidence,
        "is_healthy":      False,
        "risk_level":      fuzzy_result["risk_level"],
        "risk_score":      fuzzy_result["risk_score"],
        "spread_radius":   fuzzy_result["spread_radius"],
        "weather":         {"humidity": weather["humidity"], "temperature": weather["temperature"]},
        "explanation":     explanation,
        "detection_id":    detection_id,
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "lat":             req.lat,
        "lng":             req.lng,
    }
