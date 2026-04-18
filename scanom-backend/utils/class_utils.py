"""Class name utilities — display labels and plant/disease extraction."""

# Human-readable display names for each model class
CLASS_DISPLAY_MAP: dict[str, str] = {
    "banana_cordana":        "Cordana Leaf Spot",
    "banana_healthy":        "Healthy Banana",
    "banana_panama_wilt":    "Panama Wilt",
    "banana_sigatoka":       "Sigatoka",
    "tomato_bacterial_spot": "Bacterial Spot",
    "tomato_early_blight":   "Early Blight",
    "tomato_healthy":        "Healthy Tomato",
    "tomato_late_blight":    "Late Blight",
    "tomato_leaf_mold":      "Leaf Mold",
    "tomato_powdery_mildew": "Powdery Mildew",
}


def extract_plant_and_disease(class_name: str) -> tuple[str, str]:
    """
    Split a class name into plant type and disease identifier.
    'tomato_early_blight' → ('tomato', 'early_blight')
    'banana_healthy'      → ('banana', 'healthy')
    """
    parts = class_name.split("_", 1)
    plant   = parts[0] if len(parts) > 0 else "unknown"
    disease = parts[1] if len(parts) > 1 else "unknown"
    return plant, disease


def get_display_name(class_name: str) -> str:
    """Return the human-readable name for a class. Falls back to title-cased class name."""
    return CLASS_DISPLAY_MAP.get(class_name, class_name.replace("_", " ").title())


def is_healthy(class_name: str) -> bool:
    """Return True if the detected class represents a healthy plant."""
    return class_name.endswith("_healthy")
