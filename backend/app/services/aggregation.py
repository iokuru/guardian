from app.core.risk_types import RiskCategory
from app.schemas.risk import RiskFinding


def get_risk_categories(
    findings: list[RiskFinding],
) -> list[RiskCategory]:
    return list(dict.fromkeys(
        finding.category
        for finding in findings
    ))