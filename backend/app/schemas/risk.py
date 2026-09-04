from pydantic import BaseModel

from app.core.risk_types import RiskCategory


class RiskFinding(BaseModel):
    category: RiskCategory
    score: float
    reason: str