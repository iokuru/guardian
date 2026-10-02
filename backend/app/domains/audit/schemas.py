from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: str | None = None
    workspace_id: int | None = 1
    event_type: str
    user_id: int
    analysis_id: int
    actor_name: str | None = None
    action: str
    decision: str
    risk_score: float
    risk_level: str
    policy_version: str
    detector_version: str
    semantic_model: str
    payload_snapshot: dict | None = None
    created_at: datetime


class TimelineStage(BaseModel):
    stage: str
    timestamp: datetime
    title: str
    description: str
    actor: str
    outcome: str | None = None
    metadata: dict = {}


class RequestTimelineResponse(BaseModel):
    request_id: str
    action: str
    current_status: str
    risk_score: float
    risk_level: str
    policy_version: str
    timeline: list[TimelineStage]
