from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.models.auth_dependencies import get_current_user
from app.models.dependencies import get_db
from app.domains.agents.schemas import AgentResponse, AgentCreate
from app.domains.agents.service import list_agents, register_agent

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.get("", response_model=list[AgentResponse])
@router.get("/", response_model=list[AgentResponse])
def get_agents_endpoint(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    return list_agents(db=db, workspace_id=workspace_id)


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
def register_agent_endpoint(
    req: AgentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    return register_agent(db=db, data=req, workspace_id=workspace_id)
