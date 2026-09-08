from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import decode_access_token
from app.main import app
from app.models.database import Base
from app.models.dependencies import get_db

import jwt
from datetime import datetime, timedelta, timezone

from app.core.security import create_access_token

from app.core.security import SECRET_KEY, ALGORITHM

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


def register_alice():
    return client.post(
        "/auth/register",
        json={
            "username": "alice",
            "email": "alice@example.com",
            "password": "password123",
        },
    )


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
    register_alice()

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
    register_alice()

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
    register_alice()

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
    register_alice()

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
    register_alice()

    login_response = client.post(
        "/auth/login",
        json={
            "username": "alice",
            "password": "password123",
        },
    )

    assert login_response.status_code == 200

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


def test_register_rejects_invalid_email(client):
    response = client.post(
        "/auth/register",
        json={
            "username": "invalidemail",
            "email": "not-an-email",
            "password": "password123",
        },
    )

    assert response.status_code == 422


def test_register_rejects_blank_email(client):
    response = client.post(
        "/auth/register",
        json={
            "username": "blankemail",
            "email": "",
            "password": "password123",
        },
    )

    assert response.status_code == 422



def test_register_rejects_blank_username(client):
    response = client.post(
        "/auth/register",
        json={
            "username": "   ",
            "email": "blankuser@example.com",
            "password": "password123",
        },
    )

    assert response.status_code == 422



def test_register_strips_username_whitespace(client):
    response = client.post(
        "/auth/register",
        json={
            "username": "  alice  ",
            "email": "alice@example.com",
            "password": "password123",
        },
    )

    assert response.status_code == 201
    assert response.json()["username"] == "alice"



def test_invalid_token_missing_sub(client):
    import jwt

    from app.core.security import SECRET_KEY, ALGORITHM

    token = jwt.encode(
        {
            "role": "ANALYST",
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    response = client.get(
        "/analyses",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_invalid_token_user_id(client):
    import jwt

    from app.core.security import SECRET_KEY, ALGORITHM

    token = jwt.encode(
        {
            "sub": "abc",
            "role": "ANALYST",
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    response = client.get(
        "/analyses",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401



def test_invalid_token_role(client):
    import jwt

    from app.core.security import SECRET_KEY, ALGORITHM

    token = jwt.encode(
        {
            "sub": "1",
            "role": "SUPERUSER",
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    response = client.get(
        "/analyses",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401



def test_expired_token_returns_401(client):
    token = jwt.encode(
        {
            "sub": "1",
            "role": "ANALYST",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    response = client.get(
        "/analyses",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"  

def create_user(db, role="ANALYST"):
    from app.models.user import User

    user = User(
        username="deleted-user",
        email="deleted-user@example.com",
        hashed_password="hashed-password",
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

