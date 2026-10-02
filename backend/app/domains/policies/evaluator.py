from app.core.decision_types import RiskDecision, RiskLevel
from app.core.risk_types import RiskCategory
from app.schemas.risk import RiskFinding

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


def has_critical_override(findings: list[RiskFinding]) -> bool:
    categories = {finding.category for finding in findings}
    return any(comb.issubset(categories) for comb in CRITICAL_COMBINATIONS)


def evaluate_policy(
    score: float,
    findings: list[RiskFinding] | None = None,
    environment: str = "Production",
    block_threshold: float = 0.80,
    review_threshold: float = 0.50,
    low_threshold: float = 0.20,
    custom_rules: list[dict] | None = None,
) -> tuple[RiskDecision, RiskLevel, str]:
    """
    Evaluates risk score and findings against policy thresholds and critical combinations.
    """
    if findings and has_critical_override(findings):
        categories = {finding.category for finding in findings}

        if (
            RiskCategory.CREDENTIAL_ACCESS in categories
            and RiskCategory.PRODUCTION in categories
        ):
            return (
                RiskDecision.BLOCK,
                RiskLevel.CRITICAL,
                "Critical policy override: credential access in production",
            )

        if (
            RiskCategory.DESTRUCTIVE in categories
            and RiskCategory.PRODUCTION in categories
        ):
            return (
                RiskDecision.BLOCK,
                RiskLevel.CRITICAL,
                "Critical policy override: destructive action in production",
            )

    # Check custom policy rules if provided
    if custom_rules and findings:
        for rule in custom_rules:
            category_match = any(f.category.value == rule.get("category") for f in findings)
            if category_match:
                decision_str = rule.get("decision", "BLOCK")
                reason_str = rule.get("reason", f"Matched policy rule for {rule.get('category')}")
                if decision_str == "BLOCK":
                    return RiskDecision.BLOCK, RiskLevel.CRITICAL, reason_str
                elif decision_str == "REVIEW":
                    return RiskDecision.REVIEW, RiskLevel.HIGH, reason_str

    if score >= block_threshold:
        return (
            RiskDecision.BLOCK,
            RiskLevel.CRITICAL,
            "Risk score exceeded block threshold",
        )

    if score >= review_threshold:
        return (
            RiskDecision.REVIEW,
            RiskLevel.HIGH,
            "Risk score exceeded review threshold",
        )

    if score >= low_threshold:
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
