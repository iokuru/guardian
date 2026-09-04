from pydantic import BaseModel, Field

from app.core.risk_types import FindingSource, RiskCategory


class RiskFinding(BaseModel):
    category: RiskCategory
    score: float = Field(ge=0.0, le=1.0)
    reason: str
    source: FindingSource