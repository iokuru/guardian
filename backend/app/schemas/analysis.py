from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict

from app.core.decision_types import RiskDecision, RiskLevel
from app.core.risk_types import RiskCategory
from app.schemas.risk import RiskFinding


class AnalysisRequest(BaseModel):
    action: str = Field(min_length=1)
    context: str = Field(min_length=1)


class AnalysisResponse(BaseModel):
    decision: RiskDecision
    risk_score: float
    risk_level: RiskLevel
    decision_reason: str
    reasons: list[str]
    scopes: list[RiskCategory]
    findings: list[RiskFinding]


class AnalysisRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    context: str
    decision: RiskDecision
    risk_score: float
    risk_level: RiskLevel
    policy_version: str
    detector_version: str
    semantic_model: str
    created_at: datetime
    findings: list[RiskFinding] = Field(default_factory=list)