from app.models.user import User
from app.core.security import create_access_token, hash_password


def create_test_user(db, username="policy_admin", role="Admin"):
    user = User(
        username=username,
        email=f"{username}@example.com",
        hashed_password=hash_password("password123"),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_auth_header(user):
    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


def test_policies_environments_and_activation(client, db):
    user = create_test_user(db, "admin_pol")
    headers = get_auth_header(user)

    # 1. Fetch active policy for production
    res = client.get("/policies/active?environment=Production", headers=headers)
    assert res.status_code == 200
    prod_policy = res.json()
    assert prod_policy["environment"] == "Production"
    assert prod_policy["version"] == "v1.4"
    assert prod_policy["is_active"] is True

    # 2. Create a new policy version v1.5
    new_pol = client.post(
        "/policies",
        headers=headers,
        json={
            "environment": "Production",
            "version": "v1.5",
            "name": "Strict Production Policy",
            "block_threshold": 0.75,
            "review_threshold": 0.45,
            "low_threshold": 0.15,
            "rules": [
                {"category": "DESTRUCTIVE", "decision": "BLOCK", "reason": "No destructive actions allowed"}
            ],
        },
    )
    assert new_pol.status_code == 201
    created = new_pol.json()
    assert created["version"] == "v1.5"
    assert created["is_active"] is True

    # 3. Check that v1.5 is now the active policy for Production
    active_res = client.get("/policies/active?environment=Production", headers=headers)
    assert active_res.status_code == 200
    assert active_res.json()["version"] == "v1.5"


def test_request_lifecycle_timeline(client, db):
    user = create_test_user(db, "investigator_user")
    headers = get_auth_header(user)

    # 1. Trigger an action that evaluates to REVIEW
    analyze_res = client.post(
        "/analyze",
        headers=headers,
        json={
            "action": "grant admin permissions to new employee",
            "context": "Internal corporate dashboard",
        },
    )
    assert analyze_res.status_code == 200
    res_data = analyze_res.json()
    assert res_data["decision"] == "REVIEW"
    req_id = res_data["request_id"]
    review_id = res_data["review_id"]

    # 2. Approve the review
    approve_res = client.post(
        f"/reviews/{review_id}/approve",
        headers=headers,
        json={"notes": "Identity verified by manager", "reviewer_name": "Krishna"},
    )
    assert approve_res.status_code == 200

    # 3. Query the complete chronological timeline for this request_id
    timeline_res = client.get(f"/audit/requests/{req_id}", headers=headers)
    assert timeline_res.status_code == 200
    timeline_data = timeline_res.json()

    assert timeline_data["request_id"] == req_id
    assert len(timeline_data["timeline"]) >= 4

    stages = [stage["stage"] for stage in timeline_data["timeline"]]
    assert "INGESTION" in stages
    assert "RISK_ANALYSIS" in stages
    assert "AUTOMATED_DECISION" in stages
    assert "HUMAN_DECISION" in stages
