"""
Scanom FastAPI Backend — Entry Point
Handles CORS, router registration, and startup events.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

# Import routers
from routers import auth, detect, detections, risk
# Import inference service to load model at startup
from services.inference import inference_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the ML model once at startup instead of per-request."""
    print("=== Scanom API starting ===")
    print(f"  Model loaded: {inference_service.model_loaded}")
    print(f"  Classes: {inference_service.num_classes} classes")
    print(f"  Confidence threshold: {inference_service.threshold}")
    yield
    print("=== Scanom API shutting down ===")


app = FastAPI(
    title="Scanom API",
    description="Plant disease detection and geospatial risk forecasting.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# During development: allow all origins so Expo Go can connect from any device.
# In production: set ALLOWED_ORIGINS in .env to your deployed frontend URL.
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/auth",       tags=["auth"])
app.include_router(detect.router,     prefix="",            tags=["detect"])
app.include_router(detections.router, prefix="/detections", tags=["detections"])
app.include_router(risk.router,       prefix="/risk",       tags=["risk"])


# ── HEALTH CHECK ──────────────────────────────────────────────────────────────
@app.get("/", tags=["health"])
def health_check():
    return {
        "status": "ok",
        "service": "Scanom API",
        "model_loaded": inference_service.model_loaded,
        "classes": inference_service.num_classes,
    }
