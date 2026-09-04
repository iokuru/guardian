from app.schemas.risk import RiskFinding


def calculate_risk_score(findings: list[RiskFinding]) -> float:
    score = sum(finding.score for finding in findings)
    return min(score, 1.0)