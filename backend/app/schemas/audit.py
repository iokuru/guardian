from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.core.decision_types import RiskDecision, RiskLevel


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    event_type: str = "ACTION_EVALUATED"
    request_id: str | None = None