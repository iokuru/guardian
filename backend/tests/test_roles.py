import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.database import Base
from app.models.dependencies import get_db
from app.models.user import User


test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
)


def override_get_db():
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def test_environment():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    previous_override = app.dependency_overrides.get(get_db)

    app.dependency_overrides[get_db] = override_get_db

    yield

    if previous_override is None:
        app.dependency_overrides.pop(get_db, None)
    else:
        app.dependency_overrides[get_db] = previous_override


client = TestClient(app)

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield


def create_user(username: str, email: str, role: str) -> User:
    db = TestingSessionLocal()

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password("password123"),
        role=role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    return user


def get_auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(user.id, user.role)

    return {
        "Authorization": f"Bearer {token}",
    }


def test_analyst_cannot_list_users():
    analyst = create_user(
        "analyst",
        "analyst@example.com",
        "ANALYST",
    )

    response = client.get(
        "/auth/users",
        headers=get_auth_headers(analyst),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Insufficient permissions"


def test_admin_can_list_users():
    admin = create_user(
        "admin",
        "admin@example.com",
        "ADMIN",
    )

    response = client.get(
        "/auth/users",
        headers=get_auth_headers(admin),
    )

    assert response.status_code == 200

    users = response.json()

    assert len(users) == 1
    assert users[0]["username"] == "admin"
    assert users[0]["role"] == "ADMIN"


def test_unauthenticated_user_cannot_list_users():
    response = client.get("/auth/users")

    assert response.status_code == 401