from app.core.risk_types import FindingSource, RiskCategory
from app.schemas.risk import RiskFinding
from app.services.scoring import calculate_risk_score


def test_empty_findings_score_zero():
    assert calculate_risk_score([]) == 0.0


def test_single_finding_uses_finding_score():
    finding = RiskFinding(
        category=RiskCategory.DESTRUCTIVE,
        score=0.70,
        reason="Destructive action",
        source=FindingSource.ACTION,
    )

    assert calculate_risk_score([finding]) == 0.70


def test_multiple_findings_are_summed():
    findings = [
        RiskFinding(
            category=RiskCategory.DESTRUCTIVE,
            score=0.70,
            reason="Destructive action",
            source=FindingSource.ACTION,
        ),
        RiskFinding(
            category=RiskCategory.PRODUCTION,
            score=0.25,
            reason="Production environment",
            source=FindingSource.CONTEXT,
        ),
    ]

    assert calculate_risk_score(findings) == 0.95


def test_score_is_capped_at_one():
    findings = [
        RiskFinding(
            category=RiskCategory.DESTRUCTIVE,
            score=0.70,
            reason="Destructive action",
            source=FindingSource.ACTION,
        ),
        RiskFinding(
            category=RiskCategory.PRODUCTION,
            score=0.25,
            reason="Production environment",
            source=FindingSource.CONTEXT,
        ),
        RiskFinding(
            category=RiskCategory.CUSTOMER_DATA,
            score=0.15,
            reason="Customer Data scope",
            source=FindingSource.SCOPE,
        ),
    ]

    assert calculate_risk_score(findings) == 1.0


def test_duplicate_risk_categories_are_counted_once():
    findings = [
        RiskFinding(
            category=RiskCategory.DESTRUCTIVE,
            score=0.70,
            reason="Destructive action",
            source=FindingSource.ACTION,
        ),
        RiskFinding(
            category=RiskCategory.DESTRUCTIVE,
            score=0.70,
            reason="Destructive action",
            source=FindingSource.MODEL,
        ),
    ]

    assert calculate_risk_score(findings) == 0.70