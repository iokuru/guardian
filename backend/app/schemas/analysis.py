from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    action: str = Field(min_length=1)
    context: str = Field(min_length=1)


class AnalysisResponse(BaseModel):
    decision: str
    risk_score: float
    risk_level: str
    reasons: list[str]
    scopes: list[str]