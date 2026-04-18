"""
Inference service — loads the trained EfficientNetV2B0 model.

Server-side inference loads best_model.keras directly via TensorFlow.
TFLite is preserved for potential future on-device deployment.
The model was trained with include_preprocessing=True so raw [0–255]
pixel values are passed directly — no normalization needed here.
"""

import os
import json
import numpy as np
import tensorflow as tf
from pathlib import Path

MODEL_PATH      = os.getenv("MODEL_PATH",       "model/efficientnetv2b0.tflite")
CLASS_NAMES_PATH = os.getenv("CLASS_NAMES_PATH", "model/class_names.json")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.70"))


class InferenceService:
    def __init__(self):
        self.model_loaded   = False
        self.model_type     = None
        self.class_names    = []
        self.num_classes    = 0
        self.threshold      = CONFIDENCE_THRESHOLD
        self._load_class_names()
        self._load_model()

    def _load_class_names(self):
        try:
            with open(CLASS_NAMES_PATH) as f:
                self.class_names = json.load(f)
            self.num_classes = len(self.class_names)
            print(f"  Class names loaded: {self.num_classes} classes")
        except FileNotFoundError:
            print(f"  WARNING: {CLASS_NAMES_PATH} not found — predictions will use class indices.")

    def _load_model(self):
        tflite_path = Path(MODEL_PATH)
        keras_path  = tflite_path.parent / "best_model.keras"

        if tflite_path.exists():
            self._load_tflite(str(tflite_path))
        elif keras_path.exists():
            self._load_keras(str(keras_path))
        else:
            print(f"  WARNING: No model found at {tflite_path} or {keras_path}")
            print("  → Place efficientnetv2b0.tflite OR best_model.keras in scanom-backend/model/")

    def _load_tflite(self, path: str):
        try:
            self.interpreter    = tf.lite.Interpreter(model_path=path)
            self.interpreter.allocate_tensors()
            self.input_details  = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            self.model_type     = "tflite"
            self.model_loaded   = True
            print(f"  TFLite model loaded: {path}")
        except Exception as e:
            print(f"  TFLite load failed: {e} — trying Keras fallback")
            keras_path = str(Path(path).parent / "best_model.keras")
            if Path(keras_path).exists():
                self._load_keras(keras_path)

    def _load_keras(self, path: str):
        try:
            self.keras_model = tf.keras.models.load_model(path)
            self.model_type  = "keras"
            self.model_loaded = True
            print(f"  Keras model loaded: {path}")
        except Exception as e:
            print(f"  Keras load failed: {e}")

    # ── PREDICTION ────────────────────────────────────────────────────────────

    def predict(self, image_array: np.ndarray) -> dict:
        """
        Run inference on a preprocessed image.
        image_array: shape (1, 224, 224, 3), float32, pixels [0.0, 255.0]
        Returns: dict with valid, class_name, confidence
        """
        if not self.model_loaded:
            raise RuntimeError(
                "Model not loaded. Place model files in scanom-backend/model/"
            )
        if self.model_type == "tflite":
            return self._predict_tflite(image_array)
        return self._predict_keras(image_array)

    def _predict_tflite(self, image_array: np.ndarray) -> dict:
        self.interpreter.set_tensor(self.input_details[0]["index"], image_array.astype(np.float32))
        self.interpreter.invoke()
        output = self.interpreter.get_tensor(self.output_details[0]["index"])
        return self._format_output(output[0].tolist())

    def _predict_keras(self, image_array: np.ndarray) -> dict:
        output = self.keras_model.predict(image_array.astype(np.float32), verbose=0)
        return self._format_output(output[0].tolist())

    def _format_output(self, predictions: list) -> dict:
        max_idx    = int(np.argmax(predictions))
        confidence = float(predictions[max_idx])

        if confidence < self.threshold:
            return {
                "valid":      False,
                "confidence": confidence,
                "message":    "Could not identify a tomato or banana leaf with sufficient confidence.",
            }

        class_name = (
            self.class_names[max_idx]
            if self.class_names
            else f"class_{max_idx}"
        )
        return {
            "valid":            True,
            "class_name":       class_name,
            "confidence":       confidence,
            "all_predictions":  predictions,
        }


# ── SINGLETON — loaded once at FastAPI startup ─────────────────────────────
inference_service = InferenceService()
