from app.core.decision_types import RiskDecision, RiskLevel


LOW_THRESHOLD = 0.20
REVIEW_THRESHOLD = 0.50
BLOCK_THRESHOLD = 0.80


def get_policy_decision(score: float):
    if score >= BLOCK_THRESHOLD:
        return RiskDecision.BLOCK, RiskLevel.CRITICAL

    if score >= REVIEW_THRESHOLD:
        return RiskDecision.REVIEW, RiskLevel.HIGH

    if score >= LOW_THRESHOLD:
        return RiskDecision.ALLOW, RiskLevel.MEDIUM

    return RiskDecision.ALLOW, RiskLevel.LOW