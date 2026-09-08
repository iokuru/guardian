import pytest
from app.core.security import create_access_token, hash_password
from app.models.analysis import Analysis
from app.models.audit_log import AuditLog
from app.models.user import User


def create_user(db, username="audituser", email="audit@example.com"):
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password("password123"),
        role="ANALYST",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def get_auth_headers(user):
    token = create_access_token(user.id, user.role)

    return {
        "Authorization": f"Bearer {token}",
    }


def test_analysis_creates_audit_log(client, db):
    user = create_user(db)

    response = client.post(
        "/analyze",
        json={
            "action": "Delete customer records",
            "context": "Production database",
        },
        headers=get_auth_headers(user),
    )

    assert response.status_code == 200

    logs = db.query(AuditLog).all()

    assert len(logs) == 1
    assert logs[0].user_id == user.id
    assert logs[0].action == "Delete customer records"


def test_audit_log_matches_analysis(client, db):
    user = create_user(db)

    response = client.post(
        "/analyze",
        json={
            "action": "Delete customer records",
            "context": "Production database",
        },
        headers=get_auth_headers(user),
    )

    assert response.status_code == 200

    logs = db.query(AuditLog).all()

    assert len(logs) == 1

    log = logs[0]

    assert log.user_id == user.id
    assert log.action == "Delete customer records"
    assert log.decision == "BLOCK"
    assert log.risk_score == 1.0
    assert log.risk_level == "CRITICAL"
    assert log.policy_version == "1.0"
    assert log.detector_version == "1.0"
    assert log.semantic_model == "all-MiniLM-L6-v2"


def test_audit_log_links_to_analysis(client, db):
    user = create_user(db)

    response = client.post(
        "/analyze",
        json={
            "action": "Delete customer records",
            "context": "Production database",
        },
        headers=get_auth_headers(user),
    )

    assert response.status_code == 200

    analysis = db.query(Analysis).one()
    audit_log = db.query(AuditLog).one()

    assert audit_log.analysis_id == analysis.id
    assert audit_log.user_id == analysis.user_id


def test_analysis_and_audit_are_atomic(client, db, monkeypatch):
    user = create_user(db)

    def fail_audit(*args, **kwargs):
        raise RuntimeError("Audit failure")

    monkeypatch.setattr(
        "app.repositories.analysis_repository.create_audit_log",
        fail_audit,
    )

    with pytest.raises(RuntimeError, match="Audit failure"):
        client.post(
            "/analyze",
            json={
                "action": "Delete customer records",
                "context": "Production database",
            },
            headers=get_auth_headers(user),
        )

    assert db.query(Analysis).count() == 0
    assert db.query(AuditLog).count() == 0