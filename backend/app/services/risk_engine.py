import re
from app.services.scoring import calculate_risk_score
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
from app.core.scope_scores import (
    CUSTOMER_DATA_SCORE,
    FINANCIAL_DATA_SCORE,
    EMPLOYEE_DATA_SCORE,
    DATABASE_SCORE,
    TEMPORARY_FILES_SCORE,
)
from app.schemas.risk import RiskFinding


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


def detect_findings(action: str, context: str):
    action = action.lower()
    context = context.lower()

    findings = []

    if contains_keyword(action, DESTRUCTIVE_KEYWORDS):
        findings.append(
            RiskFinding(
                category="DESTRUCTIVE",
                score=DESTRUCTIVE_SCORE,
                reason="Destructive action"
            )
        )

    if contains_keyword(action, PRIVILEGE_KEYWORDS):
        findings.append(
            RiskFinding(
                category="PRIVILEGE_ESCALATION",
                score=PRIVILEGE_SCORE,
                reason="Privilege escalation"
            )
        )

    if contains_keyword(action, CREDENTIAL_KEYWORDS):
        findings.append(
            RiskFinding(
                category="CREDENTIAL_ACCESS",
                score=CREDENTIAL_SCORE,
                reason="Credential access"
            )
        )

    if contains_keyword(action, EXFILTRATION_KEYWORDS):
        findings.append(
            RiskFinding(
                category="DATA_EXFILTRATION",
                score=EXFILTRATION_SCORE,
                reason="Data exfiltration"
            )
        )

    if contains_keyword(context, PRODUCTION_KEYWORDS):
        findings.append(
            RiskFinding(
                category="PRODUCTION",
                score=PRODUCTION_SCORE,
                reason="Production environment"
            )
        )

    return findings


def analyze_risk(action: str, context: str):
    action = action.lower()
    context = context.lower()

    findings = detect_findings(action, context)

    scopes = detect_scope(action)

    scope_scores = {
        "CUSTOMER_DATA": CUSTOMER_DATA_SCORE,
        "FINANCIAL_DATA": FINANCIAL_DATA_SCORE,
        "EMPLOYEE_DATA": EMPLOYEE_DATA_SCORE,
        "DATABASE": DATABASE_SCORE,
        "TEMPORARY_FILES": TEMPORARY_FILES_SCORE,
    }

    for scope in scopes:
        findings.append(
            RiskFinding(
                category=scope,
                score=scope_scores[scope],
                reason=f"{scope.replace('_', ' ').title()} scope"
            )
        )

    score = calculate_risk_score(findings)

    reasons = [
        finding.reason
        for finding in findings
        if finding.category not in scopes
    ]

    decision, risk_level = get_policy_decision(score)

    return {
        "decision": decision,
        "risk_score": score,
        "risk_level": risk_level,
        "reasons": reasons,
        "scopes": scopes
    }