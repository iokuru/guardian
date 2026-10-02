import pytest
from app.models.user import User
from app.domains.identity.schemas import ApiKeyCreate
from app.domains.identity.service import create_api_key_for_user
from app.core.security import hash_password

from guardian import Guardian


@pytest.fixture
def agent_api_key(db):
    user = User(
        username="sdk_agent_runner",
        email="sdk_agent@example.com",
        hashed_password=hash_password("agentpassword123"),
        role="Developer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _, raw_key = create_api_key_for_user(
        db,
        user_id=user.id,
        data=ApiKeyCreate(name="sdk_test_key", scopes=["action:evaluate"]),
    )
    return user, raw_key


@pytest.fixture
def reviewer_user(db):
    reviewer = User(
        username="security_reviewer_sdk",
        email="reviewer_sdk@example.com",
        hashed_password=hash_password("reviewerpass123"),
        role="Reviewer",
    )
    db.add(reviewer)
    db.commit()
    db.refresh(reviewer)
    return reviewer


def test_sdk_against_real_api_full_workflow(client, db, agent_api_key, reviewer_user):
    user, api_key = agent_api_key
    guardian = Guardian(api_key=api_key, transport=client)

    # 1. Safe action -> allow
    safe_result = guardian.analyze(
        action="ls -la /var/log",
        context="Developer terminal inspection",
        agent_id="dev-assistant",
    )
    assert safe_result.is_allowed is True
    assert safe_result.is_review_required is False
    assert safe_result.is_blocked is False
    assert safe_result.decision == "allow"
    assert safe_result.request_id.startswith("req_")

    # 2. Critical action -> block
    block_result = guardian.analyze(
        action="drop database production_db",
        context="DB admin shell",
        agent_id="db-assistant",
    )
    assert block_result.is_blocked is True
    assert block_result.is_allowed is False
    assert block_result.is_review_required is False
    assert block_result.decision == "block"
    assert len(block_result.findings) > 0
    assert any(f.category.lower() in ("destructive", "database") for f in block_result.findings)

    # 3. Risky action -> review required
    risky_result = guardian.analyze(
        action="grant admin access to user_42",
        context="Staging cluster",
        agent_id="access-bot",
    )
    assert risky_result.is_review_required is True
    assert risky_result.is_allowed is False
    assert risky_result.is_blocked is False
    assert risky_result.review_id is not None

    # Review status lookup by request_id
    initial_review = guardian.get_review(risky_result.request_id)
    assert initial_review.is_pending is True
    assert initial_review.id == risky_result.review_id

    # Human reviewer approves the pending review
    from app.core.security import create_access_token
    reviewer_token = create_access_token(
        user_id=reviewer_user.id, role=reviewer_user.role
    )
    reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}

    approve_resp = client.post(
        f"/reviews/{risky_result.review_id}/approve",
        headers=reviewer_headers,
        json={"notes": "Approved for staging deployment verification", "reviewer_name": "Security Admin"},
    )
    assert approve_resp.status_code == 200

    # Polling wait_for_review using request_id resolves to approved
    resolved_review = guardian.wait_for_review(risky_result.request_id, timeout=5.0, poll_interval=0.1)
    assert resolved_review.is_approved is True
    assert resolved_review.decision == "allow"
    assert resolved_review.resolution_notes == "Approved for staging deployment verification"

    # 4. End-to-end request correlation timeline
    timeline = guardian.get_timeline(risky_result.request_id)
    assert timeline["request_id"] == risky_result.request_id
    stages = [s["stage"] for s in timeline.get("timeline", [])]
    assert "INGESTION" in stages
    assert "RISK_ANALYSIS" in stages
    assert "AUTOMATED_DECISION" in stages
    assert "REVIEW_PENDING" in stages
    assert "HUMAN_DECISION" in stages
