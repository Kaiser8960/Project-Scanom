import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, callbacks
import numpy as np
import json
import os
from sklearn.utils.class_weight import compute_class_weight

# ── CONFIG ─────────────────────────────────────────────────
# WSL2 path (use this when running from Ubuntu terminal)
BASE         = "/mnt/c/Users/Jim Dejito/OneDrive/Desktop/Jim Codes/Thesis/Scanom"
# Windows path (use this if ever running from native Windows Python)
# BASE       = "C:/Users/Jim Dejito/OneDrive/Desktop/Jim Codes/Thesis/Scanom"
DATASET_DIR  = f"{BASE}/dataset"
OUTPUT_DIR   = f"{BASE}/model_output"
IMG_SIZE     = (224, 224)
BATCH_SIZE   = 16       # Reduced from 32 — RTX 4060 Laptop (8GB) OOMs at 32 with ResNet50
EPOCHS_HEAD  = 20       # Phase 1: train only new head layers
EPOCHS_FINE  = 30       # Phase 2: fine-tune deeper layers
LR_HEAD      = 1e-3     # Phase 1 learning rate
LR_FINE      = 1e-5     # Phase 2 learning rate (very low)
NUM_CLASSES  = 10

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── DATA AUGMENTATION ───────────────────────────────────────
# Applied ONLY to training data — not val or test
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

# ── CLASS WEIGHTS (standard — counteracts class imbalance) ──
# Counts training images per class from disk to compute balanced weights.
# Applied to BOTH Phase 1 and Phase 2. Do not remove.
y_labels = []
for idx, cname in enumerate(class_names):
    class_dir = os.path.join(DATASET_DIR, "train", cname)
    count = len([f for f in os.listdir(class_dir)
                 if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    y_labels.extend([idx] * count)

y_labels     = np.array(y_labels)
weights_arr  = compute_class_weight('balanced',
                                    classes=np.unique(y_labels),
                                    y=y_labels)
class_weights = dict(enumerate(weights_arr))
print("\nClass weights applied:")
for i, cname in enumerate(class_names):
    print(f"  [{i}] {cname:35s}: {class_weights[i]:.4f}")

# ── NORMALIZATION + AUGMENTATION PIPELINE ──────────────────
normalization = layers.Rescaling(1./255)

train_ds = (
    train_ds
    .cache("/tmp/tf_cache")                    # cache to disk, not GPU memory
    .map(lambda x, y: (augmentation(x, training=True), y),
         num_parallel_calls=tf.data.AUTOTUNE)
    .map(lambda x, y: (normalization(x), y),
         num_parallel_calls=tf.data.AUTOTUNE)
    .prefetch(tf.data.AUTOTUNE)
)

val_ds = (
    val_ds
    .map(lambda x, y: (normalization(x), y),
         num_parallel_calls=tf.data.AUTOTUNE)
    .prefetch(tf.data.AUTOTUNE)
)

test_ds = (
    test_ds
    .map(lambda x, y: (normalization(x), y),
         num_parallel_calls=tf.data.AUTOTUNE)
    .prefetch(tf.data.AUTOTUNE)
)

# ── BUILD MODEL (PHASE 1: HEAD ONLY) ───────────────────────
base_model = tf.keras.applications.ResNet50(
    weights="imagenet",
    include_top=False,          # remove ImageNet classification head
    input_shape=(224, 224, 3)
)
base_model.trainable = False    # freeze all base layers for Phase 1

inputs  = tf.keras.Input(shape=(224, 224, 3))
x       = base_model(inputs, training=False)
x       = layers.GlobalAveragePooling2D()(x)
x       = layers.Dense(256, activation="relu")(x)
x       = layers.Dropout(0.4)(x)
outputs = layers.Dense(NUM_CLASSES, activation="softmax")(x)

model = tf.keras.Model(inputs, outputs)

model.compile(
    optimizer=optimizers.Adam(learning_rate=LR_HEAD),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

# ── CALLBACKS ───────────────────────────────────────────────
cb_early_stop = callbacks.EarlyStopping(
    monitor="val_accuracy",
    patience=5,
    restore_best_weights=True,
    verbose=1
)

cb_reduce_lr = callbacks.ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.5,
    patience=3,
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
print("\n=== PHASE 2: Fine-tuning deeper ResNet layers ===")

# Unfreeze last 30 layers of ResNet50 for fine-tuning
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=optimizers.Adam(learning_rate=LR_FINE),
    loss="categorical_crossentropy",
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

# ── EXPORT TO TFLITE ────────────────────────────────────────
print("\n=== EXPORTING TO TFLITE ===")
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

tflite_path = f"{OUTPUT_DIR}/resnet50.tflite"
with open(tflite_path, "wb") as f:
    f.write(tflite_model)

size_mb = os.path.getsize(tflite_path) / (1024 * 1024)
print(f"TFLite model saved: {tflite_path}")
print(f"TFLite file size:   {size_mb:.1f} MB")
print("\nDone! Copy resnet50.tflite and class_names.json to scanom-backend/model/")
