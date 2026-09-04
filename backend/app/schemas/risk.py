from pydantic import BaseModel


class RiskFinding(BaseModel):
    category: str
    score: float
    reason: str