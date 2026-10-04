"""
Rate limiting (slowapi). Counters are in-memory, per instance — fine for a
single Railway instance.
"""

from fastapi import Request
from slowapi import Limiter


def client_ip(request: Request) -> str:
    """
    Real client IP behind Railway's proxy. Prefer X-Real-IP; otherwise take the
    right-most X-Forwarded-For entry (the one added by the trusted proxy, not
    client-supplied); otherwise the socket peer.
    """
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=client_ip, default_limits=["120/minute"])

# Named limits so they're easy to tune in one place
LIMIT_REGISTER = "5/minute"
LIMIT_LOGIN    = "10/minute"
LIMIT_DETECT   = "10/minute"
LIMIT_WRITE    = "30/minute"   # profile update, delete, resolve
