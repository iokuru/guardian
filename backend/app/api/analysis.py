from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.auth_dependencies import get_current_user
from app.models.dependencies import get_db
from app.schemas.analysis import AnalysisRecord, AnalysisRequest, AnalysisResponse
from app.services.analysis_service import (
    analyze,
    get_analysis_by_id,
    list_analyses,
)

router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
def analyze_endpoint(
    request: AnalysisRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = int(current_user["sub"])

    return analyze(
        request.action,
        request.context,
        db,
        user_id,
    )


@router.get("/analyses", response_model=list[AnalysisRecord])
def list_analyses_endpoint(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = int(current_user["sub"])

    return list_analyses(
        db,
        user_id,
    )


@router.get("/analyses/{analysis_id}", response_model=AnalysisRecord)
def get_analysis_endpoint(
    analysis_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = int(current_user["sub"])

    record = get_analysis_by_id(
        db,
        analysis_id,
        user_id,
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )

    return record