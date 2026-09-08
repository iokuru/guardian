from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.database import Base

if TYPE_CHECKING:
    from app.models.finding import Finding
    from app.models.user import User


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    action: Mapped[str] = mapped_column(Text, nullable=False)

    context: Mapped[str] = mapped_column(Text, nullable=False)

    decision: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    risk_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    risk_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user: Mapped["User"] = relationship()

    findings: Mapped[list["Finding"]] = relationship(
        back_populates="analysis",
        cascade="all, delete-orphan",
    )

    policy_version: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    detector_version: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    semantic_model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )