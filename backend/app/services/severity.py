from app.core.risk_categories import RISK_SEVERITIES
from app.core.risk_types import RiskCategory, RiskSeverity


def get_risk_severity(category: RiskCategory) -> RiskSeverity:
    return RISK_SEVERITIES[category]