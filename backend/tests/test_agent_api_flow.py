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


def test_review_approve_and_reject_lifecycle(client, db):
    from app.core.security import create_access_token

    # 1. Setup agent credential and human reviewer account
    agent_owner, api_key = create_agent_service_account(db, "agent_owner_2")
    reviewer = User(
        username="lead_reviewer",
        email="lead_reviewer@example.com",
        hashed_password=hash_password("revpass123"),
        role="Reviewer",
    )
    db.add(reviewer)
    db.commit()
    db.refresh(reviewer)

    reviewer_headers = {
        "Authorization": f"Bearer {create_access_token(reviewer.id, reviewer.role)}"
    }
    agent_headers = {"Authorization": f"Bearer {api_key}"}

    # 2. Agent triggers review path for action A
    res_a = client.post(
        "/analysis",
        headers=agent_headers,
        json={
            "action": "grant admin permissions to dev team",
            "context": "Staging cluster",
            "agent_id": "access-broker-agent",
        },
    )
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["decision"].lower() == "review"
    review_a_id = data_a["review_id"]
    analysis_a_id = data_a["analysis_id"]

    # Human reviewer inspects review item
    rev_get = client.get(f"/reviews/{review_a_id}", headers=reviewer_headers)
    assert rev_get.status_code == 200
    assert rev_get.json()["status"] == "PENDING"

    # Human reviewer approves review A
    appr_res = client.post(
        f"/reviews/{review_a_id}/approve",
        headers=reviewer_headers,
        json={"notes": "Verified by security lead", "reviewer_name": "lead_reviewer"},
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"

    # Verify final decision on analysis record is ALLOW
    analysis_a = client.get(f"/analyses/{analysis_a_id}", headers=agent_headers).json()
    assert analysis_a["decision"].lower() == "allow"
    assert appr_res.json()["analysis"]["decision"].lower() == "allow"

    # 3. Agent triggers review path for action B
    res_b = client.post(
        "/analysis",
        headers=agent_headers,
        json={
            "action": "sudo access for debug script",
            "context": "Staging testing environment",
            "agent_id": "reporting-agent",
        },
    )
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["decision"].lower() == "review"
    review_b_id = data_b["review_id"]
    analysis_b_id = data_b["analysis_id"]

    # Human reviewer rejects review B
    rej_res = client.post(
        f"/reviews/{review_b_id}/reject",
        headers=reviewer_headers,
        json={"notes": "Contractor network prohibited from payroll access", "reviewer_name": "lead_reviewer"},
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "REJECTED"

    # Verify final decision on analysis record is BLOCK
    analysis_b = client.get(f"/analyses/{analysis_b_id}", headers=agent_headers).json()
    assert analysis_b["decision"].lower() == "block"
    assert rej_res.json()["analysis"]["decision"].lower() == "block"


def test_end_to_end_request_correlation_lifecycle(client, db):
    from app.core.security import create_access_token

    # 1. Setup agent credential and human reviewer account
    agent_owner, api_key = create_agent_service_account(db, "agent_owner_corr")
    reviewer = User(
        username="audit_officer",
        email="audit_officer@example.com",
        hashed_password=hash_password("auditpass123"),
        role="Admin",
    )
    db.add(reviewer)
    db.commit()
    db.refresh(reviewer)

    reviewer_headers = {
        "Authorization": f"Bearer {create_access_token(reviewer.id, reviewer.role)}"
    }
    agent_headers = {"Authorization": f"Bearer {api_key}"}

    # 2. Automated system submits action to Guardian API
    action_text = "grant admin permissions to staging cluster"
    context_text = "Staging deployment pipeline"
    agent_id = "ci-cd-runner-09"

    eval_res = client.post(
        "/analysis",
        headers=agent_headers,
        json={
            "action": action_text,
            "context": context_text,
            "agent_id": agent_id,
        },
    )
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    req_id = eval_data["request_id"]
    review_id = eval_data["review_id"]
    assert req_id.startswith("req_")
    assert review_id is not None

    # 3. Human reviewer signs off
    appr_res = client.post(
        f"/reviews/{review_id}/approve",
        headers=reviewer_headers,
        json={"notes": "Signed off for staging release", "reviewer_name": "audit_officer"},
    )
    assert appr_res.status_code == 200

    # 4. Prove correlation: retrieve full chronological lifecycle using the single request_id
    timeline_res = client.get(f"/audit/requests/{req_id}", headers=reviewer_headers)
    assert timeline_res.status_code == 200
    corr = timeline_res.json()

    assert corr["request_id"] == req_id
    assert corr["action"] == action_text

    stages = corr["timeline"]
    stage_names = [s["stage"] for s in stages]

    # Verify agent and ingestion
    assert "INGESTION" in stage_names
    ingestion = next(s for s in stages if s["stage"] == "INGESTION")
    assert ingestion["actor"] == agent_id
    assert ingestion["metadata"]["context"] == context_text

    # Verify risk analysis and findings
    assert "RISK_ANALYSIS" in stage_names
    risk_stage = next(s for s in stages if s["stage"] == "RISK_ANALYSIS")
    assert "findings" in risk_stage["metadata"]
    assert len(risk_stage["metadata"]["findings"]) > 0

    # Verify automated policy evaluation decision
    assert "AUTOMATED_DECISION" in stage_names
    auto_stage = next(s for s in stages if s["stage"] == "AUTOMATED_DECISION")
    assert auto_stage["outcome"] == "REVIEW"

    # Verify review queueing
    assert "REVIEW_PENDING" in stage_names

    # Verify human reviewer decision
    assert "HUMAN_DECISION" in stage_names
    human_stage = next(s for s in stages if s["stage"] == "HUMAN_DECISION")
    assert human_stage["actor"] == "audit_officer"
    assert human_stage["outcome"] == "ALLOW"
    assert human_stage["metadata"]["notes"] == "Signed off for staging release"

    # Verify immutable audit trail record
    assert "AUDIT" in stage_names


