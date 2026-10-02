from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.models.auth_dependencies import get_current_user
from app.models.dependencies import get_db
from app.domains.policies.schemas import PolicyResponse, PolicyCreate
from app.domains.policies.service import (
    list_policies,
    get_active_policy,
    create_policy_version,
    activate_policy,
)

router = APIRouter(prefix="/policies", tags=["Policies"])


@router.get("", response_model=list[PolicyResponse])
@router.get("/", response_model=list[PolicyResponse])
def get_policies_endpoint(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    return list_policies(db=db, workspace_id=workspace_id)


@router.get("/active", response_model=PolicyResponse)
def get_active_policy_endpoint(
    environment: str = Query(default="Production"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    policy = get_active_policy(db=db, environment=environment, workspace_id=workspace_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active policy found for environment '{environment}'",
        )
    return policy


@router.post("", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
def create_policy_endpoint(
    req: PolicyCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    author = current_user.get("username", f"User #{current_user['sub']}")
    return create_policy_version(
        db=db,
        data=req,
        author=author,
        workspace_id=workspace_id,
    )


@router.post("/{policy_id}/activate", response_model=PolicyResponse)
def activate_policy_endpoint(
    policy_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    policy = activate_policy(db=db, policy_id=policy_id, workspace_id=workspace_id)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy not found",
        )
    return policy
