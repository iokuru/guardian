from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"), nullable=True, index=True, default=1)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTION_EVALUATED")

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("analyses.id"), nullable=False, index=True)
    actor_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    action: Mapped[str] = mapped_column(Text, nullable=False)
    decision: Mapped[str] = mapped_column(String(20), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)

    policy_version: Mapped[str] = mapped_column(String(20), nullable=False)
    detector_version: Mapped[str] = mapped_column(String(20), nullable=False)
    semantic_model: Mapped[str] = mapped_column(String(100), nullable=False)

    payload_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


AuditEvent = AuditLog
