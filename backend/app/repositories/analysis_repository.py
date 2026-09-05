from sqlalchemy.orm import Session

from app.models.analysis import Analysis
from app.models.finding import Finding
from app.schemas.analysis import AnalysisResponse


def create_analysis(
    db: Session,
    action: str,
    context: str,
    result: AnalysisResponse,
) -> Analysis:
    analysis = Analysis(
        action=action,
        context=context,
        decision=result.decision.value,
        risk_score=result.risk_score,
        risk_level=result.risk_level.value,
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