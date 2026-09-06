from app.core.policy import get_policy_decision
from app.core.risk_scope import (
    CUSTOMER_DATA_KEYWORDS,
    DATABASE_KEYWORDS,
    EMPLOYEE_DATA_KEYWORDS,
    FINANCIAL_DATA_KEYWORDS,
    TEMPORARY_FILE_KEYWORDS,
)
from app.core.risk_types import FindingSource, RiskCategory
from app.core.scope_scores import SCOPE_SCORES
from app.core.versions import (
    DETECTOR_VERSION,
    POLICY_VERSION,
    SEMANTIC_MODEL,
)
from app.schemas.analysis import AnalysisResponse
from app.schemas.risk import RiskFinding
from app.services.aggregation import get_risk_categories
from app.services.detector import contains_keyword, detect_findings
from app.services.finding_factory import create_finding
from app.services.normalization import normalize_text
from app.services.reasons import get_risk_reasons
from app.services.scoring import calculate_risk_score
from app.services.semantic_detector import detect_semantic_findings

SCOPE_REASONS = {
    RiskCategory.CUSTOMER_DATA: "Customer Data scope",
    RiskCategory.FINANCIAL_DATA: "Financial Data scope",
    RiskCategory.EMPLOYEE_DATA: "Employee Data scope",
    RiskCategory.DATABASE: "Database scope",
    RiskCategory.TEMPORARY_FILES: "Temporary Files scope",
}


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
    action = normalize_text(action)

    context = normalize_text(context)

    findings, scopes = collect_findings(action, context)

    score = calculate_risk_score(findings)

    reasons = get_risk_reasons(findings, scopes)

    risk_categories = get_risk_categories(findings)

    decision, risk_level, decision_reason = get_policy_decision(
        score,
        findings,
    )

    return AnalysisResponse(
        decision=decision,
        risk_score=score,
        risk_level=risk_level,
        decision_reason=decision_reason,
        risk_categories=risk_categories,
        reasons=reasons,
        scopes=scopes,
        findings=findings,
        policy_version=POLICY_VERSION,
        detector_version=DETECTOR_VERSION,
        semantic_model=SEMANTIC_MODEL,
    )


def collect_findings(
    action: str, context: str
) -> tuple[list[RiskFinding], list[RiskCategory]]:
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
            create_finding(
                category=scope,
                score=SCOPE_SCORES[scope],
                reason=SCOPE_REASONS[scope],
                source=FindingSource.SCOPE,
            )
        )

    return findings, scopes