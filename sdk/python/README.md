# Guardian Python SDK

Action review and policy enforcement client for automated systems and agent loops.

## Installation

```bash
pip install guardian-sdk
```

## Quick Start

```python
from guardian import Guardian

guardian = Guardian(
    api_key="gdn_live_..."
)

result = guardian.analyze(
    action="Delete all customer records",
    context="Production database",
    agent_id="customer-support-agent",
)

if result.is_allowed:
    perform_action()

elif result.is_review_required:
    review = guardian.wait_for_review(result.request_id)

    if review.is_approved:
        perform_action()
```

## Client Configuration

```python
from guardian import Guardian

guardian = Guardian(
    api_key="gdn_live_...",
    base_url="https://api.guardian.dev",  # defaults to http://127.0.0.1:8000
    timeout=30.0,                         # request timeout in seconds
)
```

## Core Methods

### `analyze()`

Evaluate an action before execution against active environment policies.

```python
result = guardian.analyze(
    action="GRANT admin TO user_42",
    context="Staging cluster",
    agent_id="provisioning-bot",
)

# Properties:
# result.is_allowed          -> bool
# result.is_review_required  -> bool
# result.is_blocked          -> bool
# result.risk_score          -> float (0.0 to 1.0)
# result.risk_level          -> "low" | "medium" | "high" | "critical"
# result.request_id          -> str (e.g. "req_abc123")
# result.review_id           -> int | None
# result.findings            -> list[Finding]
```

### `get_review()`

Retrieve the current review status by review ID or request ID.

```python
status = guardian.get_review(result.request_id)
# or guardian.get_review(result.review_id)

# Properties:
# status.is_pending   -> bool
# status.is_approved  -> bool
# status.is_rejected  -> bool
# status.decision     -> "allow" | "block" | None
```

### `wait_for_review()`

Poll until a human security reviewer approves or rejects the action.

```python
review = guardian.wait_for_review(
    target=result.request_id,
    timeout=120.0,        # max wait in seconds
    poll_interval=2.0,    # polling frequency in seconds
)

if review.is_approved:
    perform_action()
```

### `get_timeline()`

Fetch the end-to-end lifecycle trace for a request ID.

```python
timeline = guardian.get_timeline(result.request_id)
for stage in timeline.get("stages", []):
    print(f"[{stage['stage']}] {stage['title']} -> {stage['outcome']}")
```
