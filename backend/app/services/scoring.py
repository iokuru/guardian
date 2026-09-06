from app.schemas.risk import RiskFinding

MAX_RISK_SCORE = 1.0

def calculate_risk_score(findings: list[RiskFinding]) -> float:
    score = sum(finding.score for finding in findings)

    return min(score, MAX_RISK_SCORE)