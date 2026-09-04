import re

from app.core.policy import get_policy_decision
from app.core.risk_categories import (
    DESTRUCTIVE_KEYWORDS,
    PRIVILEGE_KEYWORDS,
    CREDENTIAL_KEYWORDS,
    EXFILTRATION_KEYWORDS,
    PRODUCTION_KEYWORDS,
)
from app.core.risk_scores import (
    DESTRUCTIVE_SCORE,
    PRIVILEGE_SCORE,
    CREDENTIAL_SCORE,
    EXFILTRATION_SCORE,
    PRODUCTION_SCORE,
)
from app.core.risk_scope import (
    CUSTOMER_DATA_KEYWORDS,
    FINANCIAL_DATA_KEYWORDS,
    EMPLOYEE_DATA_KEYWORDS,
    DATABASE_KEYWORDS,
    TEMPORARY_FILE_KEYWORDS,
)


def contains_keyword(text: str, keywords: list[str]) -> bool:
    return any(
        re.search(r"\b" + re.escape(keyword) + r"\b", text)
        for keyword in keywords
    )


def detect_scope(action: str):
    scopes = []

    if contains_keyword(action, CUSTOMER_DATA_KEYWORDS):
        scopes.append("CUSTOMER_DATA")

    if contains_keyword(action, FINANCIAL_DATA_KEYWORDS):
        scopes.append("FINANCIAL_DATA")

    if contains_keyword(action, EMPLOYEE_DATA_KEYWORDS):
        scopes.append("EMPLOYEE_DATA")

    if contains_keyword(action, DATABASE_KEYWORDS):
        scopes.append("DATABASE")

    if contains_keyword(action, TEMPORARY_FILE_KEYWORDS):
        scopes.append("TEMPORARY_FILES")

    return scopes


def analyze_risk(action: str, context: str):
    action = action.lower()
    context = context.lower()

    score = 0.0
    reasons = []

    if contains_keyword(action, DESTRUCTIVE_KEYWORDS):
        score += DESTRUCTIVE_SCORE
        reasons.append("Destructive action")

    if contains_keyword(action, PRIVILEGE_KEYWORDS):
        score += PRIVILEGE_SCORE
        reasons.append("Privilege escalation")

    if contains_keyword(action, CREDENTIAL_KEYWORDS):
        score += CREDENTIAL_SCORE
        reasons.append("Credential access")

    if contains_keyword(action, EXFILTRATION_KEYWORDS):
        score += EXFILTRATION_SCORE
        reasons.append("Data exfiltration")

    if contains_keyword(context, PRODUCTION_KEYWORDS):
        score += PRODUCTION_SCORE
        reasons.append("Production environment")

    score = min(score, 1.0)

    decision, risk_level = get_policy_decision(score)

    return {
        "decision": decision,
        "risk_score": score,
        "risk_level": risk_level,
        "reasons": reasons,
        "scopes": detect_scope(action)
    }