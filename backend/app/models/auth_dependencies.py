from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.models.dependencies import get_db
from app.models.user import User

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        payload = decode_access_token(credentials.credentials)

        user_id = payload.get("sub")
        role = payload.get("role")

        if not user_id or not role:
            raise ValueError("Invalid token payload")

        user_id = int(user_id)

        if user_id <= 0:
            raise ValueError("Invalid user ID")

        if role not in {"ANALYST", "ADMIN"}:
            raise ValueError("Invalid role")

        payload["sub"] = str(user_id)

        return payload

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )