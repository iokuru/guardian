import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
import io
import json

# Ensure sdk/python is in path
sdk_path = str(Path(__file__).resolve().parent.parent.parent / "sdk" / "python")
if sdk_path not in sys.path:
    sys.path.insert(0, sdk_path)

from guardian import Guardian, GuardianError, AnalysisResult, ReviewStatus


def test_sdk_initialization():
    client = Guardian(api_key="gdn_live_1234567890", base_url="http://localhost:8000")
    assert client.api_key == "gdn_live_1234567890"
    assert client.base_url == "http://localhost:8000"


def test_sdk_analyze_allow():
    client = Guardian(api_key="gdn_live_123")
    mock_payload = {
        "request_id": "req_abc123",
        "decision": "ALLOW",
        "risk_score": 0.12,
        "risk_level": "LOW",
        "decision_reason": "Baseline safe",
        "findings": [],
    }

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        result = client.analyze(action="echo hello", context="cli")

        assert isinstance(result, AnalysisResult)
        assert result.request_id == "req_abc123"
        assert result.decision == "allow"
        assert result.is_allowed is True
        assert result.is_blocked is False
        assert result.is_review_required is False


def test_sdk_analyze_block():
    client = Guardian(api_key="gdn_live_123")
    mock_payload = {
        "request_id": "req_block001",
        "decision": "BLOCK",
        "risk_score": 0.95,
        "risk_level": "CRITICAL",
        "decision_reason": "Destructive drop table in production",
        "findings": [
            {"category": "destructive", "score": 1.0, "reason": "drop table", "source": "action"}
        ],
    }

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        result = client.analyze(action="drop table users", context="production")

        assert result.is_blocked is True
        assert result.risk_level == "critical"
        assert len(result.findings) == 1
        assert result.findings[0].category == "destructive"


def test_sdk_review_status():
    client = Guardian(api_key="gdn_live_123")
    mock_payload = {
        "id": 42,
        "request_id": "req_rev001",
        "status": "APPROVED",
        "resolution_notes": "Approved by security lead",
        "analysis": {"decision": "ALLOW"},
    }

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        status = client.get_review(42)

        assert isinstance(status, ReviewStatus)
        assert status.id == 42
        assert status.is_approved is True
        assert status.decision == "allow"
