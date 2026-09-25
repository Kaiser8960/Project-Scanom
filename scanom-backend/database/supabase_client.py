"""
Supabase client — single shared connection for all database operations.
Uses the service role key so backend queries bypass Row Level Security.
"""

import os
from fastapi import HTTPException
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL         = os.getenv("SUPABASE_URL",         "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("WARNING: SUPABASE_URL or SUPABASE_SERVICE_KEY missing from .env")

# Module-level singleton — one client reused across all requests
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_supabase() -> Client:
    """Return the shared Supabase client."""
    return supabase


def verify_token(authorization: str | None) -> str:
    """
    Verify a Supabase Auth JWT from the Authorization header.
    Strips the 'Bearer ' prefix automatically.
    Returns the user_id (UUID string) on success.
    Raises HTTP 401 on missing or invalid token.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing.")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token is empty.")

    try:
        resp = supabase.auth.get_user(token)
        if resp and resp.user:
            return resp.user.id   # return UUID string directly
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
