from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.policies.models import Policy
from app.domains.policies.schemas import PolicyCreate

DEFAULT_POLICIES = [
    {
        "environment": "Production",
        "version": "v1.4",
        "name": "Production Zero-Trust Baseline",
        "block_threshold": 0.80,
        "review_threshold": 0.50,
        "low_threshold": 0.20,
        "rules": [
            {"category": "DESTRUCTIVE", "decision": "BLOCK", "reason": "Destructive actions blocked in Production"},
            {"category": "CREDENTIAL_ACCESS", "decision": "BLOCK", "reason": "Credential extraction blocked in Production"},
            {"category": "PRIVILEGE_ESCALATION", "decision": "REVIEW", "reason": "Privilege escalation requires human sign-off"},
        ],
        "created_by": "Krishna",
    },
    {
        "environment": "Staging",
        "version": "v1.3",
        "name": "Staging Pre-Release Ruleset",
        "block_threshold": 0.85,
        "review_threshold": 0.60,
        "low_threshold": 0.30,
        "rules": [
            {"category": "DATA_EXFILTRATION", "decision": "BLOCK", "reason": "Data exfiltration strictly prohibited"},
        ],
        "created_by": "Krishna",
    },
    {
        "environment": "Sandbox",
        "version": "v1.1",
        "name": "Developer Sandbox Permissive",
        "block_threshold": 0.95,
        "review_threshold": 0.70,
        "low_threshold": 0.40,
        "rules": [],
        "created_by": "Krishna",
    },
]


def seed_default_policies(db: Session, workspace_id: int = 1):
    existing = db.scalars(select(Policy).where(Policy.workspace_id == workspace_id)).all()
    if not existing:
        for p in DEFAULT_POLICIES:
            policy = Policy(
                workspace_id=workspace_id,
                environment=p["environment"],
                version=p["version"],
                name=p["name"],
                status="ACTIVE",
                is_active=True,
                block_threshold=p["block_threshold"],
                review_threshold=p["review_threshold"],
                low_threshold=p["low_threshold"],
                rules=p["rules"],
                created_by=p["created_by"],
            )
            db.add(policy)
        db.commit()


def get_active_policy(db: Session, environment: str = "Production", workspace_id: int = 1) -> Policy | None:
    policy = db.scalar(
        select(Policy).where(
            Policy.workspace_id == workspace_id,
            Policy.environment == environment,
            Policy.is_active.is_(True),
        )
    )
    if not policy:
        seed_default_policies(db, workspace_id)
        policy = db.scalar(
            select(Policy).where(
                Policy.workspace_id == workspace_id,
                Policy.environment == environment,
                Policy.is_active.is_(True),
            )
        )
    return policy


def list_policies(db: Session, workspace_id: int = 1) -> list[Policy]:
    seed_default_policies(db, workspace_id)
    return list(
        db.scalars(
            select(Policy)
            .where(Policy.workspace_id == workspace_id)
            .order_by(Policy.created_at.desc())
        )
    )


def create_policy_version(db: Session, data: PolicyCreate, author: str, workspace_id: int = 1) -> Policy:
    # Deactivate existing active policy for the environment
    existing = db.scalars(
        select(Policy).where(
            Policy.workspace_id == workspace_id,
            Policy.environment == data.environment,
            Policy.is_active.is_(True),
        )
    ).all()
    for p in existing:
        p.is_active = False

    policy = Policy(
        workspace_id=workspace_id,
        environment=data.environment,
        version=data.version,
        name=data.name,
        status="ACTIVE",
        is_active=True,
        block_threshold=data.block_threshold,
        review_threshold=data.review_threshold,
        low_threshold=data.low_threshold,
        rules=data.rules,
        created_by=author,
        published_at=datetime.utcnow(),
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


def activate_policy(db: Session, policy_id: int, workspace_id: int = 1) -> Policy | None:
    target = db.scalar(
        select(Policy).where(Policy.id == policy_id, Policy.workspace_id == workspace_id)
    )
    if not target:
        return None

    # Deactivate other policies for the same environment
    others = db.scalars(
        select(Policy).where(
            Policy.workspace_id == workspace_id,
            Policy.environment == target.environment,
            Policy.id != policy_id,
        )
    ).all()
    for o in others:
        o.is_active = False

    target.is_active = True
    target.status = "ACTIVE"
    db.commit()
    db.refresh(target)
    return target
