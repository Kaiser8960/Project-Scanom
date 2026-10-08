"""
Auth router — register and login using Supabase Auth.
No custom JWT: Supabase issues, signs, and verifies all tokens.
"""

from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel, Field, field_validator
from typing import Optional
import os
import httpx
from database.supabase_client import get_supabase, verify_token
from utils.rate_limit import limiter, LIMIT_REGISTER, LIMIT_LOGIN, LIMIT_WRITE
from utils.validation import (
    clean_name, clean_email, clean_location, check_password,
    PASSWORD_MAX,
)

router = APIRouter()


class RegisterRequest(BaseModel):
    name:     str
    location: str
    email:    str
    password: str = Field(max_length=PASSWORD_MAX)

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return check_password(v)

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        return clean_name(v)

    @field_validator("location")
    @classmethod
    def _location(cls, v: str) -> str:
        return clean_location(v)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return clean_email(v)


class LoginRequest(BaseModel):
    # Lenient on purpose: only guard against oversized input so existing
    # accounts can always sign in.
    email:    str = Field(max_length=254)
    password: str = Field(max_length=PASSWORD_MAX)


@router.post("/register")
@limiter.limit(LIMIT_REGISTER)
async def register(request: Request, req: RegisterRequest):
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

        # 2. Clean up any orphaned profile row with this email
        #    (can happen if auth account was deleted but profile row was not)
        sb.table("users").delete().eq("email", req.email).execute()

        # 3. Insert fresh profile row
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
        err = str(e)
        if "already registered" in err or "23505" in err or "users_email_key" in err:
            raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in instead.")
        raise HTTPException(status_code=400, detail="Registration failed. Please try again.")


@router.post("/login")
@limiter.limit(LIMIT_LOGIN)
async def login(request: Request, req: LoginRequest):
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


class UpdateProfileRequest(BaseModel):
    name:     Optional[str] = None
    location: Optional[str] = None

    @field_validator("name")
    @classmethod
    def _name(cls, v: Optional[str]) -> Optional[str]:
        return clean_name(v) if v is not None else v

    @field_validator("location")
    @classmethod
    def _location(cls, v: Optional[str]) -> Optional[str]:
        return clean_location(v) if v is not None else v


@router.put("/profile")
@limiter.limit(LIMIT_WRITE)
async def update_profile(
    request:       Request,
    req:           UpdateProfileRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Update the authenticated user's display name and location.
    Requires a valid Supabase JWT in the Authorization header.
    Returns the updated user profile.
    """
    user_id = verify_token(authorization)   # now returns str, raises 401 on failure
    sb = get_supabase()

    updates = {}
    if req.name     is not None: updates["name"]     = req.name
    if req.location is not None: updates["location"]  = req.location

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    try:
        sb.table("users").update(updates).eq("id", user_id).execute()

        # Return the current full profile
        profile_resp = sb.table("users").select("id,email,name,location,avatar_url").eq("id", user_id).maybe_single().execute()
        profile = profile_resp.data or {}

        return {
            "user": {
                "id":         user_id,
                "email":      profile.get("email",      ""),
                "name":       profile.get("name",       ""),
                "location":   profile.get("location",   ""),
                "avatar_url": profile.get("avatar_url", None),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/me", status_code=204)
@limiter.limit(LIMIT_WRITE)
async def delete_account(
    request:       Request,
    authorization: Optional[str] = Header(None),
):
    """
    Permanently delete the authenticated user's account.
    Removes: all detections, the profile row, and the Supabase Auth account.
    Returns 204 No Content on success.
    """
    user_id      = verify_token(authorization)   # raises 401 if invalid
    sb           = get_supabase()
    supabase_url = os.getenv("SUPABASE_URL", "")
    service_key  = os.getenv("SUPABASE_SERVICE_KEY", "")

    try:
        # 1. Delete all detection records for this user
        sb.table("detections").delete().eq("user_id", user_id).execute()

        # 2. Delete the profile row from the users table
        sb.table("users").delete().eq("id", user_id).execute()

        # 3. Delete the Supabase Auth account via Admin REST API
        #    (more reliable than sb.auth.admin.delete_user() across SDK versions)
        resp = httpx.delete(
            f"{supabase_url}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey":        service_key,
                "Authorization": f"Bearer {service_key}",
            },
            timeout=10.0,
        )
        if resp.status_code not in (200, 204):
            raise Exception(f"Auth deletion failed: {resp.text}")

        # 204 — no body returned
        return
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
