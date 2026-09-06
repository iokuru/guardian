from app.core.decision_types import RiskDecision, RiskLevel
from app.core.risk_types import RiskCategory
from app.schemas.risk import RiskFinding

LOW_THRESHOLD = 0.20
REVIEW_THRESHOLD = 0.50
BLOCK_THRESHOLD = 0.80

def has_critical_override(findings: list[RiskFinding]) -> bool:
    categories = {
        finding.category
        for finding in findings
    }

    return (
        RiskCategory.CREDENTIAL_ACCESS in categories
        and RiskCategory.PRODUCTION in categories
    )

def get_policy_decision(
    score: float,
    findings: list[RiskFinding] | None = None,
):
    if findings and has_critical_override(findings):
        return RiskDecision.BLOCK, RiskLevel.CRITICAL

    if score >= BLOCK_THRESHOLD:
        return RiskDecision.BLOCK, RiskLevel.CRITICAL

    if score >= REVIEW_THRESHOLD:
        return RiskDecision.REVIEW, RiskLevel.HIGH

    if score >= LOW_THRESHOLD:
        return RiskDecision.ALLOW, RiskLevel.MEDIUM

    return RiskDecision.ALLOW, RiskLevel.LOW