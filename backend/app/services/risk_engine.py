from app.core.policy import get_policy_decision
from app.services.semantic_detector import detect_semantic_findings
from app.core.risk_scope import (
    CUSTOMER_DATA_KEYWORDS,
    DATABASE_KEYWORDS,
    EMPLOYEE_DATA_KEYWORDS,
    FINANCIAL_DATA_KEYWORDS,
    TEMPORARY_FILE_KEYWORDS,
)
from app.core.risk_types import FindingSource, RiskCategory
from app.core.scope_scores import SCOPE_SCORES
from app.schemas.analysis import AnalysisResponse
from app.schemas.risk import RiskFinding
from app.services.detector import contains_keyword, detect_findings
from app.services.reasons import get_risk_reasons
from app.services.scoring import calculate_risk_score


def detect_scope(action: str):
    scopes = []

    if contains_keyword(action, CUSTOMER_DATA_KEYWORDS):
        scopes.append(RiskCategory.CUSTOMER_DATA)

    if contains_keyword(action, FINANCIAL_DATA_KEYWORDS):
        scopes.append(RiskCategory.FINANCIAL_DATA)

    if contains_keyword(action, EMPLOYEE_DATA_KEYWORDS):
        scopes.append(RiskCategory.EMPLOYEE_DATA)

    if contains_keyword(action, DATABASE_KEYWORDS):
        scopes.append(RiskCategory.DATABASE)

    if contains_keyword(action, TEMPORARY_FILE_KEYWORDS):
        scopes.append(RiskCategory.TEMPORARY_FILES)

    return scopes


def analyze_risk(action: str, context: str) -> AnalysisResponse:
    findings = detect_findings(action, context)

    semantic_findings = detect_semantic_findings(action, context)

    existing_categories = {
        finding.category
        for finding in findings
    }

    findings.extend(
        finding
        for finding in semantic_findings
        if finding.category not in existing_categories
    )

    scopes = detect_scope(action)

    for scope in scopes:
        findings.append(
            RiskFinding(
                category=scope,
                score=SCOPE_SCORES[scope],
                reason=f"{scope.value.replace('_', ' ').title()} scope",
                source=FindingSource.SCOPE,
            )
        )

    score = calculate_risk_score(findings)

    reasons = get_risk_reasons(findings, scopes)

    decision, risk_level = get_policy_decision(score)

    return AnalysisResponse(
        decision=decision,
        risk_score=score,
        risk_level=risk_level,
        reasons=reasons,
        scopes=scopes,
    )