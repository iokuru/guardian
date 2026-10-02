from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AgentCreate(BaseModel):
    agent_id: str = Field(..., min_length=3, max_length=100)
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = None
    environment: str = Field(default="Production")


class AgentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int | None
    agent_id: str
    name: str
    description: str | None
    environment: str
    status: str
    created_at: datetime
