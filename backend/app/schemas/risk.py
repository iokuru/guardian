from pydantic import BaseModel, Field
from app.core.risk_types import FindingSource, RiskCategory, RiskSeverity

class RiskFinding(BaseModel):
    category: RiskCategory
    severity: RiskSeverity | None = None
    score: float = Field(ge=0.0, le=1.0)
    reason: str
    source: FindingSource