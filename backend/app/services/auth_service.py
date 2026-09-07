from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User


def register_user(
    db: Session,
    username: str,
    email: str,
    password: str,
) -> User:
    existing_user = db.scalar(
        select(User).where(
            (User.username == username)
            | (User.email == email)
        )
    )

    if existing_user:
        raise ValueError("Username or email already exists")

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        role="ANALYST",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def authenticate_user(
    db: Session,
    username: str,
    password: str,
) -> User | None:
    user = db.scalar(
        select(User).where(User.username == username)
    )

    if user is None:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user


def login_user(
    db: Session,
    username: str,
    password: str,
) -> str | None:
    user = authenticate_user(db, username, password)

    if user is None:
        return None

    return create_access_token(
        user.id,
        user.role,
    )