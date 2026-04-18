"""
Weather service — fetches current conditions from Open-Meteo API.
Free, no API key required, no rate limit for reasonable usage.
"""

import httpx
import os

BASE_URL             = "https://api.open-meteo.com/v1/forecast"
FALLBACK_HUMIDITY    = float(os.getenv("FALLBACK_HUMIDITY",    "70.0"))
FALLBACK_TEMPERATURE = float(os.getenv("FALLBACK_TEMPERATURE", "29.0"))


async def get_weather(lat: float, lng: float) -> dict:
    """
    Fetch current humidity, temperature, and wind speed for a location.
    Falls back to Cebu averages if Open-Meteo is unreachable.
    """
    params = {
        "latitude":  lat,
        "longitude": lng,
        "current":   "temperature_2m,relative_humidity_2m,wind_speed_10m",
        "timezone":  "auto",
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(BASE_URL, params=params)
            resp.raise_for_status()
            data    = resp.json()
            current = data.get("current", {})
            return {
                "humidity":    float(current.get("relative_humidity_2m", FALLBACK_HUMIDITY)),
                "temperature": float(current.get("temperature_2m",       FALLBACK_TEMPERATURE)),
                "wind_speed":  float(current.get("wind_speed_10m",       0.0)),
                "source":      "open-meteo",
            }
    except Exception as e:
        print(f"Open-Meteo error ({lat},{lng}): {e} — using fallback values")
        return {
            "humidity":    FALLBACK_HUMIDITY,
            "temperature": FALLBACK_TEMPERATURE,
            "wind_speed":  0.0,
            "source":      "fallback",
        }
