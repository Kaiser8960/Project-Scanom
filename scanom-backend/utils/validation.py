"""
Input validation helpers shared by request models.
Limits are enforced here on the server; the mobile app mirrors them for UX only.
"""

import re

# ── Limits ───────────────────────────────────────────────────────────────────
NAME_MIN, NAME_MAX         = 2, 50
EMAIL_MAX                  = 50
PASSWORD_MIN, PASSWORD_MAX = 8, 72   # 72 = bcrypt's effective byte limit
LOCATION_MAX               = 100
IMAGE_B64_MAX              = 5_000_000  # ~3.7 MB decoded; app sends resized images

# Letters (incl. accented), spaces, apostrophes, hyphens, periods. Must start with a letter.
_NAME_RE  = re.compile(r"^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'\-]*$")
_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
# Same character 4+ times in a row (case-insensitive), e.g. "LLLL", "aaaa"
_REPEAT_RE = re.compile(r"(.)\1{3,}", re.IGNORECASE)


def clean_name(v: str) -> str:
    v = " ".join(v.split())  # trim + collapse whitespace
    if not (NAME_MIN <= len(v) <= NAME_MAX):
        raise ValueError(f"Name must be {NAME_MIN}-{NAME_MAX} characters.")
    if not _NAME_RE.match(v):
        raise ValueError("Name may only contain letters, spaces, apostrophes, hyphens, and periods.")
    if _REPEAT_RE.search(v):
        raise ValueError("Name contains too many repeated characters.")
    return v


def clean_email(v: str) -> str:
    v = v.strip().lower()
    if len(v) > EMAIL_MAX:
        raise ValueError(f"Email must be at most {EMAIL_MAX} characters.")
    if not _EMAIL_RE.match(v):
        raise ValueError("Please enter a valid email address.")
    return v


def clean_location(v: str) -> str:
    v = " ".join(v.split())
    if len(v) > LOCATION_MAX:
        raise ValueError(f"Location must be at most {LOCATION_MAX} characters.")
    if _REPEAT_RE.search(v):
        raise ValueError("Location contains too many repeated characters.")
    return v
