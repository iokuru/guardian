from app.schemas.analysis import AnalysisResponse
from app.services.risk_engine import analyze_risk


def analyze(action: str, context: str) -> AnalysisResponse:
    return analyze_risk(action, context)