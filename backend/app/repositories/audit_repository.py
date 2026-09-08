from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def get_audit_logs(
    db: Session,
    user_id: int,
    is_admin: bool,
    limit: int = 50,
) -> list[AuditLog]:
    query = select(AuditLog)

    if not is_admin:
        query = query.where(AuditLog.user_id == user_id)

    query = (
        query
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )

    return list(db.scalars(query))