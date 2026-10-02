import uuid
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.services.audit_service import create_audit_log

from app.core.versions import (
    POLICY_VERSION,
    DETECTOR_VERSION,
    SEMANTIC_MODEL,
)
from app.models.analysis import Analysis
from app.models.finding import Finding
from app.domains.decisions.models import Decision, Review
from app.schemas.analysis import AnalysisResponse
from app.services.severity import get_risk_severity


def get_analyses(
    db: Session,
    user_id: int,
    limit: int = 50,
    offset: int = 0,
) -> list[Analysis]:
    return list(
        db.scalars(
            select(Analysis)
            .where(Analysis.user_id == user_id)
            .order_by(Analysis.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    )


def get_analysis(
    db: Session,
    analysis_id: int,
    user_id: int,
) -> Analysis | None:
    return db.scalar(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == user_id,
        )
    )


def create_analysis(
    db: Session,
    action: str,
    context: str,
    result: AnalysisResponse,
    user_id: int,
    request_id: str | None = None,
    agent_id: str | None = None,
    workspace_id: int = 1,
) -> Analysis:
    try:
        req_id = request_id or f"req_{uuid.uuid4().hex[:8]}"

        analysis = Analysis(
            request_id=req_id,
            workspace_id=workspace_id,
            user_id=user_id,
            agent_id=agent_id,
            action=action,
            context=context,
            decision=result.decision.value,
            risk_score=result.risk_score,
            risk_level=result.risk_level.value,
            policy_version=POLICY_VERSION,
            detector_version=DETECTOR_VERSION,
            semantic_model=SEMANTIC_MODEL,
        )

        db.add(analysis)
        db.flush()

        for finding in result.findings:
            db.add(
                Finding(
                    analysis_id=analysis.id,
                    category=finding.category.value,
                    severity=(
                        finding.severity.value
                        if finding.severity is not None
                        else get_risk_severity(finding.category).value
                    ),
                    score=finding.score,
                    reason=finding.reason,
                    source=finding.source.value,
                )
            )

        # Record separated Automated Decision
        decision_record = Decision(
            request_id=req_id,
            workspace_id=workspace_id,
            type="AUTOMATED",
            outcome=result.decision.value,
            reason=result.decision_reason,
            decided_by="system",
            source="policy_engine",
        )
        db.add(decision_record)

        # If decision is REVIEW, automatically queue into human review queue
        if result.decision.value == "REVIEW":
            review_item = Review(
                request_id=req_id,
                workspace_id=workspace_id,
                analysis_id=analysis.id,
                status="PENDING",
            )
            db.add(review_item)

        create_audit_log(
            db=db,
            user_id=user_id,
            analysis_id=analysis.id,
            action=action,
            result=result,
            request_id=req_id,
            workspace_id=workspace_id,
            actor_name=agent_id or f"User #{user_id}",
        )

        db.commit()
        db.refresh(analysis)

        return analysis

    except Exception:
        db.rollback()
        raise


def get_analysis_stats(
    db: Session,
    user_id: int,
) -> dict[str, int]:
    total = db.scalar(
        select(func.count())
        .select_from(Analysis)
        .where(Analysis.user_id == user_id)
    )

    allow = db.scalar(
        select(func.count())
        .select_from(Analysis)
        .where(
            Analysis.user_id == user_id,
            Analysis.decision == "ALLOW",
        )
    )

    review = db.scalar(
        select(func.count())
        .select_from(Analysis)
        .where(
            Analysis.user_id == user_id,
            Analysis.decision == "REVIEW",
        )
    )

    block = db.scalar(
        select(func.count())
        .select_from(Analysis)
        .where(
            Analysis.user_id == user_id,
            Analysis.decision == "BLOCK",
        )
    )

    return {
        "total": total or 0,
        "allow": allow or 0,
        "review": review or 0,
        "block": block or 0,
    }