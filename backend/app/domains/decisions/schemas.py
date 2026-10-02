from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class DecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: str
    workspace_id: int | None
    type: str  # AUTOMATED | HUMAN
    outcome: str  # ALLOW | REVIEW | BLOCK
    reason: str
    decided_by: str
    source: str
    created_at: datetime


class ReviewResolutionRequest(BaseModel):
    notes: str = Field(default="", max_length=500)
    reviewer_name: str | None = None


class ReviewFindingItem(BaseModel):
    category: str
    severity: str
    score: float
    reason: str
    source: str


class ReviewAnalysisDetails(BaseModel):
    id: int
    request_id: str
    action: str
    context: str
    risk_score: float
    risk_level: str
    policy_version: str
    detector_version: str
    semantic_model: str
    created_at: datetime
    findings: list[ReviewFindingItem] = []


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: str
    workspace_id: int | None
    analysis_id: int
    status: str  # PENDING | APPROVED | REJECTED
    assigned_to: int | None = None
    reviewed_by: int | None = None
    resolution_notes: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None
    analysis: ReviewAnalysisDetails | None = None


class ReviewStatsResponse(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int
