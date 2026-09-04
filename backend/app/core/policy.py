from app.core.decision_types import RiskDecision, RiskLevel

def get_policy_decision(score: float):
    if score >= 0.80:
        return RiskDecision.BLOCK, RiskLevel.CRITICAL

    if score >= 0.50:
        return RiskDecision.REVIEW, RiskLevel.HIGH

    if score >= 0.20:
        return RiskDecision.ALLOW, RiskLevel.MEDIUM

    return RiskDecision.ALLOW, RiskLevel.LOW