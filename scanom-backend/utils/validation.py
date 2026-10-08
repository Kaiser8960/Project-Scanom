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
_EMAIL_RE = re.compile(r"^([A-Za-z0-9._%+\-]+)@([A-Za-z0-9.\-]+)\.([A-Za-z]{2,})$")
# Same character 4+ times in a row (case-insensitive), e.g. "LLLL", "aaaa"
_REPEAT_RE = re.compile(r"(.)\1{3,}", re.IGNORECASE)

PASSWORD_TYPES_REQUIRED = 3  # of: lowercase, uppercase, number, special


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
    m = _EMAIL_RE.match(v)
    if not m:
        raise ValueError("Please enter a valid email address.")
    local, domain, _tld = m.group(1), m.group(2), m.group(3)
    if local.startswith(".") or local.endswith(".") or ".." in local:
        raise ValueError("Please enter a valid email address.")
    labels = domain.split(".")
    if any(not lb or lb.startswith("-") or lb.endswith("-") for lb in labels):
        raise ValueError("Please enter a valid email address.")
    if _REPEAT_RE.search(local):
        raise ValueError("Email contains too many repeated characters.")
    return v


def password_type_flags(v: str) -> dict:
    return {
        "lower":   bool(re.search(r"[a-z]", v)),
        "upper":   bool(re.search(r"[A-Z]", v)),
        "number":  bool(re.search(r"[0-9]", v)),
        "special": bool(re.search(r"[^A-Za-z0-9\s]", v)),
    }


def check_password(v: str) -> str:
    """Registration password policy: 8-72 chars and at least 3 of 4 character types."""
    if len(v) < PASSWORD_MIN:
        raise ValueError(f"Password must be at least {PASSWORD_MIN} characters.")
    if len(v) > PASSWORD_MAX:
        raise ValueError(f"Password must be at most {PASSWORD_MAX} characters.")
    if sum(password_type_flags(v).values()) < PASSWORD_TYPES_REQUIRED:
        raise ValueError(
            "Password must include at least 3 of: lowercase letters, uppercase letters, "
            "numbers, special characters."
        )
    return v


def clean_location(v: str) -> str:
    v = " ".join(v.split())
    if len(v) > LOCATION_MAX:
        raise ValueError(f"Location must be at most {LOCATION_MAX} characters.")
    if _REPEAT_RE.search(v):
        raise ValueError("Location contains too many repeated characters.")
    return v
