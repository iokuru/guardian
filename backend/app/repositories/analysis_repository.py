from sqlalchemy.orm import Session

from app.models.analysis import Analysis
from app.models.finding import Finding
from app.schemas.analysis import AnalysisResponse
from sqlalchemy import select
from app.core.versions import (
    POLICY_VERSION,
    DETECTOR_VERSION,
    SEMANTIC_MODEL,
)

def get_analyses(
    db: Session,
    limit: int = 50,
) -> list[Analysis]:
    return list(
        db.scalars(
            select(Analysis)
            .order_by(Analysis.created_at.desc())
            .limit(limit)
        )
    )

def get_analysis(
    db: Session,
    analysis_id: int,
) -> Analysis | None:
    return db.get(Analysis, analysis_id)

def create_analysis(
    db: Session,
    action: str,
    context: str,
    result: AnalysisResponse,
) -> Analysis:
    try:
        analysis = Analysis(
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
                    score=finding.score,
                    reason=finding.reason,
                    source=finding.source.value,
                )
            )

        db.commit()
        db.refresh(analysis)

        return analysis

    except Exception:
        db.rollback()
        raise