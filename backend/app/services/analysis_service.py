from sqlalchemy.orm import Session

from app.repositories.analysis_repository import create_analysis
from app.schemas.analysis import AnalysisResponse
from app.services.risk_engine import analyze_risk


def analyze(
    action: str,
    context: str,
    db: Session | None = None,
) -> AnalysisResponse:
    result = analyze_risk(action, context)

    if db is not None:
        create_analysis(
            db,
            action,
            context,
            result,
        )

    return result