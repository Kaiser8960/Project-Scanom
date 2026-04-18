"""
Fuzzy Logic Engine — Mamdani FIS for disease risk computation.
Inputs: detection density, humidity, temperature, days since first detection.
Output: risk_score (0-100), risk_level (low/moderate/high), spread_radius (meters).
"""

import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl


# ── DISEASE SPREAD MULTIPLIERS ───────────────────────────────────────────────
# Applied to the base fuzzy spread radius to make it disease-aware.
DISEASE_SPREAD_MULTIPLIER = {
    "tomato_late_blight":    1.5,   # fast  — airborne spores, wind
    "tomato_early_blight":   1.0,   # moderate — soil splash
    "tomato_bacterial_spot": 0.7,   # slow  — contact / insects
    "tomato_leaf_mold":      0.8,   # moderate — high humidity
    "tomato_powdery_mildew": 1.2,   # moderate-fast — airborne
    "tomato_healthy":        0.0,
    "banana_sigatoka":       1.4,   # fast  — wind-dispersed spores
    "banana_panama_wilt":    0.5,   # very slow — soil / root contact
    "banana_cordana":        1.0,   # moderate
    "banana_healthy":        0.0,
}


def _build_fuzzy_system() -> ctrl.ControlSystemSimulation:
    """Build and return a Mamdani FIS simulation. Called once at startup."""

    # ── INPUT UNIVERSES ──────────────────────────────────────────────────────
    density     = ctrl.Antecedent(np.arange(0, 11, 1),   "density")
    humidity    = ctrl.Antecedent(np.arange(0, 101, 1),  "humidity")
    temperature = ctrl.Antecedent(np.arange(0, 41, 1),   "temperature")
    days        = ctrl.Antecedent(np.arange(0, 31, 1),   "days")
    risk        = ctrl.Consequent(np.arange(0, 101, 1),  "risk")

    # ── MEMBERSHIP FUNCTIONS ─────────────────────────────────────────────────
    density["sparse"]      = fuzz.trimf(density.universe,     [0,  0,  3])
    density["moderate"]    = fuzz.trimf(density.universe,     [2,  5,  7])
    density["dense"]       = fuzz.trimf(density.universe,     [5, 10, 10])

    humidity["low"]        = fuzz.trimf(humidity.universe,    [0,   0,  40])
    humidity["medium"]     = fuzz.trimf(humidity.universe,    [30, 55,  75])
    humidity["high"]       = fuzz.trimf(humidity.universe,    [65, 100, 100])

    temperature["cool"]    = fuzz.trimf(temperature.universe, [0,  0,  22])
    temperature["optimal"] = fuzz.trimf(temperature.universe, [18, 27, 33])
    temperature["hot"]     = fuzz.trimf(temperature.universe, [30, 40, 40])

    days["early"]          = fuzz.trimf(days.universe,        [0,  0,  8])
    days["progressing"]    = fuzz.trimf(days.universe,        [5, 13, 18])
    days["established"]    = fuzz.trimf(days.universe,        [14, 30, 30])

    risk["low"]            = fuzz.trimf(risk.universe,        [0,  0,  40])
    risk["moderate"]       = fuzz.trimf(risk.universe,        [25, 50, 75])
    risk["high"]           = fuzz.trimf(risk.universe,        [60, 100, 100])

    # ── RULES (15) ───────────────────────────────────────────────────────────
    rules = [
        # HIGH
        ctrl.Rule(density["dense"]    & humidity["high"]   & temperature["optimal"], risk["high"]),
        ctrl.Rule(density["dense"]    & days["established"],                          risk["high"]),
        ctrl.Rule(density["dense"]    & humidity["high"],                             risk["high"]),
        ctrl.Rule(density["moderate"] & humidity["high"]   & days["established"],    risk["high"]),
        ctrl.Rule(density["dense"]    & temperature["optimal"] & days["progressing"], risk["high"]),
        # MODERATE
        ctrl.Rule(density["moderate"] & humidity["medium"],                           risk["moderate"]),
        ctrl.Rule(density["moderate"] & days["progressing"],                          risk["moderate"]),
        ctrl.Rule(density["sparse"]   & humidity["high"]   & days["established"],    risk["moderate"]),
        ctrl.Rule(density["moderate"] & temperature["optimal"],                       risk["moderate"]),
        ctrl.Rule(density["dense"]    & humidity["low"],                              risk["moderate"]),
        # LOW
        ctrl.Rule(density["sparse"]   & days["early"],                               risk["low"]),
        ctrl.Rule(density["sparse"]   & humidity["low"],                             risk["low"]),
        ctrl.Rule(density["sparse"]   & temperature["cool"],                         risk["low"]),
        ctrl.Rule(density["sparse"]   & humidity["medium"] & days["early"],          risk["low"]),
        ctrl.Rule(density["moderate"] & humidity["low"]    & days["early"],          risk["low"]),
    ]

    system     = ctrl.ControlSystem(rules)
    simulation = ctrl.ControlSystemSimulation(system)
    return simulation


def _compute_spread_radius(risk_score: float, disease_class: str) -> int:
    """Convert a risk score (0-100) to a spread radius in meters, disease-adjusted."""
    if risk_score < 35:
        base = int(50  + (risk_score * 2))
    elif risk_score < 70:
        base = int(200 + (risk_score * 3))
    else:
        base = int(500 + (risk_score * 5))

    multiplier = DISEASE_SPREAD_MULTIPLIER.get(disease_class, 1.0)
    return max(0, int(base * multiplier))


# ── GLOBAL SINGLETON — built once at module import ───────────────────────────
_FUZZY_SIM = _build_fuzzy_system()


def compute_risk(
    density_val:  float,
    humidity_val: float,
    temp_val:     float,
    days_val:     float,
    disease_class: str,
) -> dict:
    """
    Run the Mamdani fuzzy inference system and return risk output.

    Args:
        density_val:   Number of detections within 5km (capped at 10)
        humidity_val:  Relative humidity 0–100%
        temp_val:      Temperature in Celsius 0–40
        days_val:      Days since first detection in the area 0–30
        disease_class: Class name string (e.g. 'tomato_early_blight')

    Returns:
        { risk_score, risk_level, spread_radius }
    """
    _FUZZY_SIM.input["density"]     = min(float(density_val),  10.0)
    _FUZZY_SIM.input["humidity"]    = min(float(humidity_val), 100.0)
    _FUZZY_SIM.input["temperature"] = min(float(temp_val),      40.0)
    _FUZZY_SIM.input["days"]        = min(float(days_val),      30.0)
    _FUZZY_SIM.compute()

    risk_score = float(_FUZZY_SIM.output["risk"])

    if risk_score < 35:
        risk_level = "low"
    elif risk_score < 70:
        risk_level = "moderate"
    else:
        risk_level = "high"

    spread_radius = _compute_spread_radius(risk_score, disease_class)

    return {
        "risk_score":    round(risk_score, 2),
        "risk_level":    risk_level,
        "spread_radius": spread_radius,
    }
