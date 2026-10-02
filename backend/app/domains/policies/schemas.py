from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class PolicyRule(BaseModel):
    category: str
    condition: str = "MATCH"  # MATCH | THRESHOLD | COMBINATION
    decision: str = "BLOCK"  # BLOCK | REVIEW | ALLOW
    reason: str


class PolicyCreate(BaseModel):
    environment: str = Field(default="Production")
    version: str = Field(..., min_length=2, max_length=20)
    name: str = Field(..., min_length=3, max_length=100)
    block_threshold: float = Field(default=0.80, ge=0.0, le=1.0)
    review_threshold: float = Field(default=0.50, ge=0.0, le=1.0)
    low_threshold: float = Field(default=0.20, ge=0.0, le=1.0)
    rules: list[dict] = Field(default_factory=list)


class PolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int | None
    environment: str
    version: str
    name: str
    status: str
    is_active: bool
    block_threshold: float
    review_threshold: float
    low_threshold: float
    rules: list[dict]
    created_by: str
    published_at: datetime
    created_at: datetime
