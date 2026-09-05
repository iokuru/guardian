from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from app.models.dependencies import get_db
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.analysis_service import analyze


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