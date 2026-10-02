from datetime import datetime
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.domains.decisions.models import Decision, Review
from app.domains.analysis.models import Analysis
from app.domains.audit.models import AuditLog


def list_reviews(
    db: Session,
    status: str | None = None,
    workspace_id: int = 1,
    limit: int = 50,
    offset: int = 0,
) -> list[Review]:
    query = (
        select(Review)
        .options(joinedload(Review.analysis).joinedload(Analysis.findings))
        .where(Review.workspace_id == workspace_id)
    )
    if status:
        query = query.where(Review.status == status)

    return list(
        db.scalars(
            query.order_by(Review.created_at.desc()).offset(offset).limit(limit)
        ).unique()
    )


def get_review_by_id(db: Session, review_id: int, workspace_id: int = 1) -> Review | None:
    return db.scalar(
        select(Review)
        .options(joinedload(Review.analysis).joinedload(Analysis.findings))
        .where(Review.id == review_id, Review.workspace_id == workspace_id)
    )


def get_review_by_request_id(db: Session, request_id: str, workspace_id: int | None = None) -> Review | None:
    query = (
        select(Review)
        .options(joinedload(Review.analysis).joinedload(Analysis.findings))
        .where(Review.request_id == request_id)
    )
    if workspace_id is not None:
        query = query.where(Review.workspace_id == workspace_id)
    return db.scalar(query)


def get_review_stats(db: Session, workspace_id: int = 1) -> dict[str, int]:
    total = db.scalar(
        select(func.count()).select_from(Review).where(Review.workspace_id == workspace_id)
    ) or 0
    pending = db.scalar(
        select(func.count())
        .select_from(Review)
        .where(Review.workspace_id == workspace_id, Review.status == "PENDING")
    ) or 0
    approved = db.scalar(
        select(func.count())
        .select_from(Review)
        .where(Review.workspace_id == workspace_id, Review.status == "APPROVED")
    ) or 0
    rejected = db.scalar(
        select(func.count())
        .select_from(Review)
        .where(Review.workspace_id == workspace_id, Review.status == "REJECTED")
    ) or 0

    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
    }


def approve_review(
    db: Session,
    review_id: int,
    reviewer_id: int,
    reviewer_name: str = "reviewer",
    notes: str = "",
    workspace_id: int = 1,
) -> Review | None:
    review = db.scalar(
        select(Review).where(Review.id == review_id, Review.workspace_id == workspace_id)
    )
    if not review:
        return None

    review.status = "APPROVED"
    review.reviewed_by = reviewer_id
    review.resolution_notes = notes
    review.resolved_at = datetime.utcnow()

    # Update associated analysis outcome
    analysis = db.scalar(select(Analysis).where(Analysis.id == review.analysis_id))
    if analysis:
        analysis.decision = "ALLOW"

    # Record human decision
    human_decision = Decision(
        request_id=review.request_id,
        workspace_id=review.workspace_id,
        type="HUMAN",
        outcome="ALLOW",
        reason=notes or f"Approved by {reviewer_name}",
        decided_by=reviewer_name,
        source="reviewer",
    )
    db.add(human_decision)

    # Record audit log event
    audit_event = AuditLog(
        request_id=review.request_id,
        workspace_id=review.workspace_id,
        event_type="REVIEW_APPROVED",
        user_id=reviewer_id,
        analysis_id=review.analysis_id,
        actor_name=reviewer_name,
        action=analysis.action if analysis else "Action Review",
        decision="ALLOW",
        risk_score=analysis.risk_score if analysis else 0.5,
        risk_level=analysis.risk_level if analysis else "HIGH",
        policy_version=analysis.policy_version if analysis else "v1.4",
        detector_version=analysis.detector_version if analysis else "v1.0",
        semantic_model=analysis.semantic_model if analysis else "all-MiniLM-L6-v2",
        payload_snapshot={"notes": notes, "resolution": "APPROVED"},
    )
    db.add(audit_event)

    db.commit()
    db.refresh(review)
    return review


def reject_review(
    db: Session,
    review_id: int,
    reviewer_id: int,
    reviewer_name: str = "reviewer",
    notes: str = "",
    workspace_id: int = 1,
) -> Review | None:
    review = db.scalar(
        select(Review).where(Review.id == review_id, Review.workspace_id == workspace_id)
    )
    if not review:
        return None

    review.status = "REJECTED"
    review.reviewed_by = reviewer_id
    review.resolution_notes = notes
    review.resolved_at = datetime.utcnow()

    # Update associated analysis outcome
    analysis = db.scalar(select(Analysis).where(Analysis.id == review.analysis_id))
    if analysis:
        analysis.decision = "BLOCK"

    # Record human decision
    human_decision = Decision(
        request_id=review.request_id,
        workspace_id=review.workspace_id,
        type="HUMAN",
        outcome="BLOCK",
        reason=notes or f"Rejected by {reviewer_name}",
        decided_by=reviewer_name,
        source="reviewer",
    )
    db.add(human_decision)

    # Record audit log event
    audit_event = AuditLog(
        request_id=review.request_id,
        workspace_id=review.workspace_id,
        event_type="REVIEW_REJECTED",
        user_id=reviewer_id,
        analysis_id=review.analysis_id,
        actor_name=reviewer_name,
        action=analysis.action if analysis else "Action Review",
        decision="BLOCK",
        risk_score=analysis.risk_score if analysis else 0.5,
        risk_level=analysis.risk_level if analysis else "HIGH",
        policy_version=analysis.policy_version if analysis else "v1.4",
        detector_version=analysis.detector_version if analysis else "v1.0",
        semantic_model=analysis.semantic_model if analysis else "all-MiniLM-L6-v2",
        payload_snapshot={"notes": notes, "resolution": "REJECTED"},
    )
    db.add(audit_event)

    db.commit()
    db.refresh(review)
    return review
