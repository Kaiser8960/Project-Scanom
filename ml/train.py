import tensorflow as tf
from tensorflow.keras import layers, optimizers, callbacks
import numpy as np
import json
import os
from sklearn.utils.class_weight import compute_class_weight

# ── MIXED PRECISION + GPU MEMORY CONFIG ────────────────────────
# float16 activations halve VRAM usage. RTX 4060 Tensor Cores accelerate float16.
tf.keras.mixed_precision.set_global_policy('mixed_float16')
print("Mixed precision enabled: float16 activations, float32 weights")

# Allow GPU to allocate memory incrementally instead of all at once.
# Prevents CUDA from reserving the full 5.5GB upfront.
gpus = tf.config.list_physical_devices('GPU')
for gpu in gpus:
    tf.config.experimental.set_memory_growth(gpu, True)

# ── CONFIG ─────────────────────────────────────────────────
# IMPORTANT: Dataset lives on the Linux filesystem (NOT /mnt/c/).
# Before running, copy the dataset once:
#   cp -r "/mnt/c/Users/Jim Dejito/OneDrive/Desktop/Jim Codes/Thesis/Scanom/dataset" ~/scanom-dataset
DATASET_DIR  = "/home/jim_dejito/scanom-dataset"

# model_output still writes to Windows so you can view it in VS Code
OUTPUT_DIR   = "/mnt/c/Users/Jim Dejito/OneDrive/Desktop/Jim Codes/Thesis/Scanom/model_output"

IMG_SIZE     = (224, 224)
BATCH_SIZE   = 16           # RTX 4060 Laptop (8GB VRAM) OOMs at 32 — keep at 16
EPOCHS_HEAD  = 20           # Phase 1: train only new head layers
EPOCHS_FINE  = 60           # Phase 2: EarlyStopping will cap this
LR_HEAD      = 1e-3         # Phase 1 learning rate
LR_FINE      = 1e-4         # Phase 2: higher than ResNet because EfficientNet is more regularized
NUM_CLASSES  = 10
MAX_CLASS_WEIGHT = 3.0      # Cap extreme weights — uncapped 6.3x caused 0.30 precision on panama_wilt

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── DATA AUGMENTATION ───────────────────────────────────────
# Applied ONLY to training data.
# Images are in [0, 255] range — EfficientNetV2B0 handles own normalization.
augmentation = tf.keras.Sequential([
    layers.RandomFlip("horizontal_and_vertical"),
    layers.RandomRotation(0.2),
    layers.RandomZoom(0.15),
    layers.RandomBrightness(0.15),
    layers.RandomContrast(0.15),
], name="augmentation")

# ── LOAD DATASETS ───────────────────────────────────────────
train_ds = tf.keras.utils.image_dataset_from_directory(
    f"{DATASET_DIR}/train",
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="categorical",
    shuffle=True,
    seed=42
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    f"{DATASET_DIR}/val",
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="categorical",
    shuffle=False
)

test_ds = tf.keras.utils.image_dataset_from_directory(
    f"{DATASET_DIR}/test",
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="categorical",
    shuffle=False
)

# Save class names
class_names = train_ds.class_names
print(f"Classes ({len(class_names)}): {class_names}")

with open(f"{OUTPUT_DIR}/class_names.json", "w") as f:
    json.dump(class_names, f, indent=2)

# ── CLASS WEIGHTS ────────────────────────────────────────────
# Capped at MAX_CLASS_WEIGHT=3.0.
# Previously panama_wilt was 6.3x which caused extreme over-recall (precision=0.30).
y_labels = []
for idx, cname in enumerate(class_names):
    class_dir = os.path.join(DATASET_DIR, "train", cname)
    count = len([f for f in os.listdir(class_dir)
                 if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    y_labels.extend([idx] * count)

y_labels    = np.array(y_labels)
weights_arr = compute_class_weight('balanced',
                                   classes=np.unique(y_labels),
                                   y=y_labels)
class_weights = {i: min(float(w), MAX_CLASS_WEIGHT) for i, w in enumerate(weights_arr)}
print("\nClass weights applied (capped at 3.0):")
for i, cname in enumerate(class_names):
    print(f"  [{i}] {cname:35s}: {class_weights[i]:.4f}")

# ── DATA PIPELINE ───────────────────────────────────────────
# NO .cache() -- with 16k images at 224x224, in-memory cache pins ~4GB of
# host RAM which saturates CUDA pinned memory and causes OOM.
# Data lives on Linux SSD so per-epoch reads are fast enough without caching.
train_ds = (
    train_ds
    .map(lambda x, y: (augmentation(x, training=True), y),
         num_parallel_calls=tf.data.AUTOTUNE)
    .prefetch(tf.data.AUTOTUNE)
)

val_ds = (
    val_ds
    .prefetch(tf.data.AUTOTUNE)
)

test_ds = (
    test_ds
    .prefetch(tf.data.AUTOTUNE)
)

# ── BUILD MODEL (PHASE 1: HEAD ONLY) ───────────────────────
# EfficientNetV2B0 reasons:
#   - Lighter than ResNet50 (7M vs 25M params) → less overfitting on 16k images
#   - include_preprocessing=True → handles its own [0,255] normalization
#   - Consistently reaches 90-95%+ on plant disease datasets in literature
base_model = tf.keras.applications.EfficientNetV2B0(
    weights="imagenet",
    include_top=False,
    include_preprocessing=True,     # model normalizes [0-255] internally
    input_shape=(224, 224, 3)
)
base_model.trainable = False        # freeze all base layers for Phase 1

inputs  = tf.keras.Input(shape=(224, 224, 3))
x       = base_model(inputs, training=False)
x       = layers.GlobalAveragePooling2D()(x)
x       = layers.Dropout(0.3)(x)
x       = layers.Dense(256, activation="relu")(x)
x       = layers.BatchNormalization()(x)
x       = layers.Dropout(0.4)(x)
# IMPORTANT: output layer must be float32 for numerical stability with mixed precision
outputs = layers.Dense(NUM_CLASSES, activation="softmax", dtype="float32")(x)

model = tf.keras.Model(inputs, outputs)

model.compile(
    optimizer=optimizers.Adam(learning_rate=LR_HEAD),
    loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
    metrics=["accuracy"]
)

# ── CALLBACKS ───────────────────────────────────────────────
cb_early_stop = callbacks.EarlyStopping(
    monitor="val_accuracy",
    patience=10,
    restore_best_weights=True,
    verbose=1
)

cb_reduce_lr = callbacks.ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.5,
    patience=4,
    min_lr=1e-7,
    verbose=1
)

cb_checkpoint = callbacks.ModelCheckpoint(
    filepath=f"{OUTPUT_DIR}/best_model.keras",
    monitor="val_accuracy",
    save_best_only=True,
    verbose=1
)

# ── PHASE 1: TRAIN HEAD ─────────────────────────────────────
print("\n=== PHASE 1: Training classification head ===")
history_phase1 = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS_HEAD,
    callbacks=[cb_early_stop, cb_reduce_lr, cb_checkpoint],
    class_weight=class_weights
)

# ── PHASE 2: FINE-TUNE DEEPER LAYERS ────────────────────────
print("\n=== PHASE 2: Fine-tuning deeper EfficientNetV2B0 layers ===")

# EfficientNetV2B0 has ~200 layers — unfreeze last 40% (~80 layers)
base_model.trainable = True
total_layers = len(base_model.layers)
freeze_until = int(total_layers * 0.6)   # freeze first 60%, fine-tune last 40%
for layer in base_model.layers[:freeze_until]:
    layer.trainable = False

print(f"  Fine-tuning last {total_layers - freeze_until} of {total_layers} base layers")

model.compile(
    optimizer=optimizers.Adam(learning_rate=LR_FINE),
    loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
    metrics=["accuracy"]
)

history_phase2 = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS_FINE,
    callbacks=[cb_early_stop, cb_reduce_lr, cb_checkpoint],
    class_weight=class_weights
)

# ── EVALUATE ON TEST SET ────────────────────────────────────
print("\n=== EVALUATION ON TEST SET ===")
test_loss, test_accuracy = model.evaluate(test_ds)
print(f"Test Accuracy: {test_accuracy:.4f} ({test_accuracy*100:.2f}%)")
print(f"Test Loss:     {test_loss:.4f}")

# ── F1 SCORE ────────────────────────────────────────────────
from sklearn.metrics import classification_report

y_true = np.concatenate([y for x, y in test_ds], axis=0)
y_true = np.argmax(y_true, axis=1)
y_pred = np.argmax(model.predict(test_ds), axis=1)

report = classification_report(y_true, y_pred, target_names=class_names)
print("\nClassification Report:")
print(report)

with open(f"{OUTPUT_DIR}/classification_report.txt", "w") as f:
    f.write(f"Test Accuracy: {test_accuracy:.4f}\n\n")
    f.write(report)

print(f"\nReport saved to {OUTPUT_DIR}/classification_report.txt")

# ── EXPORT TO TFLITE ─────────────────────────────────────────────
print("\n=== EXPORTING TO TFLITE ===")
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]

# EfficientNetV2B0 with include_preprocessing=True contains tf.Mul, tf.Sub,
# tf.RealDiv, tf.Sigmoid ops that are not in the standard TFLite op set.
# SELECT_TF_OPS enables the Flex delegate to run these ops via full TF.
# This is required for any Keras model using EfficientNetV2B0 include_preprocessing.
converter.target_spec.supported_ops = [
    tf.lite.OpsSet.TFLITE_BUILTINS,   # standard TFLite ops
    tf.lite.OpsSet.SELECT_TF_OPS      # TF Flex delegate for unsupported ops
]
converter._experimental_lower_tensor_list_ops = False

tflite_model = converter.convert()

tflite_path = f"{OUTPUT_DIR}/efficientnetv2b0.tflite"
with open(tflite_path, "wb") as f:
    f.write(tflite_model)

size_mb = os.path.getsize(tflite_path) / (1024 * 1024)
print(f"TFLite model saved: {tflite_path}")
print(f"TFLite file size:   {size_mb:.1f} MB")
print("\nDone! Copy efficientnetv2b0.tflite and class_names.json to scanom-backend/model/")
