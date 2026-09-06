from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models.database import Base
from app.models.dependencies import get_db
from app.models.analysis import Analysis
from app.models.finding import Finding

from app.core.decision_types import RiskDecision, RiskLevel
from app.core.policy import get_policy_decision

from app.core.risk_types import FindingSource, RiskCategory
from app.schemas.risk import RiskFinding

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
)

Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_production_delete_is_blocked():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete all customer records",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_score"] == 1.0
    assert data["risk_level"] == "CRITICAL"


def test_normal_action_is_low_risk():
    response = client.post(
        "/analyze",
        json={
            "action": "Read customer information",
            "context": "Development database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "ALLOW"
    assert data["risk_score"] == 0.15
    assert data["risk_level"] == "LOW"


def test_privilege_escalation_requires_review():
    response = client.post(
        "/analyze",
        json={
            "action": "Grant admin privileges to a user",
            "context": "Internal system"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "REVIEW"
    assert data["risk_score"] == 0.60
    assert data["risk_level"] == "HIGH"


def test_credential_access_requires_review():
    response = client.post(
        "/analyze",
        json={
            "action": "Retrieve the API key",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "REVIEW"
    assert data["risk_score"] == 0.60
    assert data["risk_level"] == "HIGH"


def test_data_exfiltration_is_blocked():
    response = client.post(
        "/analyze",
        json={
            "action": "Export customer data",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_score"] == 1.0
    assert data["risk_level"] == "CRITICAL"


def test_keyword_inside_word_does_not_trigger():
    response = client.post(
        "/analyze",
        json={
            "action": "Review the deletion policy",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "ALLOW"
    assert data["risk_score"] == 0.0
    assert data["risk_level"] == "LOW"
    assert data["reasons"] == []


def test_empty_action_is_rejected():
    response = client.post(
        "/analyze",
        json={
            "action": "",
            "context": "Production database"
        }
    )

    assert response.status_code == 422


def test_empty_context_is_rejected():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete all customer records",
            "context": ""
        }
    )

    assert response.status_code == 422


def test_production_read_is_medium_risk():
    response = client.post(
        "/analyze",
        json={
            "action": "Read customer information",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "ALLOW"
    assert data["risk_score"] == 0.40
    assert data["risk_level"] == "MEDIUM"
    assert data["reasons"] == ["Production environment"]


def test_privilege_escalation_in_production_is_blocked():
    response = client.post(
        "/analyze",
        json={
            "action": "Grant admin privileges to a user",
            "context": "Production system"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_score"] == 0.85
    assert data["risk_level"] == "CRITICAL"
    assert data["reasons"] == [
        "Privilege escalation",
        "Production environment"
    ]


def test_credential_access_in_production_is_blocked():
    response = client.post(
        "/analyze",
        json={
            "action": "Retrieve the API key",
            "context": "Production environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_score"] == 0.85
    assert data["risk_level"] == "CRITICAL"
    assert data["reasons"] == [
        "Credential access",
        "Production environment"
    ]


def test_multiple_risks_are_combined():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete the database and retrieve the API key",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_score"] == 1.0
    assert data["risk_level"] == "CRITICAL"
    assert data["reasons"] == [
        "Destructive action",
        "Credential access",
        "Production environment"
    ]


def test_customer_data_scope_is_detected():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete all customer records",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scopes"] == ["CUSTOMER_DATA"]


def test_financial_data_scope_is_detected():
    response = client.post(
        "/analyze",
        json={
            "action": "Export financial data",
            "context": "Internal system"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scopes"] == ["FINANCIAL_DATA"]


def test_database_scope_is_detected():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete the database",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scopes"] == ["DATABASE"]


def test_temporary_files_scope_is_detected():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete temporary files",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scopes"] == ["TEMPORARY_FILES"]


def test_action_without_scope_returns_empty_scope():
    response = client.post(
        "/analyze",
        json={
            "action": "Restart the application",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["scopes"] == []


def test_destructive_action_creates_finding():
    from app.services.risk_engine import detect_findings

    findings = detect_findings(
        "Delete all customer records",
        "Development database"
    )

    assert len(findings) == 1
    assert findings[0].category == "DESTRUCTIVE"
    assert findings[0].score == 0.70
    assert findings[0].reason == "Destructive action"


def test_multiple_risk_findings_are_created():
    from app.services.risk_engine import detect_findings

    findings = detect_findings(
        "Delete the database and retrieve the API key",
        "Production database"
    )

    categories = [finding.category for finding in findings]

    assert categories == [
        "DESTRUCTIVE",
        "CREDENTIAL_ACCESS",
        "PRODUCTION"
    ]


def test_finding_scores_are_preserved():
    from app.services.risk_engine import detect_findings

    findings = detect_findings(
        "Grant admin privileges to a user",
        "Production system"
    )

    scores = [finding.score for finding in findings]

    assert scores == [0.60, 0.25]


def test_scoring_single_finding():
    from app.core.risk_types import FindingSource, RiskCategory
    from app.schemas.risk import RiskFinding
    from app.services.scoring import calculate_risk_score

    findings = [
        RiskFinding(
            category=RiskCategory.DESTRUCTIVE,
            score=0.70,
            reason="Destructive action",
            source=FindingSource.ACTION
        )
    ]

    assert calculate_risk_score(findings) == 0.70


def test_scoring_multiple_findings():
    from app.core.risk_types import FindingSource, RiskCategory
    from app.schemas.risk import RiskFinding
    from app.services.scoring import calculate_risk_score

    findings = [
        RiskFinding(
            category=RiskCategory.DESTRUCTIVE,
            score=0.70,
            reason="Destructive action",
            source=FindingSource.ACTION
        ),
        RiskFinding(
            category=RiskCategory.PRODUCTION,
            score=0.25,
            reason="Production environment",
            source=FindingSource.ACTION
        )
    ]

    assert calculate_risk_score(findings) == 0.95


def test_scoring_is_capped_at_one():
    from app.core.risk_types import FindingSource, RiskCategory
    from app.schemas.risk import RiskFinding
    from app.services.scoring import calculate_risk_score

    findings = [
        RiskFinding(
            category=RiskCategory.DESTRUCTIVE,
            score=0.70,
            reason="Destructive action",
            source=FindingSource.ACTION
        ),
        RiskFinding(
            category=RiskCategory.DATA_EXFILTRATION,
            score=0.80,
            reason="Data exfiltration",
            source=FindingSource.ACTION
        )
    ]

    assert calculate_risk_score(findings) == 1.0


def test_empty_findings_have_zero_score():
    from app.services.scoring import calculate_risk_score

    assert calculate_risk_score([]) == 0.0


def test_complete_risk_pipeline():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete all customer records",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_score"] == 1.0
    assert data["risk_level"] == "CRITICAL"
    assert data["reasons"] == [
        "Destructive action",
        "Production environment"
    ]
    assert data["scopes"] == [
        "CUSTOMER_DATA"
    ]
    assert len(data["findings"]) == 3
    assert data["findings"][0] == {
        "category": "DESTRUCTIVE",
        "score": 0.7,
        "reason": "Destructive action",
        "source": "ACTION"
    }
    assert data["findings"][1] == {
        "category": "PRODUCTION",
        "score": 0.25,
        "reason": "Production environment",
        "source": "CONTEXT"
    }
    assert data["findings"][2]["category"] == "CUSTOMER_DATA"
    assert data["findings"][2]["score"] == 0.15
    assert data["findings"][2]["source"] == "SCOPE"



def test_risk_finding_rejects_negative_score():
    from pydantic import ValidationError
    from app.core.risk_types import FindingSource, RiskCategory
    from app.schemas.risk import RiskFinding

    try:
        RiskFinding(
            category=RiskCategory.DESTRUCTIVE,
            score=-0.1,
            reason="Destructive action",
            source=FindingSource.ACTION
        )
        assert False
    except ValidationError:
        assert True


def test_risk_finding_rejects_score_above_one():
    from pydantic import ValidationError
    from app.core.risk_types import FindingSource, RiskCategory
    from app.schemas.risk import RiskFinding

    try:
        RiskFinding(
            category=RiskCategory.DESTRUCTIVE,
            score=1.1,
            reason="Destructive action",
            source=FindingSource.ACTION
        )
        assert False
    except ValidationError:
        assert True




def test_policy_low_boundary():
    from app.core.decision_types import RiskDecision, RiskLevel
    from app.core.policy import get_policy_decision

    decision, level, reason = get_policy_decision(0.19)

    assert decision == RiskDecision.ALLOW
    assert level == RiskLevel.LOW


def test_policy_medium_boundary():
    from app.core.decision_types import RiskDecision, RiskLevel
    from app.core.policy import get_policy_decision

    decision, level, reason = get_policy_decision(0.20)

    assert decision == RiskDecision.ALLOW
    assert level == RiskLevel.MEDIUM


def test_policy_high_boundary():
    from app.core.decision_types import RiskDecision, RiskLevel
    from app.core.policy import get_policy_decision

    decision, level, reason = get_policy_decision(0.50)

    assert decision == RiskDecision.REVIEW
    assert level == RiskLevel.HIGH


def test_policy_critical_boundary():
    from app.core.decision_types import RiskDecision, RiskLevel
    from app.core.policy import get_policy_decision

    decision, level, reason = get_policy_decision(0.80)

    assert decision == RiskDecision.BLOCK
    assert level == RiskLevel.CRITICAL



def test_detector_returns_no_findings_for_safe_action():
    from app.services.detector import detect_findings

    findings = detect_findings(
        "Restart the application",
        "Development environment"
    )

    assert findings == []


def test_detector_detects_destructive_action():
    from app.core.risk_types import FindingSource, RiskCategory
    from app.services.detector import detect_findings

    findings = detect_findings(
        "Delete all customer records",
        "Development environment"
    )

    assert len(findings) == 1
    assert findings[0].category == RiskCategory.DESTRUCTIVE
    assert findings[0].score == 0.70
    assert findings[0].source == FindingSource.ACTION


def test_detector_detects_production_context():
    from app.core.risk_types import FindingSource, RiskCategory
    from app.services.detector import detect_findings

    findings = detect_findings(
        "Read customer information",
        "Production database"
    )

    assert len(findings) == 1
    assert findings[0].category == RiskCategory.PRODUCTION
    assert findings[0].score == 0.25
    assert findings[0].source == FindingSource.CONTEXT



def test_destructive_variants_are_detected():
    from app.core.risk_types import RiskCategory
    from app.services.detector import detect_findings

    actions = [
        "Remove all customer records",
        "Purge the database",
        "Erase customer information",
        "Clear the database",
        "Reset the production data",
        "Overwrite the customer records",
    ]

    for action in actions:
        findings = detect_findings(
            action,
            "Development environment"
        )

        assert any(
            finding.category == RiskCategory.DESTRUCTIVE
            for finding in findings
        )



def test_privilege_variants_are_detected():
    from app.core.risk_types import RiskCategory
    from app.services.detector import detect_findings

    actions = [
        "Make user admin",
        "Elevate privileges for the account",
        "Escalate privileges",
        "Assign admin role to the user",
        "Grant root access",
        "Enable sudo access",
    ]

    for action in actions:
        findings = detect_findings(
            action,
            "Development environment"
        )

        assert any(
            finding.category == RiskCategory.PRIVILEGE_ESCALATION
            for finding in findings
        )



def test_credential_variants_are_detected():
    from app.core.risk_types import RiskCategory
    from app.services.detector import detect_findings

    actions = [
        "Retrieve credentials",
        "Read credentials from the system",
        "Get credentials",
        "Extract credentials",
        "Retrieve the service account key",
        "Read database credentials",
        "Retrieve the authentication token",
    ]

    for action in actions:
        findings = detect_findings(
            action,
            "Development environment"
        )

        assert any(
            finding.category == RiskCategory.CREDENTIAL_ACCESS
            for finding in findings
        )




def test_exfiltration_variants_are_detected():
    from app.core.risk_types import RiskCategory
    from app.services.detector import detect_findings

    actions = [
        "Send customer data",
        "Upload the database",
        "Export the database",
        "Download customer data",
        "Transfer customer data",
        "Transfer the database",
        "Exfiltrate data",
    ]

    for action in actions:
        findings = detect_findings(
            action,
            "Development environment"
        )

        assert any(
            finding.category == RiskCategory.DATA_EXFILTRATION
            for finding in findings
        )



def test_detector_does_not_assume_synonyms():
    from app.services.detector import detect_findings

    findings = detect_findings(
        "Get rid of all client records",
        "Development environment"
    )

    assert findings == []


def test_detector_does_not_detect_unseen_exfiltration_phrase():
    from app.services.detector import detect_findings

    findings = detect_findings(
        "Move client records outside the organization",
        "Production environment"
    )

    assert not any(
        finding.category.value == "DATA_EXFILTRATION"
        for finding in findings
    )



def test_semantic_detector_interface_returns_findings_list():
    from app.services.semantic_detector import detect_semantic_findings
    from app.core.risk_types import RiskCategory

    findings = detect_semantic_findings(
        "Get rid of all client records",
        "Development environment"
    )

    assert isinstance(findings, list)
    assert any(
        finding.category == RiskCategory.DESTRUCTIVE
        for finding in findings
    )


def test_semantic_risk_flows_through_analysis():
    response = client.post(
        "/analyze",
        json={
            "action": "Get rid of all client records",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "REVIEW"
    assert data["risk_level"] == "HIGH"
    assert data["risk_score"] >= 0.50
    assert any(
        "semantic destructive" in reason.lower()
        for reason in data["reasons"]
    )


def test_risk_engine_combines_action_context_and_scope():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete all customer records",
            "context": "Production database"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["decision"] == "BLOCK"
    assert data["risk_level"] == "CRITICAL"
    assert data["risk_score"] == 1.0

    categories = {
        finding["category"]
        for finding in data["findings"]
    }

    assert "DESTRUCTIVE" in categories
    assert "PRODUCTION" in categories
    assert "CUSTOMER_DATA" in categories


def test_risk_engine_uses_semantic_detection():
    response = client.post(
        "/analyze",
        json={
            "action": "Get rid of all client records",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    categories = {
        finding["category"]
        for finding in data["findings"]
    }

    assert "DESTRUCTIVE" in categories
    assert data["risk_score"] >= 0.50


def test_risk_engine_does_not_double_count_semantic_category():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete all customer records",
            "context": "Development environment"
        }
    )

    assert response.status_code == 200

    data = response.json()

    destructive_findings = [
        finding
        for finding in data["findings"]
        if finding["category"] == "DESTRUCTIVE"
    ]

    assert len(destructive_findings) == 1
    assert destructive_findings[0]["source"] == "ACTION"


def test_collect_findings_returns_findings_and_scopes():
    from app.services.risk_engine import collect_findings
    from app.core.risk_types import RiskCategory

    findings, scopes = collect_findings(
        "Delete all customer records",
        "Production database"
    )

    assert isinstance(findings, list)
    assert isinstance(scopes, list)

    assert RiskCategory.DESTRUCTIVE in {
        finding.category for finding in findings
    }

    assert RiskCategory.PRODUCTION in {
        finding.category for finding in findings
    }

    assert RiskCategory.CUSTOMER_DATA in scopes


def test_collect_findings_includes_semantic_detection():
    from app.services.risk_engine import collect_findings
    from app.core.risk_types import RiskCategory, FindingSource

    findings, scopes = collect_findings(
        "Get rid of all client records",
        "Development environment"
    )

    destructive_findings = [
        finding
        for finding in findings
        if finding.category == RiskCategory.DESTRUCTIVE
    ]

    assert len(destructive_findings) == 1
    assert destructive_findings[0].source == FindingSource.MODEL
    assert scopes == []



def test_list_analyses_returns_saved_analysis():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete all customer records",
            "context": "Production database",
        },
    )

    assert response.status_code == 200

    response = client.get("/analyses")

    assert response.status_code == 200

    data = response.json()

    assert len(data) >= 1
    assert data[0]["action"] == "Delete all customer records"
    assert data[0]["decision"] == "BLOCK"
    assert "findings" in data[0]
    assert data[0]["policy_version"] == "1.0"
    assert data[0]["detector_version"] == "1.0"
    assert data[0]["semantic_model"] == "all-MiniLM-L6-v2"


def test_get_analysis_returns_saved_analysis():
    response = client.post(
        "/analyze",
        json={
            "action": "Delete customer records",
            "context": "Production database",
        },
    )

    assert response.status_code == 200

    analyses = client.get("/analyses").json()
    analysis_id = analyses[0]["id"]

    response = client.get(f"/analyses/{analysis_id}")

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == analysis_id
    assert data["action"] == "Delete customer records"
    assert data["decision"] == "BLOCK"
    assert "findings" in data
    assert data["policy_version"] == "1.0"
    assert data["detector_version"] == "1.0"
    assert data["semantic_model"] == "all-MiniLM-L6-v2"


def test_get_missing_analysis_returns_404():
    response = client.get("/analyses/999999")

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Analysis not found"
    }


def test_list_analyses_rejects_invalid_limit():
    response = client.get("/analyses?limit=0")

    assert response.status_code == 422

    response = client.get("/analyses?limit=101")

    assert response.status_code == 422


def test_policy_allows_low_risk():
    decision, level, reason = get_policy_decision(0.19)

    assert decision == RiskDecision.ALLOW
    assert level == RiskLevel.LOW


def test_policy_allows_medium_risk():
    decision, level, reason = get_policy_decision(0.20)

    assert decision == RiskDecision.ALLOW
    assert level == RiskLevel.MEDIUM


def test_policy_reviews_high_risk():
    decision, level, reason = get_policy_decision(0.50)

    assert decision == RiskDecision.REVIEW
    assert level == RiskLevel.HIGH


def test_policy_blocks_critical_risk():
    decision, level, reason = get_policy_decision(0.80)

    assert decision == RiskDecision.BLOCK
    assert level == RiskLevel.CRITICAL


def test_policy_blocks_credential_access_in_production():
    findings = [
        RiskFinding(
            category=RiskCategory.CREDENTIAL_ACCESS,
            score=0.60,
            reason="Credential access",
            source=FindingSource.ACTION,
        ),
        RiskFinding(
            category=RiskCategory.PRODUCTION,
            score=0.25,
            reason="Production environment",
            source=FindingSource.CONTEXT,
        ),
    ]

    decision, level, reason = get_policy_decision(0.30, findings)

    assert decision == RiskDecision.BLOCK
    assert level == RiskLevel.CRITICAL


def test_policy_blocks_destructive_action_in_production():
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

    decision, level, reason = get_policy_decision(0.30, findings)

    assert decision == RiskDecision.BLOCK
    assert level == RiskLevel.CRITICAL


def test_policy_does_not_override_single_critical_category():
    findings = [
        RiskFinding(
            category=RiskCategory.CREDENTIAL_ACCESS,
            score=0.60,
            reason="Credential access",
            source=FindingSource.ACTION,
        ),
    ]

    decision, level, reason = get_policy_decision(0.60, findings)

    assert decision == RiskDecision.REVIEW
    assert level == RiskLevel.HIGH


def test_policy_does_not_override_unrelated_findings():
    findings = [
        RiskFinding(
            category=RiskCategory.DESTRUCTIVE,
            score=0.70,
            reason="Destructive action",
            source=FindingSource.ACTION,
        ),
        RiskFinding(
            category=RiskCategory.CUSTOMER_DATA,
            score=0.15,
            reason="Customer Data scope",
            source=FindingSource.SCOPE,
        ),
    ]

    decision, level, reason = get_policy_decision(0.70, findings)

    assert decision == RiskDecision.REVIEW
    assert level == RiskLevel.HIGH


def test_policy_blocks_when_any_critical_combination_matches():
    findings = [
        RiskFinding(
            category=RiskCategory.CUSTOMER_DATA,
            score=0.15,
            reason="Customer Data scope",
            source=FindingSource.SCOPE,
        ),
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

    decision, level, reason = get_policy_decision(0.30, findings)

    assert decision == RiskDecision.BLOCK
    assert level == RiskLevel.CRITICAL