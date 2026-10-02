import io
import json
from unittest.mock import patch, MagicMock
import urllib.error
import pytest

from guardian.client import Guardian, GuardianError
from guardian.models import AnalysisResult, ReviewStatus


def test_client_init():
    client = Guardian(api_key="gdn_live_testkey", base_url="https://api.guardian.dev")
    assert client.api_key == "gdn_live_testkey"
    assert client.base_url == "https://api.guardian.dev"
    assert client.timeout == 30.0

    # Default base_url
    default_client = Guardian(api_key="gdn_live_testkey")
    assert default_client.base_url == "http://127.0.0.1:8000"

    # Missing api_key raises ValueError
    with pytest.raises(ValueError, match="API key is required"):
        Guardian(api_key="")


def test_analyze_allow():
    client = Guardian(api_key="gdn_live_123")
    mock_payload = {
        "request_id": "req_safe_01",
        "decision": "allow",
        "risk_score": 0.05,
        "risk_level": "low",
        "decision_reason": "Action within safe parameters",
        "findings": [],
    }

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        result = client.analyze(action="git status", context="developer terminal", agent_id="dev-bot")

        assert isinstance(result, AnalysisResult)
        assert result.request_id == "req_safe_01"
        assert result.is_allowed is True
        assert result.is_review_required is False
        assert result.is_blocked is False
        assert result.risk_score == 0.05
        assert result.findings == []


def test_analyze_block():
    client = Guardian(api_key="gdn_live_123")
    mock_payload = {
        "request_id": "req_block_01",
        "decision": "block",
        "risk_score": 0.95,
        "risk_level": "critical",
        "decision_reason": "Destructive query on production database",
        "findings": [
            {
                "category": "destructive",
                "severity": "critical",
                "score": 1.0,
                "reason": "drop database command detected",
                "source": "action",
            }
        ],
    }

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        result = client.analyze(action="drop database production", context="db-shell")

        assert result.is_blocked is True
        assert result.is_allowed is False
        assert result.risk_level == "critical"
        assert len(result.findings) == 1
        assert result.findings[0].category == "destructive"
        assert result.findings[0].score == 1.0


def test_get_review_by_id_and_request_id():
    client = Guardian(api_key="gdn_live_123")
    mock_payload = {
        "id": 10,
        "request_id": "req_review_01",
        "status": "pending",
        "analysis": {"decision": "review"},
    }

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        # By numeric id
        status1 = client.get_review(10)
        assert status1.id == 10
        assert status1.is_pending is True

        # By string request_id
        status2 = client.get_review("req_review_01")
        assert status2.id == 10
        assert status2.request_id == "req_review_01"


def test_wait_for_review_resolved():
    client = Guardian(api_key="gdn_live_123")

    pending_payload = {
        "id": 5,
        "request_id": "req_rev_wait",
        "status": "pending",
        "analysis": {"decision": "review"},
    }
    approved_payload = {
        "id": 5,
        "request_id": "req_rev_wait",
        "status": "approved",
        "resolution_notes": "Sign-off granted",
        "analysis": {"decision": "allow"},
    }

    with patch.object(client, "get_review", side_effect=[
        ReviewStatus(id=5, request_id="req_rev_wait", status="pending"),
        ReviewStatus(id=5, request_id="req_rev_wait", status="approved", decision="allow"),
    ]):
        resolved = client.wait_for_review("req_rev_wait", timeout=5.0, poll_interval=0.01)
        assert resolved.is_approved is True
        assert resolved.decision == "allow"


def test_wait_for_review_timeout():
    client = Guardian(api_key="gdn_live_123")
    with patch.object(client, "get_review", return_value=ReviewStatus(id=5, request_id="req_x", status="pending")):
        with pytest.raises(TimeoutError, match="not resolved within"):
            client.wait_for_review("req_x", timeout=0.05, poll_interval=0.01)


def test_get_timeline():
    client = Guardian(api_key="gdn_live_123")
    mock_timeline = {
        "request_id": "req_time_01",
        "stages": [
            {"stage": "ingestion", "outcome": "ingested"},
            {"stage": "automated_decision", "outcome": "allow"},
        ],
    }

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(mock_timeline).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        timeline = client.get_timeline("req_time_01")
        assert timeline["request_id"] == "req_time_01"
        assert len(timeline["stages"]) == 2


def test_guardian_error_on_401():
    client = Guardian(api_key="gdn_invalid_key")
    error = urllib.error.HTTPError(
        url="http://127.0.0.1:8000/analysis",
        code=401,
        msg="Unauthorized",
        hdrs={},
        fp=io.BytesIO(b'{"detail":"Invalid or inactive API key"}'),
    )

    with patch("urllib.request.urlopen", side_effect=error):
        with pytest.raises(GuardianError) as exc_info:
            client.analyze(action="git status")
        assert exc_info.value.status_code == 401
        assert "Invalid or inactive API key" in str(exc_info.value)
