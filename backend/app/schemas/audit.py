from datetime import datetime

from pydantic import BaseModel

from app.core.decision_types import RiskDecision, RiskLevel


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    analysis_id: int
    action: str
    decision: RiskDecision
    risk_score: float
    risk_level: RiskLevel
    policy_version: str
    detector_version: str
    semantic_model: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }