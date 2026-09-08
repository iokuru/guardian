from datetime import datetime

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    analysis_id: int
    action: str
    decision: str
    risk_score: float
    risk_level: str
    policy_version: str
    detector_version: str
    semantic_model: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }