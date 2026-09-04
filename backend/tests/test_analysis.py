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


def test_empty_action_is_rejected():
    response = client.post(
        "/analyze",
        json={
            "action": "",
            "context": "Production database"
        }
    )

    assert response.status_code == 422


def test_empty_context_is_rejected():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete all customer records",
            "context": ""
        }
    )

    assert response.status_code == 422


def test_production_read_is_medium_risk():
    response = client.post(
        "/analyze",
        json={
            "action": "Read customer information",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "ALLOW"
    assert data["risk_score"] == 0.25
    assert data["risk_level"] == "MEDIUM"
    assert data["reasons"] == ["Production environment"]


def test_privilege_escalation_in_production_is_blocked():
    response = client.post(
        "/analyze",
        json={
            "action": "Grant admin privileges to a user",
            "context": "Production system"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_score"] == 0.85
    assert data["risk_level"] == "CRITICAL"
    assert data["reasons"] == [
        "Privilege escalation",
        "Production environment"
    ]


def test_credential_access_in_production_is_blocked():
    response = client.post(
        "/analyze",
        json={
            "action": "Retrieve the API key",
            "context": "Production environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_score"] == 0.85
    assert data["risk_level"] == "CRITICAL"
    assert data["reasons"] == [
        "Credential access",
        "Production environment"
    ]


def test_multiple_risks_are_combined():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete the database and retrieve the API key",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_score"] == 1.0
    assert data["risk_level"] == "CRITICAL"
    assert data["reasons"] == [
        "Destructive action",
        "Credential access",
        "Production environment"
    ]


def test_customer_data_scope_is_detected():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete all customer records",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scopes"] == ["CUSTOMER_DATA"]


def test_financial_data_scope_is_detected():
    response = client.post(
        "/analyze",
        json={
            "action": "Export financial data",
            "context": "Internal system"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scopes"] == ["FINANCIAL_DATA"]


def test_database_scope_is_detected():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete the database",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scopes"] == ["DATABASE"]


def test_temporary_files_scope_is_detected():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete temporary files",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scopes"] == ["TEMPORARY_FILES"]



def test_action_without_scope_returns_empty_scope():
    response = client.post(
        "/analyze",
        json={
            "action": "Restart the application",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scopes"] == []