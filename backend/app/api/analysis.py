from fastapi import APIRouter

from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.analysis_service import analyze as analyze_service


router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
def analyze(request: AnalysisRequest):
    return analyze_service(request.action, request.context)