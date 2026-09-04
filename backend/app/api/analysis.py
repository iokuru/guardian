from fastapi import APIRouter

from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.risk_engine import analyze_risk


router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
def analyze(request: AnalysisRequest):
    return analyze_risk(request.action, request.context)