"""
In-memory request rate limiting using slowapi.
"""

from fastapi import Request
from slowapi import Limiter


def client_ip(request: Request) -> str:
    """Get the client's IP address from proxy headers or socket connection."""
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=client_ip, default_limits=["120/minute"])

# Rate limits per endpoint type
LIMIT_REGISTER = "5/minute"
LIMIT_LOGIN    = "10/minute"
LIMIT_DETECT   = "10/minute"
LIMIT_WRITE    = "30/minute"
