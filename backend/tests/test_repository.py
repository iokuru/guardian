from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest
from app.models.database import Base
from app.models.analysis import Analysis
from app.models.finding import Finding
from app.repositories.analysis_repository import create_analysis
from app.schemas.analysis import AnalysisResponse
from app.core.decision_types import RiskDecision, RiskLevel
from app.core.risk_types import RiskCategory, FindingSource
from app.schemas.risk import RiskFinding


def test_create_analysis_persists_analysis_and_findings():
    engine = create_engine("sqlite:///:memory:")

    Base.metadata.create_all(engine)

    SessionLocal = sessionmaker(bind=engine)

    db = SessionLocal()

    result = AnalysisResponse(
        decision=RiskDecision.BLOCK,
        risk_score=1.0,
        risk_level=RiskLevel.CRITICAL,
        decision_reason="Critical policy override",
        risk_categories=[
            RiskCategory.DESTRUCTIVE,
            RiskCategory.PRODUCTION,
            RiskCategory.CUSTOMER_DATA,
        ],
        reasons=[
            "Destructive action",
            "Production environment",
        ],
        scopes=[
            RiskCategory.CUSTOMER_DATA,
        ],
        findings=[
            RiskFinding(
                category=RiskCategory.DESTRUCTIVE,
                score=0.7,
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
        ],
    )

    analysis = create_analysis(
        db,
        "Delete all customer records",
        "Production database",
        result,
    )

    assert analysis.id is not None
    assert analysis.decision == "BLOCK"
    assert analysis.risk_score == 1.0
    assert analysis.risk_level == "CRITICAL"

    findings = (
        db.query(Finding)
        .filter(Finding.analysis_id == analysis.id)
        .all()
    )

    assert len(findings) == 3

    categories = {finding.category for finding in findings}

    assert categories == {
        "DESTRUCTIVE",
        "PRODUCTION",
        "CUSTOMER_DATA",
    }

    db.close()


def test_create_analysis_rolls_back_on_failure():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    result = AnalysisResponse(
        decision=RiskDecision.BLOCK,
        risk_score=1.0,
        risk_level=RiskLevel.CRITICAL,
        decision_reason="Critical policy override",
        risk_categories=[
            RiskCategory.DESTRUCTIVE,
            RiskCategory.PRODUCTION,
        ],
        reasons=[
            "Destructive action",
            "Production environment",
        ],
        scopes=[],
        findings=[],
    )

    original_commit = db.commit

    def failing_commit():
        raise RuntimeError("database failure")

    db.commit = failing_commit

    with pytest.raises(RuntimeError, match="database failure"):
        create_analysis(
            db,
            "Delete customer records",
            "Production database",
            result,
        )

    db.commit = original_commit

    assert db.query(Analysis).count() == 0
    assert db.query(Finding).count() == 0