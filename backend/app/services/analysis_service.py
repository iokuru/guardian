from sqlalchemy.orm import Session

from app.repositories.analysis_repository import create_analysis
from app.schemas.analysis import AnalysisResponse
from app.services.risk_engine import analyze_risk
from app.repositories.analysis_repository import (
    create_analysis,
    get_analysis,
    get_analyses,
)

def list_analyses(
    db: Session,
    limit: int = 50,
):
    return get_analyses(db, limit)

def get_analysis_by_id(
    db: Session,
    analysis_id: int,
):
    return get_analysis(db, analysis_id)

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