from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_production_delete_is_blocked():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete all customer records",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_score"] == 0.95
    assert data["risk_level"] == "CRITICAL"


def test_normal_action_is_low_risk():
    response = client.post(
        "/analyze",
        json={
            "action": "Read customer information",
            "context": "Development database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "ALLOW"
    assert data["risk_score"] == 0.0
    assert data["risk_level"] == "LOW"