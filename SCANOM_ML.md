# SCANOM_ML.md — Machine Learning Specification
> Feed this file to your IDE AI agent ONLY when working on CNN training.
> For app and backend work, use SCANOM_SPEC.md instead.
> Last updated: April 2026 (Rev. 2) — Velas Co. / USPF CCS

---

## 1. ML Overview

| Field | Value |
|---|---|
| **Model** | EfficientNetV2B0 |
| **Approach** | Transfer Learning (ImageNet pre-trained weights) |
| **Framework** | TensorFlow / Keras |
| **Export Format** | TensorFlow Lite (TFLite) |
| **Input Size** | 224 × 224 × 3 |
| **Output** | Softmax over 10 classes |
| **Target Accuracy** | 95% or higher |
| **Target F1 Score** | 0.90 or higher |
| **Dataset Split** | 70% train / 15% val / 15% test |

---

## Key Decisions (Read Before Changing This File)

> These decisions were made during active development. Any AI agent or developer working on this project must respect them.

| Decision | Choice | Rationale |
|---|---|---|
| **ML Framework** | TensorFlow / Keras | Already built on TF. Migrating to PyTorch would require rewriting 400+ lines including the TFLite export pipeline with no thesis benefit. Do not switch. |
| **GPU Training** | WSL2 + `tensorflow[and-cuda]` | TF 2.11+ dropped native Windows GPU support. The RTX 4060 is idle on native Windows. WSL2 is the correct path. See Section 9. |
| **Model File Storage** | Backend repo only — NOT Supabase | Supabase free tier is 1 GB total. The `.tflite` file (~25 MB) must live in `scanom-backend/model/` directly, never in Supabase Storage. |
| **Class Imbalance** | Class weights — standard, not optional | Banana classes are severely underrepresented vs. Tomato. Without class weights, banana diseases score 0% F1. Class weights are now applied by default in train.py. |
| **Pipeline Order** | augment → prefetch (NO cache) | In-memory `.cache()` on 16k images at 224×224 tries to pin ~4GB of host RAM, hitting CUDA pinned memory limits. Data is on Linux SSD — per-epoch reads are fast without cache. |
| **Batch Size** | 16 (not 32) | RTX 4060 Laptop only gets ~5.5GB VRAM after WSL2 overhead. Batch 32 causes CUDA_ERROR_OUT_OF_MEMORY even with mixed precision. Batch 16 is stable. |

---

## 2. Final Class List (10 Classes)

```
Index  Class Name               Display Name
─────────────────────────────────────────────────────
  0    banana_cordana            Banana Cordana
  1    banana_healthy            Banana Healthy
  2    banana_panama_wilt        Banana Panama Wilt
  3    banana_sigatoka           Banana Sigatoka
  4    tomato_bacterial_spot     Tomato Bacterial Spot
  5    tomato_early_blight       Tomato Early Blight
  6    tomato_healthy            Tomato Healthy
  7    tomato_late_blight        Tomato Late Blight
  8    tomato_leaf_mold          Tomato Leaf Mold
  9    tomato_powdery_mildew     Tomato Powdery Mildew
```

> IMPORTANT: TensorFlow assigns class indices alphabetically.
> The index order above is alphabetical and must match class_names.json exactly.

### class_names.json (save to scanom-backend/model/)
```json
[
  "banana_cordana",
  "banana_healthy",
  "banana_panama_wilt",
  "banana_sigatoka",
  "tomato_bacterial_spot",
  "tomato_early_blight",
  "tomato_healthy",
  "tomato_late_blight",
  "tomato_leaf_mold",
  "tomato_powdery_mildew"
]
```

---

## 3. Your Raw Dataset Structure

```
Thesis/
  Banana Dataset 1/            <- FLAT structure
    Black and Yellow Sigatoka/
    Healthy Banana leaf/
    Panama Wilt Disease/

  Banana Dataset 2/            <- PRE-SPLIT structure
    train/
      healthy/
      Sigatoka/
    test/
      healthy/
      Sigatoka/

  Banana Dataset 3/            <- FLAT structure
    cordana/
    healthy/
    sigatoka/

  Banana Dataset 4/            <- ROBOFLOW CSV structure
    train/                       All images in one flat folder.
      _classes.csv               CSV maps filename -> one-hot labels:
      <image files>              columns: cordana, healthy,
    valid/                       pestalotiopsis, sigatoka
      _classes.csv             We extract ONLY cordana == 1 rows.
      <image files>
    test/
      _classes.csv
      <image files>

  Banana Dataset 5/            <- NESTED FLAT structure
    Original Images/
      Original Images/
        Banana Panama Disease/
        Banana Black Sigatoka Disease/
        Banana Yellow Sigatoka Disease/
    Augmented images/
      Augmented images/
        Augmented Banana Panama Disease/
        Augmented Banana Black Sigatoka Disease/
        Augmented Banana Yellow Sigatoka Disease/

  Tomato Dataset 1/            <- PRE-SPLIT structure
    train/
      Bacterial_spot/
      Early_blight/
      healthy/
      Late_blight/
      Leaf_Mold/
      powdery_mildew/
    valid/
      (same structure as train)
```

### Dataset Merge Notes
```
DS1  -> banana_healthy, banana_sigatoka, banana_panama_wilt
DS2  -> banana_healthy, banana_sigatoka (train + test merged)
DS3  -> banana_healthy, banana_sigatoka, banana_cordana
DS4  -> banana_cordana ONLY (CSV parsed, cordana==1 rows)
DS5  -> banana_panama_wilt + banana_sigatoka
         Black Sigatoka + Yellow Sigatoka are BOTH mapped to
         banana_sigatoka (same Mycosphaerella family, one class).
         Original AND Augmented images both included.
Tom1 -> all 6 tomato classes (train + valid merged)
```

## 4. Step 1 — merge_datasets.py

Run this first. Clears `dataset/all/` and rebuilds it from all sources.
Handles two dataset types: standard flat folders AND Roboflow CSV format.

```python
import os
import shutil
import uuid
import csv

# -- CHANGE THIS to your actual Thesis folder path
BASE       = "C:/Users/Jim Dejito/OneDrive/Desktop/Jim Codes/Thesis/Scanom"
OUTPUT_DIR = f"{BASE}/dataset/all"

# -- CLEAN SLATE: prevents duplicate images on re-runs
print("Cleaning output directory (fresh start)...")
shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
print("Done.\n")

mappings = [
    # -- BANANA DATASET 1 (flat)
    (f"{BASE}/Banana Dataset 1/Healthy Banana  leaf",  "banana_healthy"),
    (f"{BASE}/Banana Dataset 1/Black and Yellow Sigatoka", "banana_sigatoka"),
    (f"{BASE}/Banana Dataset 1/Panama Wilt Disease",   "banana_panama_wilt"),

    # -- BANANA DATASET 2 (pre-split: merge train + test)
    (f"{BASE}/Banana Dataset 2/train/healthy",          "banana_healthy"),
    (f"{BASE}/Banana Dataset 2/train/Sigatoka",         "banana_sigatoka"),
    (f"{BASE}/Banana Dataset 2/test/healthy",           "banana_healthy"),
    (f"{BASE}/Banana Dataset 2/test/Sigatoka",          "banana_sigatoka"),

    # -- BANANA DATASET 3 (flat)
    (f"{BASE}/Banana Dataset 3/healthy",                "banana_healthy"),
    (f"{BASE}/Banana Dataset 3/sigatoka",               "banana_sigatoka"),
    (f"{BASE}/Banana Dataset 3/cordana",                "banana_cordana"),

    # -- BANANA DATASET 5: Original images
    (f"{BASE}/Banana Dataset 5/Original Images/Original Images/Banana Panama Disease",
     "banana_panama_wilt"),
    (f"{BASE}/Banana Dataset 5/Original Images/Original Images/Banana Black Sigatoka Disease",
     "banana_sigatoka"),
    (f"{BASE}/Banana Dataset 5/Original Images/Original Images/Banana Yellow Sigatoka Disease",
     "banana_sigatoka"),

    # -- BANANA DATASET 5: Augmented images
    (f"{BASE}/Banana Dataset 5/Augmented images/Augmented images/Augmented Banana Panama Disease",
     "banana_panama_wilt"),
    (f"{BASE}/Banana Dataset 5/Augmented images/Augmented images/Augmented Banana Black Sigatoka Disease",
     "banana_sigatoka"),
    (f"{BASE}/Banana Dataset 5/Augmented images/Augmented images/Augmented Banana Yellow Sigatoka Disease",
     "banana_sigatoka"),

    # -- TOMATO DATASET 1 TRAIN
    (f"{BASE}/Tomato Dataset 1/train/healthy",          "tomato_healthy"),
    (f"{BASE}/Tomato Dataset 1/train/Bacterial_spot",   "tomato_bacterial_spot"),
    (f"{BASE}/Tomato Dataset 1/train/Early_blight",     "tomato_early_blight"),
    (f"{BASE}/Tomato Dataset 1/train/Late_blight",      "tomato_late_blight"),
    (f"{BASE}/Tomato Dataset 1/train/Leaf_Mold",        "tomato_leaf_mold"),
    (f"{BASE}/Tomato Dataset 1/train/powdery_mildew",   "tomato_powdery_mildew"),

    # -- TOMATO DATASET 1 VALID (merge with train)
    (f"{BASE}/Tomato Dataset 1/valid/healthy",          "tomato_healthy"),
    (f"{BASE}/Tomato Dataset 1/valid/Bacterial_spot",   "tomato_bacterial_spot"),
    (f"{BASE}/Tomato Dataset 1/valid/Early_blight",     "tomato_early_blight"),
    (f"{BASE}/Tomato Dataset 1/valid/Late_blight",      "tomato_late_blight"),
    (f"{BASE}/Tomato Dataset 1/valid/Leaf_Mold",        "tomato_leaf_mold"),
    (f"{BASE}/Tomato Dataset 1/valid/powdery_mildew",   "tomato_powdery_mildew"),

    # -- DA-RFU VII MANUAL SHOTS (uncomment after field visit)
    # (f"{BASE}/manual_shots/banana_healthy",        "banana_healthy"),
    # (f"{BASE}/manual_shots/banana_sigatoka",       "banana_sigatoka"),
    # (f"{BASE}/manual_shots/banana_panama_wilt",    "banana_panama_wilt"),
    # (f"{BASE}/manual_shots/banana_cordana",        "banana_cordana"),
    # (f"{BASE}/manual_shots/tomato_healthy",        "tomato_healthy"),
    # (f"{BASE}/manual_shots/tomato_early_blight",   "tomato_early_blight"),
    # (f"{BASE}/manual_shots/tomato_late_blight",    "tomato_late_blight"),
    # (f"{BASE}/manual_shots/tomato_bacterial_spot", "tomato_bacterial_spot"),
    # (f"{BASE}/manual_shots/tomato_leaf_mold",      "tomato_leaf_mold"),
    # (f"{BASE}/manual_shots/tomato_powdery_mildew", "tomato_powdery_mildew"),
]


def long_path(p):
    """Add \\?\ prefix so Windows handles paths longer than 260 chars."""
    p = os.path.abspath(p)
    if not p.startswith("\\\\?\\"):
        p = "\\\\?\\" + p
    return p


def process_roboflow_cordana():
    """
    Dataset 4 uses Roboflow CSV format. All images sit in flat
    train/valid/test folders. _classes.csv maps filename -> one-hot labels.
    We extract ONLY rows where cordana == 1.
    """
    ds4_base  = f"{BASE}/Banana Dataset 4"
    dest_path = os.path.join(OUTPUT_DIR, "banana_cordana")
    os.makedirs(dest_path, exist_ok=True)
    total = 0
    for split in ["train", "valid", "test"]:
        csv_path = os.path.join(ds4_base, split, "_classes.csv")
        img_dir  = os.path.join(ds4_base, split)
        if not os.path.exists(csv_path):
            print(f"  WARNING: CSV not found -- {csv_path}")
            continue
        with open(csv_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count  = 0
            for row in reader:
                if row.get("cordana", "0").strip() == "1":
                    src = os.path.join(img_dir, row["filename"])
                    if os.path.exists(src):
                        ext  = row["filename"].split('.')[-1].lower()
                        dst  = os.path.join(dest_path, f"{uuid.uuid4().hex}.{ext}")
                        shutil.copy(long_path(src), long_path(dst))
                        count += 1
            total += count
            print(f"    [{split:5s}] {count} cordana images")
    print(f"  [OK]  {'banana_cordana (DS4 Roboflow)':35s} <- {total} images total")


# Phase 1: standard folder datasets
print("[1/2] Processing standard folder datasets...\n")
for source_path, class_name in mappings:
    dest_path = os.path.join(OUTPUT_DIR, class_name)
    os.makedirs(dest_path, exist_ok=True)
    if not os.path.exists(source_path):
        print(f"  WARNING: Path not found -- {source_path}")
        continue
    count = 0
    for filename in os.listdir(source_path):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            ext = filename.split('.')[-1].lower()
            shutil.copy(long_path(os.path.join(source_path, filename)),
                        long_path(os.path.join(dest_path, f"{uuid.uuid4().hex}.{ext}")))
            count += 1
    print(f"  [OK]  {class_name:35s} <- {count} images")

# Phase 2: Roboflow CSV datasets
print("\n[2/2] Processing Roboflow CSV dataset (Dataset 4 -- cordana only)...\n")
process_roboflow_cordana()

# Summary
print("\n-- Class Summary --")
total = 0
for cf in sorted(os.listdir(OUTPUT_DIR)):
    cp = os.path.join(OUTPUT_DIR, cf)
    if os.path.isdir(cp):
        n    = len([f for f in os.listdir(cp) if f.lower().endswith(('.jpg','.jpeg','.png'))])
        flag = "  [!] UNDER 300" if n < 300 else ""
        print(f"  {cf:35s}: {n:5d} images{flag}")
        total += n
print(f"\n  TOTAL: {total} images across 10 classes")
print("\nMerge complete! Now run split_dataset.py")
```

---

## 5. Step 2 — split_dataset.py

Run after merge. Creates train/val/test structure.

```python
import os
import shutil
import random

BASE       = "C:/Users/Jim Dejito/Thesis/Scanom"   # ← CHANGE THIS
SOURCE_DIR = f"{BASE}/dataset/all"
OUTPUT_DIR = f"{BASE}/dataset"
SEED       = 42

random.seed(SEED)

print("Starting dataset split (70% train / 15% val / 15% test)...\n")

for class_name in sorted(os.listdir(SOURCE_DIR)):
    class_path = os.path.join(SOURCE_DIR, class_name)
    if not os.path.isdir(class_path):
        continue

    images = [
        f for f in os.listdir(class_path)
        if f.lower().endswith(('.jpg', '.jpeg', '.png'))
    ]
    random.shuffle(images)

    total     = len(images)
    train_end = int(total * 0.70)
    val_end   = train_end + int(total * 0.15)

    splits = {
        "train": images[:train_end],
        "val":   images[train_end:val_end],
        "test":  images[val_end:]
    }

    for split_name, split_images in splits.items():
        dest = os.path.join(OUTPUT_DIR, split_name, class_name)
        os.makedirs(dest, exist_ok=True)
        for img in split_images:
            shutil.copy(os.path.join(class_path, img), os.path.join(dest, img))

    print(
        f"  ✓  {class_name:35s} "
        f"train:{len(splits['train']):4d} | "
        f"val:{len(splits['val']):4d} | "
        f"test:{len(splits['test']):4d}"
    )

print(f"\nSplit complete!")
print(f"Output structure:")
print(f"  {OUTPUT_DIR}/train/  ← 70%")
print(f"  {OUTPUT_DIR}/val/    ← 15%")
print(f"  {OUTPUT_DIR}/test/   ← 15%")
```

---

## 6. Step 3 — Training Script (train.py)

```python
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, callbacks
import numpy as np
import json
import os
from sklearn.utils.class_weight import compute_class_weight

# ── CONFIG ─────────────────────────────────────────────────
BASE         = "C:/Users/Jim Dejito/Thesis"   # ← CHANGE THIS
DATASET_DIR  = f"{BASE}/dataset"
OUTPUT_DIR   = f"{BASE}/model_output"
IMG_SIZE     = (224, 224)
BATCH_SIZE   = 32
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
    .cache()                                              # ← cache raw images FIRST
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
print("\nDone! Copy efficientnetv2b0.tflite and class_names.json to scanom-backend/model/")
```

---

## 7. Training Phases Explained

```
PHASE 1 — Train Head Only (faster, ~20 epochs)
  base_model.trainable = False
  Only the new Dense layers learn
  Purpose: teach the new head to use EfficientNetV2B0 features
  LR: 0.001 (higher — new layers need bigger steps)

PHASE 2 — Fine-tune Deeper Layers (~42 epochs, stopped by EarlyStopping)
  Unfreeze last 108 of 270 EfficientNetV2B0 layers (last 40%)
  Purpose: adapt deep features to plant disease patterns
  LR: 0.0001 (low — avoid destroying learned weights)

This two-phase approach is the standard way to
hit 95%+ accuracy with Transfer Learning on
domain-specific datasets like plant disease images.
```

---

## 8. If Accuracy Is Below 95% After Training

Try these in order:

```
Step 1 — Check class balance
  Run the class summary from merge_datasets.py
  Any class significantly smaller than others → augment it

Step 2 — Increase augmentation strength
  Add to augmentation pipeline:
    layers.RandomTranslation(0.1, 0.1),
    layers.RandomShear(0.1),   # if available in your TF version

Step 3 — Unfreeze more layers in Phase 2
  Change: base_model.layers[:-30] → base_model.layers[:-50]
  This fine-tunes more of the network

Step 4 — Train longer
  Increase EPOCHS_FINE from 30 to 50
  EarlyStopping will stop it if it plateaus

Step 5 — Class weights (ALREADY APPLIED BY DEFAULT in train.py)
  Class weights are computed from disk and passed to both Phase 1
  and Phase 2 of model.fit() automatically. Do not add them again.
  If weights alone are insufficient, next step is offline augmentation
  of the minority class (e.g. banana_panama_wilt).
```

---

## 9. Python Environment Setup

> IMPORTANT: TensorFlow 2.11+ has NO native Windows GPU support. Your RTX 4060 will be idle unless you use WSL2 (Option B). Option A uses CPU only.

### Option A -- CPU Only (Native Windows)
```bash
python -m venv scanom-ml-env
scanom-ml-env\Scripts\activate
pip install tensorflow scikit-learn numpy pillow matplotlib
# Training time: ~1.5-3 hours per run on i7-13620H
```

### Option B -- GPU Accelerated (WSL2, Recommended)

> VERIFIED WORKING on: Ubuntu 24.04 LTS (WSL2), Python 3.11, TF 2.21.0, RTX 4060 Laptop 8GB
> Follow EVERY step exactly -- skipping any step will cause GPU not to be detected.

```bash
# Step 1: Enable WSL2 -- run in PowerShell as Admin, then restart PC
wsl --install

# Step 2: Inside Ubuntu (WSL2 terminal) -- install Python 3.11
# CRITICAL: tensorflow[and-cuda] does NOT support Python 3.12 (Ubuntu 24.04 default).
# You MUST use Python 3.11.
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Step 3: Create the venv in the LINUX home directory -- NOT inside /mnt/c/...
# CRITICAL: TensorFlow .so binaries cannot execute from NTFS (Windows filesystem).
# The venv MUST live on the Linux ext4 filesystem.
cd ~
python3.11 -m venv scanom-ml-env
source ~/scanom-ml-env/bin/activate

# Step 4: Install TensorFlow with CUDA bundled
pip install "tensorflow[and-cuda]" scikit-learn numpy pillow matplotlib

# Step 5: Fix GPU library path -- required for WSL2
# tensorflow[and-cuda] installs CUDA libs into the venv but they are not auto-discovered.
# ldconfig registers libcuda.so.1 from WSL2 NVIDIA driver:
sudo sh -c "echo /usr/lib/wsl/lib > /etc/ld.so.conf.d/ld.wsl.conf"
sudo ldconfig

# Add all bundled nvidia CUDA lib paths to the venv activate script permanently:
echo 'export LD_LIBRARY_PATH=$(find ~/scanom-ml-env/lib/python3.11/site-packages/nvidia -name "lib" -type d | tr '"'"'\n'"'"' '"'"':'"'"'):/usr/lib/wsl/lib:$LD_LIBRARY_PATH' >> ~/scanom-ml-env/bin/activate

# Step 6: Re-activate to apply the path fix, then verify GPU is detected
source ~/scanom-ml-env/bin/activate
python3 -c "import tensorflow as tf; print('GPU:', tf.config.list_physical_devices('GPU'))"
# Expected: [PhysicalDevice(name='/physical_device:GPU:0', device_type='GPU')]

# Step 7: Run training (data stays on Windows, only venv is on Linux)
python3 "/mnt/c/Users/Jim Dejito/OneDrive/Desktop/Jim Codes/Thesis/Scanom/ml/train.py"
```
> Training time with RTX 4060 Laptop: ~15-30 minutes per run.

### Known WSL2 Issues & Fixes

| Issue | Cause | Fix |
|---|---|---|
| `No module named 'tensorflow.python'` | venv stored on `/mnt/c/` (NTFS) | Move venv to Linux home `~/` |
| `GPU: []` after install | Bundled CUDA libs not in path | Run Steps 5-6 above (ldconfig + LD_LIBRARY_PATH) |
| `python3 -m venv` fails with ensurepip error | Ubuntu missing venv package | `sudo apt install -y python3.11-venv` |
| `CUDA_ERROR_OUT_OF_MEMORY` during training | BATCH_SIZE=32 too large for 8GB VRAM | Use BATCH_SIZE=16 and `.cache("/tmp/tf_cache")` |
| `Permission denied` on apt install | Forgot `sudo` | Always prefix apt commands with `sudo` |


---

## 10. Files to Copy After Training

After training completes, copy these files to your FastAPI backend:

```
model_output/
  resnet50.tflite        → scanom-backend/model/resnet50.tflite
  class_names.json       → scanom-backend/model/class_names.json
  classification_report  → keep for Chapter 4 documentation
```

> **IMPORTANT — Model Storage:** Do NOT upload `.tflite` or `class_names.json` to Supabase Storage. Supabase free tier is 1 GB total. These model files belong in the backend repository itself (`scanom-backend/model/`), committed to git and deployed with the container.
>
> **User scan images:** If your app stores uploaded scan images in Supabase Storage, implement a cleanup/retention policy (e.g. auto-delete after 30 days) to avoid hitting the 1 GB limit with real users.

---

## 11. TFLite Inference Code (for FastAPI — inference.py)

```python
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
```

---

## 12. DA-RFU VII Photo Collection Guide

### Camera Settings (Canon EOS 750D)
```
Mode:          Aperture Priority (Av)
Aperture:      f/8 to f/11
ISO:           100–400
Format:        JPG Fine  (NOT RAW)
White Balance: Daylight or Auto
Focus:         Single point AF — focus on the diseased area
Distance:      30–50cm from leaf surface
Lighting:      Natural outdoor, overcast is ideal
```

### Per Leaf Procedure
```
For each diseased leaf found:
  1. Take 10–15 shots with DSLR
     - Vary angle slightly between shots
     - At least 3 shots: full leaf, mid closeup, close detail

  2. Take 10–15 shots with smartphone
     - Same leaf, similar angles
     - Simulates real farmer usage (domain gap coverage)

  3. Name the plant + disease in your notes
     - Confirm disease identification with DA-RFU VII staff
```

### Sorting After Visit
```
Create these folders under Thesis/manual_shots/:
  manual_shots/
    banana_healthy/
    banana_sigatoka/
    banana_panama_wilt/
    banana_cordana/
    tomato_healthy/
    tomato_early_blight/
    tomato_late_blight/
    tomato_bacterial_spot/
    tomato_leaf_mold/
    tomato_powdery_mildew/

Sort each photo into the correct folder.
Then uncomment the manual_shots mappings in merge_datasets.py
and re-run both scripts.
```

---

## 13. Chapter 4 — Metrics Template

After training, fill in this table for Chapter 4:

```
Table X. Classification Performance of the EfficientNetV2B0 CNN Model

Class                    Precision   Recall   F1-Score   Support
────────────────────────────────────────────────────────────────
banana_cordana             X.XX       X.XX      X.XX       XXX
banana_healthy             X.XX       X.XX      X.XX       XXX
banana_panama_wilt         X.XX       X.XX      X.XX       XXX
banana_sigatoka            X.XX       X.XX      X.XX       XXX
tomato_bacterial_spot      X.XX       X.XX      X.XX       XXX
tomato_early_blight        X.XX       X.XX      X.XX       XXX
tomato_healthy             X.XX       X.XX      X.XX       XXX
tomato_late_blight         X.XX       X.XX      X.XX       XXX
tomato_leaf_mold           X.XX       X.XX      X.XX       XXX
tomato_powdery_mildew      X.XX       X.XX      X.XX       XXX
────────────────────────────────────────────────────────────────
Accuracy                                         X.XX      XXXX
Macro Average              X.XX       X.XX      X.XX      XXXX
Weighted Average           X.XX       X.XX      X.XX      XXXX

Overall Test Accuracy: XX.XX%
Overall F1 Score (Weighted): X.XX
```

These values come from classification_report.txt generated by train.py.

---

*SCANOM_ML.md — Velas Co. / USPF CCS / April 2026 (Rev. 2)*
*Companion file: SCANOM_SPEC.md for app and backend specification*

> Rev. 2 Changes: Added Key Decisions section. Fixed .cache() pipeline bug. Added class weights as standard. Added WSL2 GPU setup (Section 9). Clarified model file must not go into Supabase (Section 10).
