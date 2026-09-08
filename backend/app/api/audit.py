from fastapi import APIRouter, Depends, Query

from app.models.auth_dependencies import get_current_user
from app.models.dependencies import get_db
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import list_audit_logs

router = APIRouter(
    prefix="/audit-logs",
    tags=["audit"],
)


@router.get(
    "",
    response_model=list[AuditLogResponse],
)
def get_audit_logs_endpoint(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    user_id = int(current_user["sub"])
    is_admin = current_user.get("role") == "ADMIN"

    return list_audit_logs(
        db=db,
        user_id=user_id,
        is_admin=is_admin,
        limit=limit,
    )