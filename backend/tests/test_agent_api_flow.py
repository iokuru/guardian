from app.models.user import User
from app.domains.identity.schemas import ApiKeyCreate
from app.domains.identity.service import create_api_key_for_user
from app.core.security import hash_password


def create_agent_service_account(db, username="agent_system_user"):
    user = User(
        username=username,
        email=f"{username}@example.com",
        hashed_password=hash_password("agentpassword123"),
        role="Developer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    api_key_obj, raw_secret = create_api_key_for_user(
        db,
        user_id=user.id,
        data=ApiKeyCreate(name="deploy_agent_key", scopes=["action:evaluate"]),
    )
    return user, raw_secret


def test_agent_api_key_authentication_and_three_decision_paths(client, db):
    user, api_key = create_agent_service_account(db, "agent_owner_1")

    # Automated agent authenticates with API key via Bearer token
    headers = {"Authorization": f"Bearer {api_key}"}

    # 1. Safe action -> allow
    safe_res = client.post(
        "/analysis",
        headers=headers,
        json={
            "action": "ls -la /tmp",
            "context": "read temporary cache",
            "agent_id": "cleanup-agent-01",
        },
    )
    assert safe_res.status_code == 200
    safe_data = safe_res.json()
    assert safe_data["decision"].lower() == "allow"
    assert safe_data["risk_score"] < 0.50
    assert safe_data["request_id"].startswith("req_")

    # 2. Critical action -> block
    crit_res = client.post(
        "/analysis",
        headers=headers,
        json={
            "action": "Delete all customer records",
            "context": "Production database",
            "agent_id": "customer-support-agent",
        },
    )
    assert crit_res.status_code == 200
    crit_data = crit_res.json()
    assert crit_data["decision"].lower() == "block"
    assert crit_data["risk_level"].lower() == "critical"
    assert crit_data["request_id"].startswith("req_")

    # 3. Risky action -> review (and review record created)
    # Also verify X-API-Key header works identically
    review_res = client.post(
        "/analysis",
        headers={"X-API-Key": api_key},
        json={
            "action": "grant admin permissions to dev team",
            "context": "Staging cluster",
            "agent_id": "auth-provisioner-agent",
        },
    )
    assert review_res.status_code == 200
    review_data = review_res.json()
    assert review_data["decision"].lower() == "review"
    assert review_data["review_id"] is not None
    assert review_data["request_id"].startswith("req_")
