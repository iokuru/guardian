from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.models.auth_dependencies import get_current_user
from app.models.dependencies import get_db
from app.schemas.analysis import (
    AnalysisRecord,
    AnalysisRequest,
    AnalysisResponse,
    AnalysisStats,
)
from app.services.analysis_service import (
    analyze,
    get_analysis_by_id,
    get_analysis_statistics,
    list_analyses,
)

router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
@router.post("/analysis", response_model=AnalysisResponse)
@router.post("/v1/analysis", response_model=AnalysisResponse)
def analyze_endpoint(
    request: AnalysisRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = int(current_user["sub"])
    workspace_id = current_user.get("workspace_id", 1) or 1

    if request.agent_id or request.request_id or workspace_id != 1:
        return analyze(
            request.action,
            request.context,
            db,
            user_id,
            agent_id=request.agent_id,
            request_id=request.request_id,
            workspace_id=workspace_id,
        )

    return analyze(
        request.action,
        request.context,
        db,
        user_id,
    )


@router.get("/analyses", response_model=list[AnalysisRecord])
@router.get("/v1/analyses", response_model=list[AnalysisRecord])
def list_analyses_endpoint(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = int(current_user["sub"])
    workspace_id = current_user.get("workspace_id", 1) or 1

    return list_analyses(
        db=db,
        user_id=user_id,
        workspace_id=workspace_id,
        limit=limit,
        offset=offset,
    )


@router.get("/analyses/stats", response_model=AnalysisStats)
@router.get("/v1/analyses/stats", response_model=AnalysisStats)
def get_analysis_stats_endpoint(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = int(current_user["sub"])

    return get_analysis_statistics(
        db=db,
        user_id=user_id,
    )


@router.get("/analyses/{analysis_id}", response_model=AnalysisRecord)
@router.get("/v1/analyses/{analysis_id}", response_model=AnalysisRecord)
def get_analysis_endpoint(
    analysis_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = int(current_user["sub"])
    workspace_id = current_user.get("workspace_id", 1) or 1

    record = get_analysis_by_id(
        db=db,
        analysis_id=analysis_id,
        user_id=user_id,
        workspace_id=workspace_id,
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )

    return record