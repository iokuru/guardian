from guardian.models import AnalysisResult, Finding, ReviewStatus


def test_finding_dataclass():
    finding = Finding(
        category="credential_access",
        severity="high",
        score=0.75,
        reason="AWS credentials access in script",
        source="action",
    )
    assert finding.category == "credential_access"
    assert finding.severity == "high"
    assert finding.score == 0.75
    assert finding.reason == "AWS credentials access in script"
    assert finding.source == "action"


def test_analysis_result_properties():
    # Allow
    allow_result = AnalysisResult(
        request_id="req_1",
        decision="allow",
        risk_score=0.1,
        risk_level="low",
    )
    assert allow_result.is_allowed is True
    assert allow_result.is_review_required is False
    assert allow_result.is_blocked is False

    # Review
    review_result = AnalysisResult(
        request_id="req_2",
        decision="review",
        risk_score=0.6,
        risk_level="medium",
        review_id=42,
    )
    assert review_result.is_allowed is False
    assert review_result.is_review_required is True
    assert review_result.is_blocked is False
    assert review_result.review_id == 42

    # Block
    block_result = AnalysisResult(
        request_id="req_3",
        decision="block",
        risk_score=0.9,
        risk_level="critical",
    )
    assert block_result.is_allowed is False
    assert block_result.is_review_required is False
    assert block_result.is_blocked is True


def test_review_status_properties():
    pending = ReviewStatus(id=1, request_id="req_1", status="pending")
    assert pending.is_pending is True
    assert pending.is_approved is False
    assert pending.is_rejected is False

    approved = ReviewStatus(id=1, request_id="req_1", status="approved", decision="allow")
    assert approved.is_pending is False
    assert approved.is_approved is True
    assert approved.is_rejected is False
    assert approved.decision == "allow"

    rejected = ReviewStatus(id=1, request_id="req_1", status="rejected", decision="block")
    assert rejected.is_pending is False
    assert rejected.is_approved is False
    assert rejected.is_rejected is True
    assert rejected.decision == "block"
