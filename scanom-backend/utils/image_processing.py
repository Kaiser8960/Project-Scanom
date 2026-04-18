"""
Image processing utilities — base64 decode and preprocessing for EfficientNetV2B0.

EfficientNetV2B0 was trained with include_preprocessing=True, so the model
handles its own internal normalization from [0, 255] → model range.
We only need to: decode → resize to 224×224 → float32 array.
"""

import base64
import io
import numpy as np
from PIL import Image

TARGET_SIZE = (224, 224)


def decode_and_preprocess(base64_image: str) -> np.ndarray:
    """
    Decode a base64-encoded image and prepare it for model inference.

    Args:
        base64_image: Raw base64 string or data URI (data:image/jpeg;base64,...)

    Returns:
        numpy array of shape (1, 224, 224, 3), dtype float32, pixel values [0.0, 255.0]
        The model's built-in preprocessing layer handles normalization internally.
    """
    # Strip data URI prefix if present (e.g. from expo-image-manipulator)
    if "," in base64_image:
        base64_image = base64_image.split(",", 1)[1]

    # Decode bytes → PIL Image
    image_bytes = base64.b64decode(base64_image)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Resize to model input dimensions
    image = image.resize(TARGET_SIZE, Image.BILINEAR)

    # Convert to numpy float32 — keep [0, 255] range
    arr = np.array(image, dtype=np.float32)

    # Add batch dimension: (224, 224, 3) → (1, 224, 224, 3)
    return np.expand_dims(arr, axis=0)
