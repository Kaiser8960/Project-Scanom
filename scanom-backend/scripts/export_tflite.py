"""
Re-export EfficientNetV2B0 to TFLite WITHOUT SELECT_TF_OPS.

Run this in WSL2 from the scanom-backend directory:
    python scripts/export_tflite.py

The new model/efficientnetv2b0.tflite will replace the old one.
"""

import tensorflow as tf
from pathlib import Path

KERAS_PATH  = Path("model/best_model.keras")
TFLITE_PATH = Path("model/efficientnetv2b0.tflite")

print("Loading Keras model...")
model = tf.keras.models.load_model(str(KERAS_PATH))
print(f"  Input shape:  {model.input_shape}")
print(f"  Output shape: {model.output_shape}")

print("\nConverting to TFLite (standard ops only — no SELECT_TF_OPS)...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
# NOTE: Do NOT add SELECT_TF_OPS here — that's what caused the Railway failure

try:
    tflite_model = converter.convert()
    TFLITE_PATH.write_bytes(tflite_model)
    size_mb = TFLITE_PATH.stat().st_size / (1024 * 1024)
    print(f"\n  Saved: {TFLITE_PATH}  ({size_mb:.1f} MB)")
    print("  Done. Verify with a quick test before pushing to git.")
except Exception as e:
    print(f"\n  Conversion FAILED: {e}")
    print("  This means the model has layers that don't map to standard TFLite ops.")
    print("  See fallback instructions below.")
    print()
    print("  Fallback: Run with SELECT_TF_OPS + flex delegate fix in inference.py")
