from pydantic import BaseModel, Field
from app.core.decision_types import RiskDecision, RiskLevel
from app.core.risk_types import RiskCategory


class AnalysisRequest(BaseModel):
    action: str = Field(min_length=1)
    context: str = Field(min_length=1)


class AnalysisResponse(BaseModel):
    decision: RiskDecision
    risk_score: float
    risk_level: RiskLevel
    reasons: list[str]
    scopes: list[RiskCategory]