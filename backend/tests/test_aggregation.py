from app.core.risk_types import FindingSource, RiskCategory
from app.schemas.risk import RiskFinding
from app.services.aggregation import get_risk_categories


def test_empty_findings_return_no_categories():
    assert get_risk_categories([]) == []


def test_categories_are_extracted():
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

    assert get_risk_categories(findings) == [
        RiskCategory.DESTRUCTIVE,
        RiskCategory.PRODUCTION,
    ]


def test_duplicate_categories_are_removed():
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

    assert get_risk_categories(findings) == [
        RiskCategory.DESTRUCTIVE,
    ]