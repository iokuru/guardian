from app.schemas.risk import RiskFinding


def get_risk_reasons(findings: list[RiskFinding], scopes: list[str]) -> list[str]:
    return [
        finding.reason
        for finding in findings
        if finding.category not in scopes
    ]