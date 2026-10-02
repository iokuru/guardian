from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.identity.models import User, ApiKey, Workspace
from app.domains.identity.schemas import UserCreate, ApiKeyCreate
from app.infrastructure.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_api_key,
)


def ensure_default_workspace(db: Session) -> Workspace:
    workspace = db.scalar(select(Workspace).where(Workspace.slug == "production"))
    if not workspace:
        workspace = Workspace(name="Production", slug="production")
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
    return workspace


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == username))


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.scalar(select(User).where(User.id == user_id))


def register_user(db: Session, data: UserCreate) -> User:
    workspace = ensure_default_workspace(db)
    user = User(
        workspace_id=workspace.id,
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> tuple[User, str] | None:
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    token = create_access_token(
        user_id=user.id,
        role=user.role,
        workspace_id=user.workspace_id or 1,
    )
    return user, token


def create_api_key_for_user(db: Session, user_id: int, data: ApiKeyCreate) -> tuple[ApiKey, str]:
    user = get_user_by_id(db, user_id)
    workspace_id = user.workspace_id if user else 1
    full_key, prefix, hashed_key = generate_api_key()

    api_key = ApiKey(
        workspace_id=workspace_id,
        user_id=user_id,
        name=data.name,
        prefix=prefix,
        hashed_key=hashed_key,
        scopes=data.scopes,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key, full_key


def list_api_keys_for_user(db: Session, user_id: int) -> list[ApiKey]:
    return list(
        db.scalars(
            select(ApiKey)
            .where(ApiKey.user_id == user_id, ApiKey.revoked_at.is_(None))
            .order_by(ApiKey.created_at.desc())
        )
    )


def revoke_api_key(db: Session, user_id: int, key_id: int) -> bool:
    api_key = db.scalar(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user_id)
    )
    if not api_key or api_key.revoked_at is not None:
        return False
    api_key.revoked_at = datetime.utcnow()
    db.commit()
    return True


def authenticate_api_key(db: Session, raw_key: str) -> ApiKey | None:
    if not raw_key or not raw_key.startswith("gdn_"):
        return None
    prefix = raw_key[:10]
    candidates = list(
        db.scalars(
            select(ApiKey).where(
                ApiKey.prefix == prefix,
                ApiKey.revoked_at.is_(None),
            )
        )
    )
    for record in candidates:
        if verify_password(raw_key, record.hashed_key):
            return record
    return None
