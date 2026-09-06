from app.core.decision_types import RiskDecision, RiskLevel
from app.core.risk_types import RiskCategory
from app.schemas.risk import RiskFinding

LOW_THRESHOLD = 0.20
REVIEW_THRESHOLD = 0.50
BLOCK_THRESHOLD = 0.80

CRITICAL_COMBINATIONS = {
    frozenset({
        RiskCategory.CREDENTIAL_ACCESS,
        RiskCategory.PRODUCTION,
    }),
    frozenset({
        RiskCategory.DESTRUCTIVE,
        RiskCategory.PRODUCTION,
    }),
}

def has_critical_override(
    findings: list[RiskFinding],
) -> bool:
    categories = {
        finding.category
        for finding in findings
    }

    return any(
        combination.issubset(categories)
        for combination in CRITICAL_COMBINATIONS
    )

def get_policy_decision(
    score: float,
    findings: list[RiskFinding] | None = None,
):
    if findings and has_critical_override(findings):
        return (
            RiskDecision.BLOCK,
            RiskLevel.CRITICAL,
            "Critical policy override",
        )

    if score >= BLOCK_THRESHOLD:
        return (
            RiskDecision.BLOCK,
            RiskLevel.CRITICAL,
            "Risk score exceeded block threshold",
        )

    if score >= REVIEW_THRESHOLD:
        return (
            RiskDecision.REVIEW,
            RiskLevel.HIGH,
            "Risk score exceeded review threshold",
        )

    if score >= LOW_THRESHOLD:
        return (
            RiskDecision.ALLOW,
            RiskLevel.MEDIUM,
            "Risk score indicates medium risk",
        )

    return (
        RiskDecision.ALLOW,
        RiskLevel.LOW,
        "Risk score indicates low risk",
    )