from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.decision_types import RiskDecision, RiskLevel
from app.models.auth_dependencies import get_current_user
from app.models.dependencies import get_db
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import list_audit_logs
from app.domains.audit.schemas import RequestTimelineResponse
from app.domains.audit.service import get_request_timeline

router = APIRouter(
    tags=["audit"],
)


@router.get(
    "/audit-logs",
    response_model=list[AuditLogResponse],
)
@router.get(
    "/audit",
    response_model=list[AuditLogResponse],
)
def get_audit_logs_endpoint(
    limit: int = Query(default=50, ge=1, le=100),
    decision: RiskDecision | None = Query(default=None),
    risk_level: RiskLevel | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    user_id = int(current_user["sub"])
    is_admin = current_user.get("role") in ("ADMIN", "Admin", "Reviewer")

    return list_audit_logs(
        db=db,
        user_id=user_id,
        is_admin=is_admin,
        limit=limit,
        decision=decision,
        risk_level=risk_level,
    )


@router.get(
    "/audit-logs/requests/{request_id}",
    response_model=RequestTimelineResponse,
)
@router.get(
    "/audit/requests/{request_id}",
    response_model=RequestTimelineResponse,
)
def get_request_timeline_endpoint(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    timeline = get_request_timeline(db=db, request_id=request_id)
    if not timeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request timeline for '{request_id}' not found",
        )
    return timeline