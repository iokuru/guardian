from app.schemas.risk import RiskFinding

MAX_RISK_SCORE = 1.0

def calculate_risk_score(findings: list[RiskFinding]) -> float:
    categories = set()
    score = 0.0

    for finding in findings:
        if finding.category in categories:
            continue

        categories.add(finding.category)
        score += finding.score

    return min(score, MAX_RISK_SCORE)