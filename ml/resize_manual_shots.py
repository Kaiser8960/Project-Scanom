"""
resize_manual_shots.py
──────────────────────
Pre-resizes all images inside manual_shots/ so that the longest
dimension is at most MAX_SIZE pixels. This dramatically speeds up
TensorFlow's data pipeline during training, since it no longer needs
to decode full 12MP JPEGs just to resize them to 224×224.

Run on Windows (PowerShell) BEFORE merge_datasets.py:
    python ml/resize_manual_shots.py

Requires Pillow (already installed in your environment):
    pip install Pillow
"""

import os
from PIL import Image

# ── Config ───────────────────────────────────────────────────────
BASE         = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANUAL_SHOTS = os.path.join(BASE, "manual_shots")
MAX_SIZE     = 800        # px — longest side capped at 800px
JPEG_QUALITY = 92         # quality for re-saved JPEGs

SUPPORTED = (".jpg", ".jpeg", ".png")

# ── Resize loop ──────────────────────────────────────────────────
total_resized  = 0
total_skipped  = 0
total_failed   = 0

for class_folder in sorted(os.listdir(MANUAL_SHOTS)):
    class_path = os.path.join(MANUAL_SHOTS, class_folder)
    if not os.path.isdir(class_path):
        continue

    image_files = [
        f for f in os.listdir(class_path)
        if f.lower().endswith(SUPPORTED)
    ]

    print(f"\n[{class_folder}] — {len(image_files)} images")

    for filename in image_files:
        filepath = os.path.join(class_path, filename)
        try:
            img = Image.open(filepath)

            # Skip if already small enough (don't upscale)
            if max(img.width, img.height) <= MAX_SIZE:
                total_skipped += 1
                continue

            # Resize preserving aspect ratio — longest side = MAX_SIZE
            img.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)

            # Save in-place (overwrite original)
            save_format = "PNG" if filename.lower().endswith(".png") else "JPEG"
            if save_format == "JPEG":
                img.convert("RGB").save(filepath, format=save_format, quality=JPEG_QUALITY, optimize=True)
            else:
                img.save(filepath, format=save_format, optimize=True)

            total_resized += 1

        except Exception as e:
            print(f"  ✗  {filename}  ERROR: {e}")
            total_failed += 1

    print(f"  Done — {total_resized} resized so far, {total_skipped} already small")

print(f"\n── Summary ────────────────────────────────────────────────")
print(f"  Resized  : {total_resized} images")
print(f"  Skipped  : {total_skipped} (already ≤ {MAX_SIZE}px — untouched)")
print(f"  Failed   : {total_failed}")
print(f"\nNow run: python ml/merge_datasets.py")
