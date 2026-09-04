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


def test_privilege_escalation_requires_review():
    response = client.post(
        "/analyze",
        json={
            "action": "Grant admin privileges to a user",
            "context": "Internal system"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "REVIEW"
    assert data["risk_score"] == 0.60
    assert data["risk_level"] == "HIGH"


def test_credential_access_requires_review():
    response = client.post(
        "/analyze",
        json={
            "action": "Retrieve the API key",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "REVIEW"
    assert data["risk_score"] == 0.60
    assert data["risk_level"] == "HIGH"


def test_data_exfiltration_is_blocked():
    response = client.post(
        "/analyze",
        json={
            "action": "Export customer data",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_score"] == 1.0
    assert data["risk_level"] == "CRITICAL"


def test_keyword_inside_word_does_not_trigger():
    response = client.post(
        "/analyze",
        json={
            "action": "Review the deletion policy",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "ALLOW"
    assert data["risk_score"] == 0.0
    assert data["risk_level"] == "LOW"
    assert data["reasons"] == []