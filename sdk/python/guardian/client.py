import json
import time
import urllib.request
import urllib.error
from typing import Any

from guardian.models import AnalysisResult, Finding, ReviewStatus


class GuardianError(Exception):
    def __init__(self, message: str, status_code: int | None = None, response_body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class Guardian:
    def __init__(
        self,
        api_key: str,
        base_url: str = "http://127.0.0.1:8000",
        timeout: float = 30.0,
    ):
        if not api_key:
            raise ValueError("Guardian API key is required")
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _request(self, method: str, path: str, payload: dict | None = None) -> dict:
        url = f"{self.base_url}/{path.lstrip('/')}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "guardian-python-sdk/1.0",
        }
        data = json.dumps(payload).encode("utf-8") if payload is not None else None

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                content = response.read().decode("utf-8")
                return json.loads(content) if content else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                parsed = json.loads(err_body)
                msg = parsed.get("detail", err_body)
            except Exception:
                msg = err_body
            raise GuardianError(f"Guardian API error ({e.code}): {msg}", status_code=e.code, response_body=err_body)
        except urllib.error.URLError as e:
            raise GuardianError(f"Failed to connect to Guardian at {self.base_url}: {e.reason}")

    def analyze(
        self,
        action: str,
        context: str = "",
        agent_id: str | None = None,
        request_id: str | None = None,
    ) -> AnalysisResult:
        payload = {
            "action": action,
            "context": context,
        }
        if agent_id:
            payload["agent_id"] = agent_id
        if request_id:
            payload["request_id"] = request_id

        data = self._request("POST", "/analysis", payload)

        findings = [
            Finding(
                category=f.get("category", ""),
                severity=f.get("severity"),
                score=float(f.get("score", 0.0)),
                reason=f.get("reason", ""),
                source=f.get("source", ""),
            )
            for f in data.get("findings", [])
        ]

        decision_str = str(data.get("decision", "block")).lower()

        return AnalysisResult(
            request_id=data.get("request_id", ""),
            decision=decision_str,
            risk_score=float(data.get("risk_score", 0.0)),
            risk_level=str(data.get("risk_level", "low")).lower(),
            decision_reason=data.get("decision_reason", ""),
            review_id=data.get("review_id"),
            analysis_id=data.get("analysis_id"),
            findings=findings,
            raw=data,
        )

    def get_review(self, review_id: int) -> ReviewStatus:
        data = self._request("GET", f"/reviews/{review_id}")
        analysis_data = data.get("analysis") or {}
        return ReviewStatus(
            id=data.get("id", review_id),
            request_id=data.get("request_id", ""),
            status=str(data.get("status", "pending")).lower(),
            decision=analysis_data.get("decision", "").lower() if analysis_data else None,
            resolution_notes=data.get("resolution_notes"),
            raw=data,
        )

    def wait_for_review(
        self,
        review_id: int,
        timeout: float = 60.0,
        poll_interval: float = 2.0,
    ) -> ReviewStatus:
        start_time = time.time()
        while time.time() - start_time < timeout:
            status = self.get_review(review_id)
            if not status.is_pending:
                return status
            time.sleep(poll_interval)
        raise TimeoutError(f"Review #{review_id} was not resolved within {timeout} seconds")

    def get_timeline(self, request_id: str) -> dict:
        return self._request("GET", f"/audit/requests/{request_id}")
