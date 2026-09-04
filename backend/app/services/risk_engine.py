from app.core.rules import DESTRUCTIVE_KEYWORDS, PRODUCTION_KEYWORDS


def analyze_risk(action: str, context: str):
    action = action.lower()
    context = context.lower()

    score = 0.0
    reasons = []

    if any(word in action for word in DESTRUCTIVE_KEYWORDS):
        score += 0.70
        reasons.append("Destructive action")

    if any(word in context for word in PRODUCTION_KEYWORDS):
        score += 0.25
        reasons.append("Production environment")

    score = min(score, 1.0)

    if score >= 0.80:
        risk_level = "CRITICAL"
        decision = "BLOCK"
    elif score >= 0.50:
        risk_level = "HIGH"
        decision = "REVIEW"
    elif score > 0:
        risk_level = "MEDIUM"
        decision = "ALLOW"
    else:
        risk_level = "LOW"
        decision = "ALLOW"

    return {
        "decision": decision,
        "risk_score": score,
        "risk_level": risk_level,
        "reasons": reasons
    }