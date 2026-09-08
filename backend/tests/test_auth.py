from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models.database import Base
from app.models.dependencies import get_db
from app.core.security import decode_access_token


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

Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def test_register_user():
    response = client.post(
        "/auth/register",
        json={
            "username": "alice",
            "email": "alice@example.com",
            "password": "password123",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["username"] == "alice"
    assert data["email"] == "alice@example.com"
    assert data["role"] == "ANALYST"
    assert "hashed_password" not in data


def test_duplicate_username_rejected():
    response = client.post(
        "/auth/register",
        json={
            "username": "alice",
            "email": "another@example.com",
            "password": "password123",
        },
    )

    assert response.status_code == 409


def test_duplicate_email_rejected():
    response = client.post(
        "/auth/register",
        json={
            "username": "another",
            "email": "alice@example.com",
            "password": "password123",
        },
    )

    assert response.status_code == 409


def test_login_success():
    response = client.post(
        "/auth/login",
        json={
            "username": "alice",
            "password": "password123",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password():
    response = client.post(
        "/auth/login",
        json={
            "username": "alice",
            "password": "wrongpassword",
        },
    )

    assert response.status_code == 401


def test_login_invalid_username():
    response = client.post(
        "/auth/login",
        json={
            "username": "doesnotexist",
            "password": "password123",
        },
    )

    assert response.status_code == 401


def test_jwt_contains_user_identity():
    login_response = client.post(
        "/auth/login",
        json={
            "username": "alice",
            "password": "password123",
        },
    )

    token = login_response.json()["access_token"]

    payload = decode_access_token(token)

    assert payload["sub"] == "1"
    assert payload["role"] == "ANALYST"
    assert "exp" in payload


def test_analyze_requires_authentication():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete customer records",
            "context": "Production database",
        },
        headers={},
    )

    assert response.status_code == 401


def test_analyze_rejects_invalid_token():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete customer records",
            "context": "Production database",
        },
        headers={
            "Authorization": "Bearer invalid-token",
        },
    )

    assert response.status_code == 401