"""Helper functions to format model class names into plant types and display labels."""

# Display names for the 10 supported classes
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
    """Split a class label like 'tomato_early_blight' into ('tomato', 'early_blight')."""
    parts = class_name.split("_", 1)
    plant   = parts[0] if len(parts) > 0 else "unknown"
    disease = parts[1] if len(parts) > 1 else "unknown"
    return plant, disease


def get_display_name(class_name: str) -> str:
    """Return the readable display name for a model class."""
    return CLASS_DISPLAY_MAP.get(class_name, class_name.replace("_", " ").title())


def is_healthy(class_name: str) -> bool:
    """Return True if the class is a healthy plant."""
    return class_name.endswith("_healthy")
