from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.rate_limit import is_rate_limited
from app.models.role_dependencies import require_role
from app.models.dependencies import get_db
from app.models.user import User

from app.models.auth_dependencies import get_current_user

from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import (
    login_user,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


LOGIN_RATE_LIMIT = 5
LOGIN_RATE_WINDOW = 60


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    try:
        user = register_user(
            db,
            request.username,
            request.email,
            request.password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    return user


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    request: LoginRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    client_ip = http_request.client.host if http_request.client else "unknown"

    if is_rate_limited(
        f"login:{client_ip}",
        LOGIN_RATE_LIMIT,
        LOGIN_RATE_WINDOW,
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts",
            headers={"Retry-After": str(LOGIN_RATE_WINDOW)},
        )

    token = login_user(
        db,
        request.username,
        request.password,
    )

    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return TokenResponse(access_token=token)


@router.get(
    "/users",
    response_model=list[UserResponse],
)
def list_users(
    current_user: dict = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    return db.query(User).order_by(User.id).all()


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = int(current_user["sub"])

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user