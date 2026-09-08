from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.repositories.audit_repository import get_audit_logs
from app.schemas.analysis import AnalysisResponse


def create_audit_log(
    db: Session,
    user_id: int,
    analysis_id: int,
    action: str,
    result: AnalysisResponse,
) -> AuditLog:
    audit_log = AuditLog(
        user_id=user_id,
        analysis_id=analysis_id,
        action=action,
        decision=result.decision.value,
        risk_score=result.risk_score,
        risk_level=result.risk_level.value,
        policy_version=result.policy_version,
        detector_version=result.detector_version,
        semantic_model=result.semantic_model,
    )

    db.add(audit_log)
    db.flush()

    return audit_log


def list_audit_logs(
    db: Session,
    user_id: int,
    is_admin: bool,
    limit: int = 50,
    decision: str | None = None,
    risk_level: str | None = None,
):return get_audit_logs(
    db=db,
    user_id=user_id,
    is_admin=is_admin,
    limit=limit,
    decision=decision,
    risk_level=risk_level,
)