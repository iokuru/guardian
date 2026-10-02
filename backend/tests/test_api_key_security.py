from app.models.user import User
from app.domains.identity.models import ApiKey
from app.domains.identity.schemas import ApiKeyCreate
from app.domains.identity.service import create_api_key_for_user
from app.core.security import hash_password, create_access_token


def create_test_user(db, username="key_security_user", role="Developer"):
    user = User(
        username=username,
        email=f"{username}@example.com",
        hashed_password=hash_password("testpass123"),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_api_key_full_lifecycle(client, db):
    user = create_test_user(db, "dev_worker_1")
    token = create_access_token(user.id, user.role)
    user_headers = {"Authorization": f"Bearer {token}"}

    # 1. Create API key via API endpoint
    create_resp = client.post(
        "/integrations/keys",
        headers=user_headers,
        json={"name": "ci_pipeline_key", "scopes": ["action:evaluate"]},
    )
    assert create_resp.status_code == 201
    created_data = create_resp.json()
    key_id = created_data["id"]
    raw_secret = created_data["key"]

    # Secret is returned once on creation and has expected format
    assert raw_secret.startswith("gdn_")
    assert created_data["prefix"] == raw_secret[:10]

    # Verify secret is hashed in DB, never stored in plaintext
    db_record = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    assert db_record is not None
    assert db_record.hashed_key != raw_secret
    assert "$" in db_record.hashed_key  # Argon2 hash format

    # Verify listing keys does not leak secret
    list_resp = client.get("/integrations/keys", headers=user_headers)
    assert list_resp.status_code == 200
    for k in list_resp.json():
        assert "key" not in k or k["key"] is None

    # 2. Use valid key -> 200 OK
    agent_headers = {"Authorization": f"Bearer {raw_secret}"}
    eval_resp = client.post(
        "/analysis",
        headers=agent_headers,
        json={"action": "ls -l", "context": "testing"},
    )
    assert eval_resp.status_code == 200
    assert eval_resp.json()["decision"].lower() == "allow"

    # Also test X-API-Key header works identically
    x_key_resp = client.post(
        "/analysis",
        headers={"X-API-Key": raw_secret},
        json={"action": "ls -l", "context": "testing"},
    )
    assert x_key_resp.status_code == 200

    # 3. Revoke key -> same key immediately returns 401
    revoke_resp = client.delete(f"/integrations/keys/{key_id}", headers=user_headers)
    assert revoke_resp.status_code == 204

    revoked_eval_resp = client.post(
        "/analysis",
        headers=agent_headers,
        json={"action": "ls -l", "context": "testing"},
    )
    assert revoked_eval_resp.status_code == 401
    assert "Invalid API key" in revoked_eval_resp.json()["detail"]


def test_api_key_failure_cases(client, db):
    user = create_test_user(db, "dev_worker_2")
    _, raw_secret = create_api_key_for_user(
        db,
        user_id=user.id,
        data=ApiKeyCreate(name="active_key", scopes=["action:evaluate"]),
    )

    # 1. Missing key
    no_auth_resp = client.post(
        "/analysis",
        json={"action": "ls -l", "context": "testing"},
    )
    assert no_auth_resp.status_code == 401

    # 2. Invalid key with matching prefix length
    bad_secret_resp = client.post(
        "/analysis",
        headers={"Authorization": "Bearer gdn_000000000000000000000000000000000000000000000000"},
        json={"action": "ls -l", "context": "testing"},
    )
    assert bad_secret_resp.status_code == 401

    # 3. Wrong prefix (non-gdn prefix)
    wrong_prefix_resp = client.post(
        "/analysis",
        headers={"Authorization": "Bearer sk_live_1234567890abcdef"},
        json={"action": "ls -l", "context": "testing"},
    )
    assert wrong_prefix_resp.status_code == 401

    # 4. Truncated key (too short to have valid prefix)
    too_short_resp = client.post(
        "/analysis",
        headers={"Authorization": "Bearer gdn_"},
        json={"action": "ls -l", "context": "testing"},
    )
    assert too_short_resp.status_code == 401

    # 5. Tampered suffix with legitimate active prefix
    tampered_secret = raw_secret[:10] + ("f" * 38)
    tampered_resp = client.post(
        "/analysis",
        headers={"Authorization": f"Bearer {tampered_secret}"},
        json={"action": "ls -l", "context": "testing"},
    )
    assert tampered_resp.status_code == 401
