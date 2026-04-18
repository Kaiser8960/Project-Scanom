"""
Auth router — register and login using Supabase Auth.
No custom JWT: Supabase issues, signs, and verifies all tokens.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.supabase_client import get_supabase

router = APIRouter()


class RegisterRequest(BaseModel):
    name:     str
    location: str
    email:    str
    password: str


class LoginRequest(BaseModel):
    email:    str
    password: str


@router.post("/register")
async def register(req: RegisterRequest):
    """
    Create a new Supabase Auth user + insert profile row in users table.
    Returns: { token, user }
    """
    sb = get_supabase()
    try:
        # 1. Create Supabase Auth user
        auth_resp = sb.auth.sign_up({
            "email":    req.email,
            "password": req.password,
        })
        if not auth_resp.user:
            raise HTTPException(status_code=400, detail="Registration failed. Email may already be in use.")

        user_id = auth_resp.user.id

        # 2. Store display profile in users table
        sb.table("users").insert({
            "id":       user_id,
            "email":    req.email,
            "name":     req.name,
            "location": req.location,
        }).execute()

        return {
            "token": auth_resp.session.access_token if auth_resp.session else None,
            "user": {
                "id":       user_id,
                "name":     req.name,
                "location": req.location,
                "email":    req.email,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(req: LoginRequest):
    """
    Sign in with email + password via Supabase Auth.
    Returns: { token, user }
    """
    sb = get_supabase()
    try:
        auth_resp = sb.auth.sign_in_with_password({
            "email":    req.email,
            "password": req.password,
        })
        if not auth_resp.user:
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        user_id = auth_resp.user.id

        # Fetch display profile
        profile_resp = sb.table("users").select("name,location,avatar_url").eq("id", user_id).maybe_single().execute()
        profile      = profile_resp.data or {}

        return {
            "token": auth_resp.session.access_token,
            "user": {
                "id":         user_id,
                "email":      req.email,
                "name":       profile.get("name",       ""),
                "location":   profile.get("location",   ""),
                "avatar_url": profile.get("avatar_url", None),
            },
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
