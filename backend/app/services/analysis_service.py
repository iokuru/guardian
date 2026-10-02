from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domains.decisions.models import Review
from app.repositories.analysis_repository import (
    create_analysis,
    get_analysis,
    get_analyses,
    get_analysis_stats,
)
from app.schemas.analysis import AnalysisResponse
from app.services.risk_engine import analyze_risk


def get_analysis_statistics(
    db: Session,
    user_id: int,
    workspace_id: int | None = None,
):
    return get_analysis_stats(
        db=db,
        user_id=user_id,
        workspace_id=workspace_id,
    )


def list_analyses(
    db: Session,
    user_id: int,
    workspace_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
):
    return get_analyses(
        db=db,
        user_id=user_id,
        workspace_id=workspace_id,
        limit=limit,
        offset=offset,
    )


def get_analysis_by_id(
    db: Session,
    analysis_id: int,
    user_id: int,
    workspace_id: int | None = None,
):
    return get_analysis(
        db=db,
        analysis_id=analysis_id,
        user_id=user_id,
        workspace_id=workspace_id,
    )


def analyze(
    action: str,
    context: str,
    db: Session,
    user_id: int,
    agent_id: str | None = None,
    request_id: str | None = None,
    workspace_id: int = 1,
) -> AnalysisResponse:
    result = analyze_risk(action, context)

    analysis = create_analysis(
        db=db,
        action=action,
        context=context,
        result=result,
        user_id=user_id,
        request_id=request_id,
        agent_id=agent_id,
        workspace_id=workspace_id,
    )

    result.request_id = analysis.request_id
    result.analysis_id = analysis.id

    if result.decision.value == "REVIEW":
        review = db.scalar(select(Review).where(Review.analysis_id == analysis.id))
        if review:
            result.review_id = review.id

    return result