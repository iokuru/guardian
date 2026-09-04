from app.core.risk_types import RiskCategory
from app.schemas.risk import RiskFinding


def get_risk_reasons(
    findings: list[RiskFinding],
    scopes: list[RiskCategory]
) -> list[str]:
    return [
        finding.reason
        for finding in findings
        if finding.category not in scopes
    ]