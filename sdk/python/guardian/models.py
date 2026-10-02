from dataclasses import dataclass, field
from typing import Any


@dataclass
class Finding:
    category: str
    severity: str | None
    score: float
    reason: str
    source: str


@dataclass
class AnalysisResult:
    request_id: str
    decision: str
    risk_score: float
    risk_level: str
    decision_reason: str = ""
    review_id: int | None = None
    analysis_id: int | None = None
    findings: list[Finding] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def is_allowed(self) -> bool:
        return self.decision.lower() == "allow"

    @property
    def is_review_required(self) -> bool:
        return self.decision.lower() == "review"

    @property
    def is_blocked(self) -> bool:
        return self.decision.lower() == "block"


@dataclass
class ReviewStatus:
    id: int
    request_id: str
    status: str
    decision: str | None = None
    resolution_notes: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def is_approved(self) -> bool:
        return self.status.lower() == "approved"

    @property
    def is_rejected(self) -> bool:
        return self.status.lower() == "rejected"

    @property
    def is_pending(self) -> bool:
        return self.status.lower() == "pending"
