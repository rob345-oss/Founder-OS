from __future__ import annotations

import uuid
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from founder_os_api.config import (
    get_settings,
    parse_founder_emails,
    parse_founder_user_ids,
)

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class FounderPrincipal:
    """Authenticated Supabase user permitted for Founder OS."""

    user_id: uuid.UUID
    email: str | None


def verify_supabase_jwt(token: str, *, secret: str) -> dict:
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server missing SUPABASE_JWT_SECRET",
        )
    try:
        # Supabase uses HS256 for the anon/service JWTs
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
            audience="authenticated",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e!s}",
        ) from e


def is_founder(payload: dict, *, allowed_ids: set[str], allowed_emails: set[str]) -> bool:
    sub = str(payload.get("sub", ""))
    if sub and sub in allowed_ids:
        return True
    email = (payload.get("email") or "").strip().lower()
    if email and email in allowed_emails:
        return True
    return False


async def get_founder_principal(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> FounderPrincipal:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    settings = get_settings()
    payload = verify_supabase_jwt(creds.credentials, secret=settings.supabase_jwt_secret)
    allowed_ids = parse_founder_user_ids(settings.founder_user_ids)
    allowed_emails = parse_founder_emails(settings.founder_email_allowlist)
    if not is_founder(payload, allowed_ids=allowed_ids, allowed_emails=allowed_emails):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for Founder OS",
        )
    try:
        uid = uuid.UUID(str(payload["sub"]))
    except (KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid subject",
        ) from e
    email = payload.get("email")
    return FounderPrincipal(user_id=uid, email=email if isinstance(email, str) else None)
