"""
AI Explanation service — calls Gemini 1.5 Flash to generate disease explanations.
Returns structured JSON: overview, causes, prevention tips, treatment steps, severity.
"""

import json
import os
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL",   "gemini-1.5-flash")

if GEMINI_API_KEY:
    _client = genai.Client(api_key=GEMINI_API_KEY)
else:
    print("WARNING: GEMINI_API_KEY not set — AI explanations will use fallback text.")
    _client = None


async def get_disease_explanation(
    disease_class: str,
    plant:         str,
    confidence:    float,
    risk_level:    str,
    humidity:      float,
    temperature:   float,
) -> dict:
    """
    Generate a structured disease explanation using Gemini.
    Falls back to generic text if Gemini is unreachable or API key is missing.
    """
    if not _client:
        return _fallback_explanation(disease_class, plant, risk_level)

    disease_name = disease_class.replace("_", " ").replace(plant, "").strip().title()

    prompt = f"""You are a plant disease expert advising Filipino farmers.
A {plant} plant was diagnosed with "{disease_name}" at {confidence*100:.1f}% confidence.
Current weather: humidity {humidity:.1f}%, temperature {temperature:.1f}°C.
Assessed risk level: {risk_level}.

Respond ONLY with a valid JSON object. No markdown, no backticks, no explanation.
Exact format required:
{{
  "overview": "2-3 sentence overview of this disease",
  "causes": "2-3 sentences on causes and how it spreads",
  "prevention": ["tip 1", "tip 2", "tip 3"],
  "treatment": ["step 1", "step 2", "step 3"],
  "severity": "mild"
}}

severity must be exactly one of: mild | moderate | severe
Keep language simple and practical for farmers in the Philippines."""

    try:
        response = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        text = response.text.strip()

        # Strip markdown code fences if present
        if "```" in text:
            parts = text.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("{"):
                    text = part
                    break
                if part.startswith("json"):
                    text = part[4:].strip()
                    break

        data = json.loads(text)
        # Validate required keys
        required = {"overview", "causes", "prevention", "treatment", "severity"}
        if not required.issubset(data.keys()):
            raise ValueError("Missing keys in Gemini response")
        return data

    except json.JSONDecodeError as e:
        print(f"Gemini JSON parse error: {e}")
        return _fallback_explanation(disease_class, plant, risk_level)
    except Exception as e:
        print(f"Gemini error: {e}")
        return _fallback_explanation(disease_class, plant, risk_level)


def _fallback_explanation(disease_class: str, plant: str, risk_level: str) -> dict:
    """Returns generic explanation when Gemini is unavailable."""
    name = disease_class.replace("_", " ").title()
    severity_map = {"low": "mild", "moderate": "moderate", "high": "severe"}
    return {
        "overview":    f"{name} is a disease affecting {plant} plants. Early detection and treatment is recommended to prevent further spread.",
        "causes":      "This disease can spread through environmental conditions such as high humidity, warm temperatures, and infected plant material.",
        "prevention":  [
            "Monitor plants regularly for early signs of disease.",
            "Maintain proper plant spacing to improve air circulation.",
            "Avoid overhead watering to reduce prolonged leaf wetness.",
        ],
        "treatment":   [
            "Remove and safely dispose of all infected plant material.",
            "Apply appropriate fungicide or bactericide as recommended by local guidelines.",
            "Consult a local agricultural extension officer for specific treatment protocols.",
        ],
        "severity":    severity_map.get(risk_level, "moderate"),
    }
