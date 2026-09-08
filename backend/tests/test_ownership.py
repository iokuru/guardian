from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models.database import Base
from app.models.dependencies import get_db
from app.models.user import User
from app.core.security import create_access_token, hash_password


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


def create_user(username: str, email: str) -> User:
    db = TestingSessionLocal()

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password("password123"),
        role="ANALYST",
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    return user


def get_auth_headers(user: User):
    token = create_access_token(user.id, user.role)

    return {
        "Authorization": f"Bearer {token}",
    }


def test_user_only_sees_own_analyses():
    user_a = create_user("usera", "usera@example.com")
    user_b = create_user("userb", "userb@example.com")

    response_a = client.post(
        "/analyze",
        json={
            "action": "Delete customer records",
            "context": "Production database",
        },
        headers=get_auth_headers(user_a),
    )

    assert response_a.status_code == 200

    response_b = client.post(
        "/analyze",
        json={
            "action": "Read customer information",
            "context": "Development database",
        },
        headers=get_auth_headers(user_b),
    )

    assert response_b.status_code == 200

    history_a = client.get(
        "/analyses",
        headers=get_auth_headers(user_a),
    )

    assert history_a.status_code == 200

    analyses_a = history_a.json()

    assert len(analyses_a) == 1
    assert analyses_a[0]["action"] == "Delete customer records"


def test_user_cannot_access_another_users_analysis():
    user_a = create_user("usera2", "usera2@example.com")
    user_b = create_user("userb2", "userb2@example.com")

    response = client.post(
        "/analyze",
        json={
            "action": "Delete customer records",
            "context": "Production database",
        },
        headers=get_auth_headers(user_a),
    )

    assert response.status_code == 200

    history = client.get(
        "/analyses",
        headers=get_auth_headers(user_a),
    )

    assert history.status_code == 200

    analyses = history.json()

    assert len(analyses) == 1

    analysis_id = analyses[0]["id"]

    response = client.get(
        f"/analyses/{analysis_id}",
        headers=get_auth_headers(user_b),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Analysis not found"


def test_user_can_access_own_analysis():
    user = create_user("owner", "owner@example.com")

    response = client.post(
        "/analyze",
        json={
            "action": "Delete customer records",
            "context": "Production database",
        },
        headers=get_auth_headers(user),
    )

    assert response.status_code == 200

    history = client.get(
        "/analyses",
        headers=get_auth_headers(user),
    )

    assert history.status_code == 200

    analyses = history.json()

    assert len(analyses) == 1

    analysis_id = analyses[0]["id"]

    response = client.get(
        f"/analyses/{analysis_id}",
        headers=get_auth_headers(user),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == analysis_id
    assert data["action"] == "Delete customer records"