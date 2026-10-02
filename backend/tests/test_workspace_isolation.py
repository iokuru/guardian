import pytest
from app.models.user import User
from app.domains.identity.schemas import ApiKeyCreate
from app.domains.identity.service import create_api_key_for_user
from app.domains.agents.schemas import AgentCreate
from app.domains.agents.service import register_agent
from app.domains.policies.schemas import PolicyCreate
from app.domains.policies.service import create_policy_version
from app.core.security import hash_password, create_access_token


def create_user_in_workspace(db, username: str, role: str, workspace_id: int):
    user = User(
        username=username,
        email=f"{username}@example.com",
        hashed_password=hash_password("workspacepass123"),
        role=role,
        workspace_id=workspace_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.role, workspace_id=workspace_id)
    return user, {"Authorization": f"Bearer {token}"}


def test_analyses_and_findings_workspace_isolation(client, db):
    user_a, headers_a = create_user_in_workspace(db, "analyst_ws1", "ANALYST", workspace_id=1)
    user_b, headers_b = create_user_in_workspace(db, "analyst_ws2", "ANALYST", workspace_id=2)

    # User in Workspace 1 runs an analysis
    resp_a = client.post(
        "/analysis",
        headers=headers_a,
        json={"action": "rm -rf /data/ws1", "context": "workspace 1 server"},
    )
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    analysis_id = data_a["analysis_id"]

    # User in Workspace 2 cannot read Workspace 1 analysis
    get_b = client.get(f"/analyses/{analysis_id}", headers=headers_b)
    assert get_b.status_code == 404
    assert get_b.json()["detail"] == "Analysis not found"

    # User in Workspace 2 list does not include Workspace 1 analyses
    list_b = client.get("/analyses", headers=headers_b)
    assert list_b.status_code == 200
    ids_b = [item["id"] for item in list_b.json()]
    assert analysis_id not in ids_b


def test_reviews_and_decisions_workspace_isolation(client, db):
    # Setup users
    agent_owner_1, _ = create_user_in_workspace(db, "agent_owner_ws1", "Developer", workspace_id=1)
    reviewer_ws1, headers_rev1 = create_user_in_workspace(db, "reviewer_ws1", "Reviewer", workspace_id=1)
    reviewer_ws2, headers_rev2 = create_user_in_workspace(db, "reviewer_ws2", "Reviewer", workspace_id=2)

    # API key for Workspace 1 agent
    _, raw_key_1 = create_api_key_for_user(
        db,
        user_id=agent_owner_1.id,
        data=ApiKeyCreate(name="ws1_agent_key", scopes=["action:evaluate"]),
    )
    agent_headers = {"Authorization": f"Bearer {raw_key_1}"}

    # Agent in Workspace 1 triggers review required
    eval_resp = client.post(
        "/analysis",
        headers=agent_headers,
        json={
            "action": "grant admin permissions to dev team",
            "context": "Staging cluster",
            "agent_id": "auth-agent-ws1",
        },
    )
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    assert eval_data["decision"].lower() == "review"
    review_id = eval_data["review_id"]
    req_id = eval_data["request_id"]
    assert review_id is not None

    # Reviewer in Workspace 2 cannot see review in queue
    list_rev2 = client.get("/reviews", headers=headers_rev2)
    assert list_rev2.status_code == 200
    assert not any(r["id"] == review_id for r in list_rev2.json())

    # Reviewer in Workspace 2 cannot fetch review by ID
    get_rev2 = client.get(f"/reviews/{review_id}", headers=headers_rev2)
    assert get_rev2.status_code == 404

    # Reviewer in Workspace 2 cannot fetch review by request ID
    get_by_req2 = client.get(f"/reviews/by-request/{req_id}", headers=headers_rev2)
    assert get_by_req2.status_code == 404

    # Reviewer in Workspace 2 cannot approve Workspace 1 review
    appr_fail = client.post(
        f"/reviews/{review_id}/approve",
        headers=headers_rev2,
        json={"notes": "Unauthorized approval attempt"},
    )
    assert appr_fail.status_code == 404

    # Reviewer in Workspace 2 cannot reject Workspace 1 review
    rej_fail = client.post(
        f"/reviews/{review_id}/reject",
        headers=headers_rev2,
        json={"notes": "Unauthorized rejection attempt"},
    )
    assert rej_fail.status_code == 404

    # Reviewer in Workspace 1 CAN approve their own workspace review
    appr_ok = client.post(
        f"/reviews/{review_id}/approve",
        headers=headers_rev1,
        json={"notes": "Valid approval by WS1 reviewer"},
    )
    assert appr_ok.status_code == 200
    assert appr_ok.json()["status"].lower() == "approved"


def test_audit_logs_and_timeline_workspace_isolation(client, db):
    admin_ws1, headers_admin1 = create_user_in_workspace(db, "admin_ws1", "Admin", workspace_id=1)
    admin_ws2, headers_admin2 = create_user_in_workspace(db, "admin_ws2", "Admin", workspace_id=2)

    # Perform action in Workspace 1
    resp1 = client.post(
        "/analysis",
        headers=headers_admin1,
        json={"action": "restart production service", "context": "Workspace 1 ops"},
    )
    assert resp1.status_code == 200
    req_id_1 = resp1.json()["request_id"]

    # Admin in Workspace 2 cannot see Workspace 1 audit logs
    audit_ws2 = client.get("/audit-logs", headers=headers_admin2)
    assert audit_ws2.status_code == 200
    assert not any(log.get("request_id") == req_id_1 for log in audit_ws2.json())

    # Admin in Workspace 2 cannot see Workspace 1 request timeline
    timeline_ws2 = client.get(f"/audit/requests/{req_id_1}", headers=headers_admin2)
    assert timeline_ws2.status_code == 404


def test_agents_workspace_isolation(client, db):
    user_ws1, headers_ws1 = create_user_in_workspace(db, "dev_ws1", "Developer", workspace_id=1)
    user_ws2, headers_ws2 = create_user_in_workspace(db, "dev_ws2", "Developer", workspace_id=2)

    # Register an agent in Workspace 1
    create_agent_resp = client.post(
        "/agents",
        headers=headers_ws1,
        json={
            "agent_id": "exclusive-ws1-bot",
            "name": "Exclusive WS1 Bot",
            "description": "Agent belonging strictly to workspace 1",
            "environment": "Production",
        },
    )
    assert create_agent_resp.status_code == 201

    # Workspace 2 agent list does not contain Workspace 1 agent
    agents_ws2 = client.get("/agents", headers=headers_ws2)
    assert agents_ws2.status_code == 200
    agent_ids_ws2 = [a["agent_id"] for a in agents_ws2.json()]
    assert "exclusive-ws1-bot" not in agent_ids_ws2


def test_api_keys_workspace_isolation(client, db):
    user_ws1, headers_ws1 = create_user_in_workspace(db, "keyowner_ws1", "Developer", workspace_id=1)
    user_ws2, headers_ws2 = create_user_in_workspace(db, "keyowner_ws2", "Developer", workspace_id=2)

    # Create key in Workspace 1
    key_resp = client.post(
        "/integrations/keys",
        headers=headers_ws1,
        json={"name": "ws1-secret-worker", "scopes": ["action:evaluate"]},
    )
    assert key_resp.status_code == 201
    key_id_1 = key_resp.json()["id"]

    # Workspace 2 keys list does not include Workspace 1 key
    keys_ws2 = client.get("/integrations/keys", headers=headers_ws2)
    assert keys_ws2.status_code == 200
    assert not any(k["id"] == key_id_1 for k in keys_ws2.json())

    # User in Workspace 2 cannot delete Workspace 1 key
    del_resp = client.delete(f"/integrations/keys/{key_id_1}", headers=headers_ws2)
    assert del_resp.status_code == 404


def test_policies_workspace_isolation(client, db):
    admin_ws1, headers_ws1 = create_user_in_workspace(db, "policy_admin_ws1", "Admin", workspace_id=1)
    admin_ws2, headers_ws2 = create_user_in_workspace(db, "policy_admin_ws2", "Admin", workspace_id=2)

    # Create custom policy in Workspace 1
    create_pol = client.post(
        "/policies",
        headers=headers_ws1,
        json={
            "environment": "Sandbox",
            "version": "v9.9-ws1",
            "name": "Strict WS1 Sandbox",
            "block_threshold": 0.50,
            "review_threshold": 0.30,
            "low_threshold": 0.10,
            "rules": [],
        },
    )
    assert create_pol.status_code == 201
    pol_id_1 = create_pol.json()["id"]

    # Policies in Workspace 2 do not list Workspace 1 custom policy
    pols_ws2 = client.get("/policies", headers=headers_ws2)
    assert pols_ws2.status_code == 200
    assert not any(p["id"] == pol_id_1 or p["version"] == "v9.9-ws1" for p in pols_ws2.json())

    # User in Workspace 2 cannot activate Workspace 1 policy
    act_resp = client.post(f"/policies/{pol_id_1}/activate", headers=headers_ws2)
    assert act_resp.status_code == 404
