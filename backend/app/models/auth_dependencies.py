from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.models.dependencies import get_db
from app.domains.identity.service import authenticate_api_key

security = HTTPBearer(auto_error=False)

ALLOWED_ROLES = {
    "ANALYST",
    "ADMIN",
    "Reviewer",
    "Developer",
    "Owner",
    "Admin",
    "analyst",
    "admin",
    "reviewer",
    "developer",
    "Agent",
    "agent",
    "Service",
    "service",
}


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> dict:
    raw_token = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials.strip()
    elif request.headers.get("X-API-Key"):
        raw_token = request.headers.get("X-API-Key").strip()
    elif request.headers.get("Authorization"):
        auth_header = request.headers.get("Authorization").strip()
        if auth_header.lower().startswith("bearer "):
            raw_token = auth_header[7:].strip()
        else:
            raw_token = auth_header

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. API key authentication for automated systems
    if raw_token.startswith("gdn_"):
        api_key = authenticate_api_key(db, raw_token)
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {
            "sub": str(api_key.user_id),
            "username": f"agent_{api_key.name}",
            "role": "Agent",
            "workspace_id": api_key.workspace_id or 1,
            "api_key_id": api_key.id,
            "scopes": api_key.scopes or [],
            "auth_type": "api_key",
        }

    # 2. JWT authentication for dashboard users
    try:
        payload = decode_access_token(raw_token)

        user_id = payload.get("sub")
        role = payload.get("role")

        if not user_id or not role:
            raise ValueError("Invalid token payload")

        user_id = int(user_id)

        if user_id <= 0:
            raise ValueError("Invalid user ID")

        if role not in ALLOWED_ROLES and role.upper() not in {"ANALYST", "ADMIN"}:
            raise ValueError("Invalid role")

        payload["sub"] = str(user_id)
        if "workspace_id" not in payload:
            payload["workspace_id"] = 1
        return payload

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )