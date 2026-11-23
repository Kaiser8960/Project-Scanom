"""
Main detection endpoint (POST /detect).
Runs image classification, weather lookup, fuzzy risk calculation, and Gemini AI guidance.
"""

from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from database.supabase_client import verify_token
from database.queries import save_detection, get_detections_nearby, enforce_retention, find_duplicate_detection
from services.inference import inference_service
from services.fuzzy_engine import compute_risk
from services.weather import get_weather
from services.ai_explainer import get_disease_explanation
from utils.image_processing import decode_and_preprocess, compute_image_hash
from utils.class_utils import extract_plant_and_disease, get_display_name, is_healthy
from utils.rate_limit import limiter, LIMIT_DETECT
from utils.validation import IMAGE_B64_MAX

router = APIRouter()


class DetectRequest(BaseModel):
    image_base64: str = Field(max_length=IMAGE_B64_MAX)
    lat:          float = Field(ge=-90,  le=90)
    lng:          float = Field(ge=-180, le=180)


@router.post("/detect")
@limiter.limit(LIMIT_DETECT)
async def detect(
    request:       Request,
    req:           DetectRequest,
    authorization: Optional[str] = Header(None),
):
    """Run the full leaf detection and spatial risk pipeline."""

    # Step 1: Check user token if provided
    user = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            user = verify_token(f"Bearer {token}")
        except Exception:
            user = None

    # Step 2: Check if this user already scanned the exact same image
    image_hash = None
    try:
        image_hash = compute_image_hash(req.image_base64)
    except Exception:
        image_hash = None
    if user and image_hash:
        existing = find_duplicate_detection(user, image_hash)
        if existing:
            return {
                "valid":           True,
                "duplicate":       True,
                "disease":         existing.get("disease"),
                "disease_display": existing.get("disease_display"),
                "plant":           existing.get("plant"),
                "confidence":      existing.get("confidence"),
                "is_healthy":      existing.get("is_healthy", False),
                "risk_level":      existing.get("risk_level"),
                "risk_score":      existing.get("risk_score"),
                "spread_radius":   existing.get("spread_radius"),
                "weather":         {"humidity": existing.get("humidity"), "temperature": existing.get("temperature")},
                "explanation": {
                    "overview":   existing.get("ai_overview"),
                    "causes":     existing.get("ai_causes"),
                    "prevention": existing.get("ai_prevention"),
                    "treatment":  existing.get("ai_treatment"),
                    "severity":   existing.get("ai_severity"),
                },
                "detection_id":    existing.get("id"),
                "timestamp":       existing.get("created_at"),
                "lat":             existing.get("lat"),
                "lng":             existing.get("lng"),
            }

    # Step 3: Preprocess image and run EfficientNetV2B0 model inference
    try:
        image_array = decode_and_preprocess(req.image_base64)
        prediction  = inference_service.predict(image_array)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Image processing failed: {e}")

    # Return rejection if confidence is below the 0.70 threshold
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

    # Return early if the leaf is healthy (no risk or weather lookup needed)
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

    # Step 4: Get current weather at the scan coordinates
    weather = await get_weather(req.lat, req.lng)

    # Step 5: Count nearby active disease cases within 5 km
    nearby      = get_detections_nearby(req.lat, req.lng, radius_km=5.0)
    active      = [d for d in nearby if not d.get("is_healthy", False)]
    density     = min(len(active), 10)

    # Find how many days ago the oldest nearby case was detected
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

    # Step 6: Compute risk level and spread radius using Mamdani fuzzy logic
    fuzzy_result = compute_risk(
        density_val  = density,
        humidity_val = weather["humidity"],
        temp_val     = weather["temperature"],
        days_val     = days_val,
        disease_class = class_name,
    )

    # Step 7: Generate treatment and prevention guidance using Gemini AI
    explanation = await get_disease_explanation(
        disease_class = class_name,
        plant         = plant,
        confidence    = confidence,
        risk_level    = fuzzy_result["risk_level"],
        humidity      = weather["humidity"],
        temperature   = weather["temperature"],
    )

    # Step 8: Save the detection to Supabase and enforce the 50-scan limit
    detection_id = None
    if user:
        record = {
            "user_id":        user,
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
            "image_hash":     image_hash,
        }
        saved        = save_detection(record)
        detection_id = saved.get("id")

        enforce_retention(user, max_records=50)

    # Step 9: Return complete scan response to the app
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
