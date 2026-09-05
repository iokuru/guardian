import re

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
from app.core.risk_types import FindingSource, RiskCategory
from app.schemas.risk import RiskFinding


def contains_keyword(text: str, keywords: list[str]) -> bool:
    return any(
        re.search(r"\b" + re.escape(keyword) + r"\b", text)
        for keyword in keywords
    )


def detect_findings(action: str, context: str) -> list[RiskFinding]:
    action = action.lower()
    context = context.lower()

    findings = []

    if contains_keyword(action, DESTRUCTIVE_KEYWORDS):
        findings.append(
            RiskFinding(
                category=RiskCategory.DESTRUCTIVE,
                score=DESTRUCTIVE_SCORE,
                reason="Destructive action",
                source=FindingSource.ACTION
            )
        )

    if contains_keyword(action, PRIVILEGE_KEYWORDS):
        findings.append(
            RiskFinding(
                category=RiskCategory.PRIVILEGE_ESCALATION,
                score=PRIVILEGE_SCORE,
                reason="Privilege escalation",
                source=FindingSource.ACTION
            )
        )

    if contains_keyword(action, CREDENTIAL_KEYWORDS):
        findings.append(
            RiskFinding(
                category=RiskCategory.CREDENTIAL_ACCESS,
                score=CREDENTIAL_SCORE,
                reason="Credential access",
                source=FindingSource.ACTION
            )
        )

    if contains_keyword(action, EXFILTRATION_KEYWORDS):
        findings.append(
            RiskFinding(
                category=RiskCategory.DATA_EXFILTRATION,
                score=EXFILTRATION_SCORE,
                reason="Data exfiltration",
                source=FindingSource.ACTION
            )
        )

    if contains_keyword(context, PRODUCTION_KEYWORDS):
        findings.append(
            RiskFinding(
                category=RiskCategory.PRODUCTION,
                score=PRODUCTION_SCORE,
                reason="Production environment",
                source=FindingSource.CONTEXT
            )
        )

    return findings