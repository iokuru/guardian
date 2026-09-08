from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.core.decision_types import RiskDecision, RiskLevel
from app.core.risk_types import RiskCategory
from app.schemas.risk import RiskFinding


class AnalysisRequest(BaseModel):
    action: str = Field(min_length=1, max_length=1000)
    context: str = Field(min_length=1, max_length=2000)

    @field_validator("action", "context")
    @classmethod
    def validate_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")

        return value


class AnalysisResponse(BaseModel):
    decision: RiskDecision
    risk_score: float
    risk_level: RiskLevel
    decision_reason: str
    risk_categories: list[RiskCategory]
    reasons: list[str]
    scopes: list[RiskCategory]
    findings: list[RiskFinding]
    policy_version: str
    detector_version: str
    semantic_model: str
    


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



class AnalysisStats(BaseModel):
    total: int
    allow: int
    review: int
    block: int