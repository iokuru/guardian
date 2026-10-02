from app.models.analysis import Analysis
from app.models.finding import Finding
from app.models.user import User
from app.domains.decisions.models import Decision, Review
from app.domains.audit.models import AuditLog
from app.core.security import create_access_token, hash_password


def create_test_user(db, username="reviewer_test", role="Reviewer"):
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


def test_review_lifecycle_approve(client, db):
    user = create_test_user(db, "reviewer_1")
    headers = get_auth_header(user)

    # 1. Trigger an action that requires review
    res = client.post(
        "/analyze",
        headers=headers,
        json={
            "action": "grant admin permissions to dev team",
            "context": "Staging cluster",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "REVIEW"
    assert data["request_id"] is not None
    assert data["review_id"] is not None
    review_id = data["review_id"]

    # 2. Check that the review appears in the review queue
    reviews_res = client.get("/reviews?status=PENDING", headers=headers)
    assert reviews_res.status_code == 200
    reviews = reviews_res.json()
    assert any(r["id"] == review_id for r in reviews)

    # 3. Approve the review
    approve_res = client.post(
        f"/reviews/{review_id}/approve",
        headers=headers,
        json={"notes": "Approved for quarterly maintenance", "reviewer_name": "Krishna"},
    )
    assert approve_res.status_code == 200
    approved_review = approve_res.json()
    assert approved_review["status"] == "APPROVED"
    assert approved_review["resolution_notes"] == "Approved for quarterly maintenance"

    # 4. Verify audit trail event was created
    audit_res = client.get("/audit", headers=headers)
    assert audit_res.status_code == 200
    audit_events = audit_res.json()
    assert any(a["event_type"] == "REVIEW_APPROVED" for a in audit_events)


def test_review_lifecycle_reject(client, db):
    user = create_test_user(db, "reviewer_2")
    headers = get_auth_header(user)

    res = client.post(
        "/analyze",
        headers=headers,
        json={
            "action": "grant root access to contractor",
            "context": "Internal bastion",
        },
    )
    assert res.status_code == 200
    review_id = res.json()["review_id"]

    reject_res = client.post(
        f"/reviews/{review_id}/reject",
        headers=headers,
        json={"notes": "Unauthorized access requested", "reviewer_name": "Security Lead"},
    )
    assert reject_res.status_code == 200
    rejected_review = reject_res.json()
    assert rejected_review["status"] == "REJECTED"

    # Verify audit event
    audit_res = client.get("/audit", headers=headers)
    assert any(a["event_type"] == "REVIEW_REJECTED" for a in audit_res.json())
