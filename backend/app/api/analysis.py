from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.dependencies import get_db
from app.schemas.analysis import (
    AnalysisRecord,
    AnalysisRequest,
    AnalysisResponse,
)
from app.services.analysis_service import (
    analyze,
    get_analysis_by_id,
    list_analyses,
)
router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
def analyze_endpoint(
    request: AnalysisRequest,
    db: Session = Depends(get_db),
):
    return analyze(
        request.action,
        request.context,
        db,
    )

@router.get(
    "/analyses",
    response_model=list[AnalysisRecord],
)
def list_analyses_endpoint(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return list_analyses(db, limit)

@router.get(
    "/analyses/{analysis_id}",
    response_model=AnalysisRecord,
)
def get_analysis_endpoint(
    analysis_id: int,
    db: Session = Depends(get_db),
):
    analysis = get_analysis_by_id(db, analysis_id)

    if analysis is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found",
        )

    return analysis