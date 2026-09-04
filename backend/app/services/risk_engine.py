from app.core.risk_categories import (
    DESTRUCTIVE_KEYWORDS,
    PRIVILEGE_KEYWORDS,
    CREDENTIAL_KEYWORDS,
    EXFILTRATION_KEYWORDS,
    PRODUCTION_KEYWORDS,
)


def analyze_risk(action: str, context: str):
    action = action.lower()
    context = context.lower()

    score = 0.0
    reasons = []

    if any(word in action for word in DESTRUCTIVE_KEYWORDS):
        score += 0.70
        reasons.append("Destructive action")

    if any(word in action for word in PRIVILEGE_KEYWORDS):
        score += 0.60
        reasons.append("Privilege escalation")

    if any(word in action for word in CREDENTIAL_KEYWORDS):
        score += 0.60
        reasons.append("Credential access")

    if any(word in action for word in EXFILTRATION_KEYWORDS):
        score += 0.80
        reasons.append("Data exfiltration")

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