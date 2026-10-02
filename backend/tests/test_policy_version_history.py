import pytest
from app.models.user import User
from app.domains.policies.models import Policy
from app.core.security import hash_password, create_access_token


def create_admin_user(db, username="policy_admin_lifecycle"):
    user = User(
        username=username,
        email=f"{username}@example.com",
        hashed_password=hash_password("adminpass123"),
        role="Admin",
        workspace_id=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.role, workspace_id=1)
    return user, {"Authorization": f"Bearer {token}"}


def test_policy_version_lifecycle_and_audit_immutability(client, db):
    user, headers = create_admin_user(db)

    active_resp = client.get("/policies/active?environment=Production", headers=headers)
    assert active_resp.status_code == 200
    initial_version = active_resp.json()["version"]
    assert initial_version == "v1.4"

    eval_1 = client.post(
        "/analysis",
        headers=headers,
        json={"action": "ls -l /home", "context": "Initial inspection"},
    )
    assert eval_1.status_code == 200
    data_1 = eval_1.json()
    req_1 = data_1["request_id"]

    timeline_1_before = client.get(f"/audit/requests/{req_1}", headers=headers).json()
    assert timeline_1_before["policy_version"] == "v1.4"
    auto_stage_1 = next(s for s in timeline_1_before["timeline"] if s["stage"] == "AUTOMATED_DECISION")
    assert auto_stage_1["actor"] == "Policy v1.4"

    new_policy_resp = client.post(
        "/policies",
        headers=headers,
        json={
            "environment": "Production",
            "version": "v1.5",
            "name": "Production Zero-Trust Enhanced",
            "block_threshold": 0.75,
            "review_threshold": 0.45,
            "low_threshold": 0.15,
            "rules": [
                {"category": "DESTRUCTIVE", "decision": "BLOCK", "reason": "Destructive actions blocked in v1.5"},
                {"category": "CREDENTIAL_ACCESS", "decision": "BLOCK", "reason": "Credential access blocked in v1.5"},
            ],
        },
    )
    assert new_policy_resp.status_code == 201
    created_policy = new_policy_resp.json()
    assert created_policy["version"] == "v1.5"
    assert created_policy["is_active"] is True

    all_policies = client.get("/policies", headers=headers).json()
    v14_record = next(p for p in all_policies if p["version"] == "v1.4")
    v15_record = next(p for p in all_policies if p["version"] == "v1.5")
    assert v14_record["is_active"] is False
    assert v15_record["is_active"] is True

    active_now = client.get("/policies/active?environment=Production", headers=headers).json()
    assert active_now["version"] == "v1.5"

    eval_2 = client.post(
        "/analysis",
        headers=headers,
        json={"action": "cat /etc/hosts", "context": "New policy check"},
    )
    assert eval_2.status_code == 200
    data_2 = eval_2.json()
    req_2 = data_2["request_id"]

    timeline_2 = client.get(f"/audit/requests/{req_2}", headers=headers).json()
    assert timeline_2["policy_version"] == "v1.5"
    auto_stage_2 = next(s for s in timeline_2["timeline"] if s["stage"] == "AUTOMATED_DECISION")
    assert auto_stage_2["actor"] == "Policy v1.5"

    timeline_1_after = client.get(f"/audit/requests/{req_1}", headers=headers).json()
    assert timeline_1_after["policy_version"] == "v1.4"
    auto_stage_1_after = next(s for s in timeline_1_after["timeline"] if s["stage"] == "AUTOMATED_DECISION")
    assert auto_stage_1_after["actor"] == "Policy v1.4"
