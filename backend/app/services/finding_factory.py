from app.core.risk_types import FindingSource, RiskCategory
from app.services.severity import get_risk_severity
from app.schemas.risk import RiskFinding


def create_finding(
    category: RiskCategory,
    score: float,
    reason: str,
    source: FindingSource,
) -> RiskFinding:
    return RiskFinding(
        category=category,
        severity=get_risk_severity(category),
        score=score,
        reason=reason,
        source=source,
    )