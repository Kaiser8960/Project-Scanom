"""
export_tflite.py — Standalone TFLite export for Scanom EfficientNetV2B0 model.

Run this INSTEAD of retraining if you only need to fix the TFLite export.
Loads best_model.keras from model_output/ and converts it correctly.

Usage (in Ubuntu WSL2):
    source ~/scanom-ml-env/bin/activate
    python3 "/mnt/c/Users/Jim Dejito/OneDrive/Desktop/Jim Codes/Thesis/Scanom/ml/export_tflite.py"
"""

import tensorflow as tf
import os

# ── CONFIG ──────────────────────────────────────────────────────────────────
MODEL_PATH  = "/mnt/c/Users/Jim Dejito/OneDrive/Desktop/Jim Codes/Thesis/Scanom/model_output/best_model.keras"
OUTPUT_DIR  = "/mnt/c/Users/Jim Dejito/OneDrive/Desktop/Jim Codes/Thesis/Scanom/model_output"
OUTPUT_FILE = "efficientnetv2b0.tflite"

# Allow GPU memory growth (prevents reserving all VRAM upfront)
gpus = tf.config.list_physical_devices('GPU')
for gpu in gpus:
    tf.config.experimental.set_memory_growth(gpu, True)

# ── LOAD SAVED MODEL ────────────────────────────────────────────────────────
print(f"Loading model from: {MODEL_PATH}")
model = tf.keras.models.load_model(MODEL_PATH)
print(f"Model loaded. Input shape: {model.input_shape}")
print(f"Model loaded. Output shape: {model.output_shape}")

# ── CONVERT TO TFLITE ───────────────────────────────────────────────────────
# EfficientNetV2B0 with include_preprocessing=True uses tf.Mul, tf.Sub,
# tf.RealDiv, tf.Conv2D, tf.Sigmoid — these are NOT standard TFLite builtins.
# SELECT_TF_OPS enables the Flex delegate to handle them via full TF runtime.
print("\nConverting to TFLite with SELECT_TF_OPS (Flex delegate)...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_ops = [
    tf.lite.OpsSet.TFLITE_BUILTINS,   # standard TFLite ops
    tf.lite.OpsSet.SELECT_TF_OPS      # Flex delegate for EfficientNet preprocessing ops
]
converter._experimental_lower_tensor_list_ops = False

tflite_model = converter.convert()

# ── SAVE ────────────────────────────────────────────────────────────────────
tflite_path = os.path.join(OUTPUT_DIR, OUTPUT_FILE)
with open(tflite_path, "wb") as f:
    f.write(tflite_model)

size_mb = os.path.getsize(tflite_path) / (1024 * 1024)
print(f"\n✓ TFLite model saved:  {tflite_path}")
print(f"✓ TFLite file size:    {size_mb:.1f} MB")
print("\nNext steps:")
print("  1. Copy efficientnetv2b0.tflite to scanom-backend/model/")
print("  2. Copy class_names.json to scanom-backend/model/")
print("  3. Update inference.py to load 'efficientnetv2b0.tflite'")
