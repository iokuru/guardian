# Guardian Python SDK

Action review and policy enforcement client for automated systems and agent loops.

## Installation

```bash
pip install guardian-sdk
```

## Quick Start

```python
from guardian import Guardian

# Initialize client with your API key
guardian = Guardian(api_key="gdn_live_...", base_url="http://127.0.0.1:8000")

# Pre-flight evaluation before tool execution
result = guardian.analyze(
    action="Delete all customer records",
    context="Production database",
    agent_id="customer-support-agent",
)

if result.is_allowed:
    # Autonomous execution allowed
    execute_tool()

elif result.is_review_required:
    # Escalated to security queue for human review
    review = guardian.wait_for_review(result.review_id)
    if review.is_approved:
        execute_tool()
    else:
        abort_tool("Rejected by security lead")

else:
    # Hard policy block
    abort_tool("Action blocked by policy")
```
