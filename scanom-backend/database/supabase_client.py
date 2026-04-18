"""
Supabase client — single shared connection for all database operations.
Uses the service role key so backend queries bypass Row Level Security.
"""

import os
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


def verify_token(token: str) -> dict | None:
    """
    Verify a Supabase Auth JWT and return the user dict, or None if invalid.
    Called as a FastAPI dependency on protected endpoints.
    """
    try:
        resp = supabase.auth.get_user(token)
        if resp and resp.user:
            return {"id": resp.user.id, "email": resp.user.email}
        return None
    except Exception:
        return None
