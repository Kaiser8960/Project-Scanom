"""
Mamdani Fuzzy Logic Engine for calculating disease spread risk and radius.
Inputs: nearby case density, humidity, temperature, and days since oldest detection.
Outputs: risk_score (0-100), risk_level (low/moderate/high), and spread_radius (meters).
"""

import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl


# Multipliers that scale the base spread radius depending on how each disease spreads
DISEASE_SPREAD_MULTIPLIER = {
    "tomato_late_blight":    1.5,   # fast: airborne spores
    "tomato_early_blight":   1.0,   # moderate: soil splash
    "tomato_bacterial_spot": 0.7,   # slow: contact or insects
    "tomato_leaf_mold":      0.8,   # moderate: high humidity
    "tomato_powdery_mildew": 1.2,   # moderate-fast: airborne
    "tomato_healthy":        0.0,
    "banana_sigatoka":       1.4,   # fast: wind-borne spores
    "banana_panama_wilt":    0.5,   # slow: soil and root contact
    "banana_cordana":        1.0,   # moderate
    "banana_healthy":        0.0,
}


def _build_fuzzy_system() -> ctrl.ControlSystem:
    """Define fuzzy variables, triangular membership functions, and 15 Mamdani rules."""

    # Input and output ranges
    density     = ctrl.Antecedent(np.arange(0, 11, 1),   "density")
    humidity    = ctrl.Antecedent(np.arange(0, 101, 1),  "humidity")
    temperature = ctrl.Antecedent(np.arange(0, 41, 1),   "temperature")
    days        = ctrl.Antecedent(np.arange(0, 31, 1),   "days")
    risk        = ctrl.Consequent(np.arange(0, 101, 1),  "risk")

    # Membership functions
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

    # 15 fuzzy inference rules
    rules = [
        # High risk rules
        ctrl.Rule(density["dense"]    & humidity["high"]   & temperature["optimal"], risk["high"]),
        ctrl.Rule(density["dense"]    & days["established"],                          risk["high"]),
        ctrl.Rule(density["dense"]    & humidity["high"],                             risk["high"]),
        ctrl.Rule(density["moderate"] & humidity["high"]   & days["established"],    risk["high"]),
        ctrl.Rule(density["dense"]    & temperature["optimal"] & days["progressing"], risk["high"]),
        # Moderate risk rules
        ctrl.Rule(density["moderate"] & humidity["medium"],                           risk["moderate"]),
        ctrl.Rule(density["moderate"] & days["progressing"],                          risk["moderate"]),
        ctrl.Rule(density["sparse"]   & humidity["high"]   & days["established"],    risk["moderate"]),
        ctrl.Rule(density["moderate"] & temperature["optimal"],                       risk["moderate"]),
        ctrl.Rule(density["dense"]    & humidity["low"],                              risk["moderate"]),
        # Low risk rules
        ctrl.Rule(density["sparse"]   & days["early"],                               risk["low"]),
        ctrl.Rule(density["sparse"]   & humidity["low"],                             risk["low"]),
        ctrl.Rule(density["sparse"]   & temperature["cool"],                         risk["low"]),
        ctrl.Rule(density["sparse"]   & humidity["medium"] & days["early"],          risk["low"]),
        ctrl.Rule(density["moderate"] & humidity["low"]    & days["early"],          risk["low"]),
    ]

    return ctrl.ControlSystem(rules)


def _compute_spread_radius(risk_score: float, disease_class: str) -> int:
    """Calculate the map risk circle radius in meters from the risk score and disease multiplier."""
    if risk_score < 35:
        base = int(50  + (risk_score * 2))
    elif risk_score < 70:
        base = int(200 + (risk_score * 3))
    else:
        base = int(500 + (risk_score * 5))

    multiplier = DISEASE_SPREAD_MULTIPLIER.get(disease_class, 1.0)
    return max(0, int(base * multiplier))


# Build the fuzzy rule system once at import time
_FUZZY_SYSTEM = _build_fuzzy_system()


def compute_risk(
    density_val:  float,
    humidity_val: float,
    temp_val:     float,
    days_val:     float,
    disease_class: str,
) -> dict:
    """Evaluate the fuzzy system for a scan and return risk score, level, and spread radius."""
    sim = ctrl.ControlSystemSimulation(_FUZZY_SYSTEM)

    # Keep inputs inside valid bounds before running defuzzification
    sim.input["density"]     = float(np.clip(density_val,  0.01,  9.99))
    sim.input["humidity"]    = float(np.clip(humidity_val, 0.01, 99.99))
    sim.input["temperature"] = float(np.clip(temp_val,     0.01, 39.99))
    sim.input["days"]        = float(np.clip(days_val,     0.01, 29.99))

    try:
        sim.compute()
        risk_score = float(sim.output["risk"])
    except (KeyError, Exception) as e:
        # Default to score 35 if no fuzzy rule fires
        print(f"  [Fuzzy] WARNING: compute() failed ({e}) — using fallback risk_score=35")
        risk_score = 35.0

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
