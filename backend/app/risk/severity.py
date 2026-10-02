from app.risk.categories import RISK_SEVERITIES, RiskCategory, RiskSeverity


def get_risk_severity(category: RiskCategory) -> RiskSeverity:
    return RISK_SEVERITIES.get(
        category,
        RiskSeverity.LOW,
    )
