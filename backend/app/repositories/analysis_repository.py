from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

from app.core.versions import (
    POLICY_VERSION,
    DETECTOR_VERSION,
    SEMANTIC_MODEL,
)
from app.models.analysis import Analysis
from app.models.finding import Finding
from app.schemas.analysis import AnalysisResponse
from app.services.severity import get_risk_severity


def get_analyses(
    db: Session,
    user_id: int,
    limit: int = 50,
) -> list[Analysis]:
    return list(
        db.scalars(
            select(Analysis)
            .where(Analysis.user_id == user_id)
            .order_by(Analysis.created_at.desc())
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
) -> Analysis:
    try:
        analysis = Analysis(
            user_id=user_id,
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

        db.add(
            AuditLog(
                user_id=user_id,
                analysis_id=analysis.id,
                action=action,
                decision=result.decision.value,
                risk_score=result.risk_score,
                risk_level=result.risk_level.value,
                policy_version=result.policy_version,
                detector_version=result.detector_version,
                semantic_model=result.semantic_model,
            )
        )

        db.commit()
        db.refresh(analysis)

        return analysis

    except Exception:
        db.rollback()
        raise