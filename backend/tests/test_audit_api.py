from app.core.security import create_access_token, hash_password
from app.models.audit_log import AuditLog
from app.models.user import User


def create_user(db, username, email, role="ANALYST"):
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password("password123"),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_headers(user):
    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


def create_audit(db, user_id, analysis_id, action="Test action"):
    log = AuditLog(
        user_id=user_id,
        analysis_id=analysis_id,
        action=action,
        decision="BLOCK",
        risk_score=1.0,
        risk_level="CRITICAL",
        policy_version="1.0",
        detector_version="1.0",
        semantic_model="all-MiniLM-L6-v2",
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def test_analyst_sees_only_own_logs(client, db):
    user1 = create_user(
        db,
        "user1",
        "user1@example.com",
    )
    user2 = create_user(
        db,
        "user2",
        "user2@example.com",
    )

    create_audit(db, user1.id, 1, "User 1 action")
    create_audit(db, user2.id, 2, "User 2 action")

    response = client.get(
        "/audit-logs",
        headers=get_headers(user1),
    )

    assert response.status_code == 200

    logs = response.json()

    assert len(logs) == 1
    assert logs[0]["user_id"] == user1.id
    assert logs[0]["action"] == "User 1 action"


def test_admin_sees_all_logs(client, db):
    admin = create_user(
        db,
        "admin",
        "admin@example.com",
        role="ADMIN",
    )
    user = create_user(
        db,
        "user",
        "user@example.com",
    )

    create_audit(db, admin.id, 1, "Admin action")
    create_audit(db, user.id, 2, "User action")

    response = client.get(
        "/audit-logs",
        headers=get_headers(admin),
    )

    assert response.status_code == 200

    logs = response.json()

    assert len(logs) == 2
    assert {log["user_id"] for log in logs} == {
        admin.id,
        user.id,
    }


def test_audit_logs_requires_authentication(client):
    response = client.get("/audit-logs")

    assert response.status_code == 401


def test_audit_logs_limit(client, db):
    user = create_user(
        db,
        "limituser",
        "limit@example.com",
    )

    for i in range(5):
        create_audit(
            db,
            user.id,
            i + 1,
            f"Action {i}",
        )

    response = client.get(
        "/audit-logs?limit=2",
        headers=get_headers(user),
    )

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_filter_audit_logs_by_decision(client, db):
    user = create_user(
        db,
        "decisionuser",
        "decision@example.com",
    )

    create_audit(
        db,
        user.id,
        1,
        "Blocked action",
    )

    log = AuditLog(
        user_id=user.id,
        analysis_id=2,
        action="Allowed action",
        decision="ALLOW",
        risk_score=0.1,
        risk_level="LOW",
        policy_version="1.0",
        detector_version="1.0",
        semantic_model="all-MiniLM-L6-v2",
    )
    db.add(log)
    db.commit()

    response = client.get(
        "/audit-logs?decision=BLOCK",
        headers=get_headers(user),
    )

    assert response.status_code == 200

    logs = response.json()

    assert len(logs) == 1
    assert logs[0]["decision"] == "BLOCK"


def test_filter_audit_logs_by_risk_level(client, db):
    user = create_user(
        db,
        "riskuser",
        "risk@example.com",
    )

    create_audit(
        db,
        user.id,
        1,
        "Critical action",
    )

    log = AuditLog(
        user_id=user.id,
        analysis_id=2,
        action="Low risk action",
        decision="ALLOW",
        risk_score=0.1,
        risk_level="LOW",
        policy_version="1.0",
        detector_version="1.0",
        semantic_model="all-MiniLM-L6-v2",
    )
    db.add(log)
    db.commit()

    response = client.get(
        "/audit-logs?risk_level=CRITICAL",
        headers=get_headers(user),
    )

    assert response.status_code == 200

    logs = response.json()

    assert len(logs) == 1
    assert logs[0]["risk_level"] == "CRITICAL"


def test_filter_audit_logs_by_decision_and_risk_level(client, db):
    user = create_user(
        db,
        "combineduser",
        "combined@example.com",
    )

    create_audit(
        db,
        user.id,
        1,
        "Blocked critical action",
    )

    log = AuditLog(
        user_id=user.id,
        analysis_id=2,
        action="Review action",
        decision="REVIEW",
        risk_score=0.6,
        risk_level="HIGH",
        policy_version="1.0",
        detector_version="1.0",
        semantic_model="all-MiniLM-L6-v2",
    )
    db.add(log)
    db.commit()

    response = client.get(
        "/audit-logs?decision=BLOCK&risk_level=CRITICAL",
        headers=get_headers(user),
    )

    assert response.status_code == 200

    logs = response.json()

    assert len(logs) == 1
    assert logs[0]["decision"] == "BLOCK"
    assert logs[0]["risk_level"] == "CRITICAL"


def test_invalid_decision_filter_returns_422(client, db):
    user = create_user(
        db,
        "invaliddecision",
        "invaliddecision@example.com",
    )

    response = client.get(
        "/audit-logs?decision=INVALID",
        headers=get_headers(user),
    )

    assert response.status_code == 422


def test_invalid_risk_level_filter_returns_422(client, db):
    user = create_user(
        db,
        "invalidrisk",
        "invalidrisk@example.com",
    )

    response = client.get(
        "/audit-logs?risk_level=INVALID",
        headers=get_headers(user),
    )

    assert response.status_code == 422