from sqlalchemy.orm import Session

from app.repositories.analysis_repository import (
    create_analysis,
    get_analysis,
    get_analyses,
)
from app.schemas.analysis import AnalysisResponse
from app.services.risk_engine import analyze_risk


def list_analyses(
    db: Session,
    user_id: int,
    limit: int = 50,
):
    return get_analyses(db, user_id, limit)


def get_analysis_by_id(
    db: Session,
    analysis_id: int,
    user_id: int,
):
    return get_analysis(db, analysis_id, user_id)


def analyze(
    action: str,
    context: str,
    db: Session,
    user_id: int,
) -> AnalysisResponse:
    result = analyze_risk(action, context)

    create_analysis(
        db,
        action,
        context,
        result,
        user_id,
    )

    return result