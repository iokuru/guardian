from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.auth_dependencies import get_current_user
from app.models.dependencies import get_db
from app.domains.identity.schemas import ApiKeyResponse, ApiKeyCreate
from app.domains.identity.service import (
    create_api_key_for_user,
    list_api_keys_for_user,
    revoke_api_key,
)
from app.domains.integrations.schemas import IntegrationSnippetResponse
from app.domains.integrations.service import get_integration_snippets

router = APIRouter(prefix="/integrations", tags=["Integrations"])


@router.get("/snippets", response_model=IntegrationSnippetResponse)
def get_snippets_endpoint():
    return get_integration_snippets()


@router.get("/keys", response_model=list[ApiKeyResponse])
def get_api_keys_endpoint(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = int(current_user["sub"])
    return list_api_keys_for_user(db=db, user_id=user_id)


@router.post("/keys", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
def create_api_key_endpoint(
    req: ApiKeyCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = int(current_user["sub"])
    api_key, full_key = create_api_key_for_user(db=db, user_id=user_id, data=req)
    res = ApiKeyResponse.model_validate(api_key)
    res.key = full_key
    return res


@router.delete("/keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_api_key_endpoint(
    key_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = int(current_user["sub"])
    success = revoke_api_key(db=db, user_id=user_id, key_id=key_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found or already revoked",
        )
