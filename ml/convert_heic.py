"""
convert_heic.py
───────────────
Converts all .HEIC files inside manual_shots/ to .JPG in-place,
then removes the originals.

Run from the Scanom root:
    python ml/convert_heic.py

Requires pillow-heif (installed automatically if missing):
    pip install pillow-heif
"""

import os
import sys
import subprocess

# ── Auto-install pillow-heif if not present ─────────────────────
try:
    import pillow_heif
except ImportError:
    print("pillow-heif not found — installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow-heif"])
    import pillow_heif

from PIL import Image

pillow_heif.register_heif_opener()   # lets Pillow open .HEIC like any image

# ── Config ───────────────────────────────────────────────────────
BASE         = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANUAL_SHOTS = os.path.join(BASE, "manual_shots")

# ── Find and convert all .heic files ────────────────────────────
total_converted = 0
total_failed    = 0

for class_folder in sorted(os.listdir(MANUAL_SHOTS)):
    class_path = os.path.join(MANUAL_SHOTS, class_folder)
    if not os.path.isdir(class_path):
        continue

    heic_files = [
        f for f in os.listdir(class_path)
        if f.lower().endswith(".heic")
    ]

    if not heic_files:
        continue

    print(f"\n[{class_folder}] — {len(heic_files)} HEIC files found")

    for filename in heic_files:
        src  = os.path.join(class_path, filename)
        stem = os.path.splitext(filename)[0]
        dst  = os.path.join(class_path, f"{stem}.jpg")

        try:
            img = Image.open(src).convert("RGB")
            img.save(dst, format="JPEG", quality=92)
            os.remove(src)
            print(f"  ✓  {filename}  →  {stem}.jpg")
            total_converted += 1
        except Exception as e:
            print(f"  ✗  {filename}  ERROR: {e}")
            total_failed += 1

print(f"\n── Done ───────────────────────────────────────────────────")
print(f"  Converted : {total_converted} files")
print(f"  Failed    : {total_failed} files")
print(f"\nNow run:  python ml/merge_datasets.py")
