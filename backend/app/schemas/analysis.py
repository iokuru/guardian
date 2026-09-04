from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    action: str
    context: str


class AnalysisResponse(BaseModel):
    decision: str
    risk_score: float
    risk_level: str
    reasons: list[str]