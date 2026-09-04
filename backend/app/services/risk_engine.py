import re

from app.core.risk_categories import (
    DESTRUCTIVE_KEYWORDS,
    PRIVILEGE_KEYWORDS,
    CREDENTIAL_KEYWORDS,
    EXFILTRATION_KEYWORDS,
    PRODUCTION_KEYWORDS,
)


def contains_keyword(text: str, keywords: list[str]) -> bool:
    return any(
        re.search(r"\b" + re.escape(keyword) + r"\b", text)
        for keyword in keywords
    )


def analyze_risk(action: str, context: str):
    action = action.lower()
    context = context.lower()

    score = 0.0
    reasons = []

    if contains_keyword(action, DESTRUCTIVE_KEYWORDS):
        score += 0.70
        reasons.append("Destructive action")

    if contains_keyword(action, PRIVILEGE_KEYWORDS):
        score += 0.60
        reasons.append("Privilege escalation")

    if contains_keyword(action, CREDENTIAL_KEYWORDS):
        score += 0.60
        reasons.append("Credential access")

    if contains_keyword(action, EXFILTRATION_KEYWORDS):
        score += 0.80
        reasons.append("Data exfiltration")

    if contains_keyword(context, PRODUCTION_KEYWORDS):
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