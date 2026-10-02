from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database import Base


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"), nullable=True, index=True, default=1)
    environment: Mapped[str] = mapped_column(String(50), nullable=False, default="Production", index=True)
    version: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    block_threshold: Mapped[float] = mapped_column(Float, default=0.80, nullable=False)
    review_threshold: Mapped[float] = mapped_column(Float, default=0.50, nullable=False)
    low_threshold: Mapped[float] = mapped_column(Float, default=0.20, nullable=False)

    rules: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False, default="Krishna")
    published_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
