from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.domains.audit.models import AuditLog
from app.domains.analysis.models import Analysis
from app.domains.decisions.models import Decision, Review
from app.domains.audit.schemas import TimelineStage, RequestTimelineResponse


def list_audit_events(
    db: Session,
    workspace_id: int = 1,
    decision: str | None = None,
    event_type: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[AuditLog]:
    query = select(AuditLog).where(AuditLog.workspace_id == workspace_id)
    if decision:
        query = query.where(AuditLog.decision == decision)
    if event_type:
        query = query.where(AuditLog.event_type == event_type)
    if search:
        query = query.where(AuditLog.action.ilike(f"%{search}%"))

    return list(
        db.scalars(
            query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
        )
    )


def get_request_timeline(db: Session, request_id: str, workspace_id: int | None = None) -> RequestTimelineResponse | None:
    # 1. Fetch Analysis
    query = (
        select(Analysis)
        .options(joinedload(Analysis.findings))
        .where(Analysis.request_id == request_id)
    )
    if workspace_id is not None:
        query = query.where(Analysis.workspace_id == workspace_id)
    analysis = db.scalar(query)
    if not analysis:
        return None

    timeline_stages: list[TimelineStage] = []

    # Stage 1: Ingestion
    timeline_stages.append(
        TimelineStage(
            stage="INGESTION",
            timestamp=analysis.created_at,
            title="Action Received",
            description=f"Action '{analysis.action}' ingested into Guardian",
            actor=analysis.agent_id or f"User #{analysis.user_id}",
            outcome="INGESTED",
            metadata={"context": analysis.context},
        )
    )

    # Stage 2: Risk Analysis
    findings_summary = [
        {"category": f.category, "severity": f.severity, "score": f.score, "reason": f.reason}
        for f in analysis.findings
    ]
    timeline_stages.append(
        TimelineStage(
            stage="RISK_ANALYSIS",
            timestamp=analysis.created_at,
            title="Risk Engine Evaluation",
            description=f"Evaluated with score {analysis.risk_score:.2f} ({analysis.risk_level})",
            actor=f"{analysis.detector_version} ({analysis.semantic_model})",
            outcome=analysis.risk_level,
            metadata={"findings_count": len(analysis.findings), "findings": findings_summary},
        )
    )

    # Stage 3: Automated Decision
    automated_decision = db.scalar(
        select(Decision).where(Decision.request_id == request_id, Decision.type == "AUTOMATED")
    )
    if automated_decision:
        timeline_stages.append(
            TimelineStage(
                stage="AUTOMATED_DECISION",
                timestamp=automated_decision.created_at,
                title=f"Policy Decision: {automated_decision.outcome}",
                description=automated_decision.reason,
                actor=f"Policy {analysis.policy_version}",
                outcome=automated_decision.outcome,
                metadata={"source": automated_decision.source},
            )
        )

    # Stage 4 & 5: Review & Human Decision
    review = db.scalar(select(Review).where(Review.request_id == request_id))
    if review:
        timeline_stages.append(
            TimelineStage(
                stage="REVIEW_PENDING",
                timestamp=review.created_at,
                title="Queued for Human Review",
                description="High risk detected; action paused pending security sign-off",
                actor="Guardian Review Queue",
                outcome="PENDING" if review.status == "PENDING" else review.status,
                metadata={"review_id": review.id, "status": review.status},
            )
        )

        human_decision = db.scalar(
            select(Decision).where(Decision.request_id == request_id, Decision.type == "HUMAN")
        )
        if human_decision and review.status in ("APPROVED", "REJECTED"):
            timeline_stages.append(
                TimelineStage(
                    stage="HUMAN_DECISION",
                    timestamp=human_decision.created_at,
                    title=f"Human Review: {human_decision.outcome}",
                    description=human_decision.reason or f"Resolved by {human_decision.decided_by}",
                    actor=human_decision.decided_by,
                    outcome=human_decision.outcome,
                    metadata={"reviewer": human_decision.decided_by, "notes": review.resolution_notes or ""},
                )
            )

    # Stage 6: Audit Records
    audit_events = list(
        db.scalars(
            select(AuditLog).where(AuditLog.request_id == request_id).order_by(AuditLog.created_at.asc())
        )
    )
    for event in audit_events:
        timeline_stages.append(
            TimelineStage(
                stage="AUDIT",
                timestamp=event.created_at,
                title=f"Audit Recorded: {event.event_type}",
                description=f"Action '{event.action}' sealed with decision {event.decision}",
                actor=event.actor_name or f"User #{event.user_id}",
                outcome=event.decision,
                metadata={"event_id": event.id, "policy_version": event.policy_version},
            )
        )

    # Determine current status
    latest_outcome = analysis.decision
    if review and review.status == "PENDING":
        latest_outcome = "REVIEW_PENDING"

    return RequestTimelineResponse(
        request_id=request_id,
        action=analysis.action,
        current_status=latest_outcome,
        risk_score=analysis.risk_score,
        risk_level=analysis.risk_level,
        policy_version=analysis.policy_version,
        timeline=timeline_stages,
    )
