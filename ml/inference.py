import tensorflow as tf
import numpy as np
from PIL import Image
import io
import base64
import json

# Load once at startup
interpreter = tf.lite.Interpreter(model_path="model/resnet50.tflite")
interpreter.allocate_tensors()

input_details  = interpreter.get_input_details()
output_details = interpreter.get_output_details()

with open("model/class_names.json") as f:
    CLASS_NAMES = json.load(f)

CONFIDENCE_THRESHOLD = 0.70

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)    # add batch dimension
    return arr

def predict(image_bytes: bytes) -> dict:
    tensor = preprocess_image(image_bytes)

    interpreter.set_tensor(input_details[0]['index'], tensor)
    interpreter.invoke()

    predictions = interpreter.get_tensor(output_details[0]['index'])[0]
    predictions = list(predictions)

    max_idx    = predictions.index(max(predictions))
    confidence = predictions[max_idx]
    class_name = CLASS_NAMES[max_idx]

    if confidence < CONFIDENCE_THRESHOLD:
        return {
            "valid":      False,
            "confidence": float(confidence),
        }

    parts      = class_name.split("_", 1)
    plant      = parts[0]
    disease    = parts[1]
    is_healthy = disease == "healthy"

    return {
        "valid":      True,
        "class_name": class_name,
        "plant":      plant,
        "disease":    disease,
        "is_healthy": is_healthy,
        "confidence": float(confidence),
    }

def decode_base64_image(b64_string: str) -> bytes:
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    return base64.b64decode(b64_string)
