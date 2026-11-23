"""
Image decoding, hashing, and resizing (224x224) for EfficientNetV2B0 inference.
"""

import base64
import hashlib
import io
import numpy as np
from PIL import Image

TARGET_SIZE = (224, 224)


def compute_image_hash(base64_image: str) -> str:
    """Compute SHA-256 hash of the image bytes to detect duplicate scans."""
    if "," in base64_image:
        base64_image = base64_image.split(",", 1)[1]
    return hashlib.sha256(base64.b64decode(base64_image)).hexdigest()


def decode_and_preprocess(base64_image: str) -> np.ndarray:
    """Decode base64 image, resize to 224x224 RGB, and return a (1, 224, 224, 3) float32 array."""
    # Remove data URI prefix if present
    if "," in base64_image:
        base64_image = base64_image.split(",", 1)[1]

    # Decode base64 bytes to RGB PIL image
    image_bytes = base64.b64decode(base64_image)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Resize to 224x224
    image = image.resize(TARGET_SIZE, Image.BILINEAR)

    # Convert to float32 array (EfficientNetV2B0 normalizes [0, 255] internally)
    arr = np.array(image, dtype=np.float32)

    # Add batch dimension: (1, 224, 224, 3)
    return np.expand_dims(arr, axis=0)
