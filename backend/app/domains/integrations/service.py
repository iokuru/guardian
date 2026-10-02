from app.domains.integrations.schemas import IntegrationSnippet, IntegrationSnippetResponse


def get_integration_snippets(base_url: str = "http://127.0.0.1:8000") -> IntegrationSnippetResponse:
    python_code = f'''from guardian import Guardian

guardian = Guardian(
    api_key="gdn_live_YOUR_API_KEY",
    base_url="{base_url}",
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
    else:
        abort("Action rejected by security reviewer")

else:
    abort(f"Action blocked by policy: {{result.decision_reason}}")
'''

    ts_code = f'''const GUARDIAN_API_URL = "{base_url}/analysis";
const GUARDIAN_API_KEY = "gdn_live_YOUR_API_KEY";

export async function evaluateAction(action: string, context: string, agentId = "agent_01") {{
  const response = await fetch(GUARDIAN_API_URL, {{
    method: "POST",
    headers: {{
      "Authorization": `Bearer ${{GUARDIAN_API_KEY}}`,
      "Content-Type": "application/json",
    }},
    body: JSON.stringify({{
      action,
      context,
      agent_id: agentId,
    }}),
  }});

  const result = await response.json();

  if (result.decision === "block") {{
    throw new Error(`Action blocked by Guardian policy: ${{result.decision_reason}}`);
  }}

  if (result.decision === "review") {{
    console.log(`Action queued for review (ID: ${{result.review_id}}, Request: ${{result.request_id}})`);
  }}

  return result;
}}
'''

    curl_code = f'''curl -X POST "{base_url}/analysis" \\
  -H "Authorization: Bearer gdn_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{{
    "action": "Delete all customer records",
    "context": "Production database",
    "agent_id": "customer-support-agent"
  }}'
'''

    return IntegrationSnippetResponse(
        api_endpoint=f"{base_url}/analysis",
        api_key_sample="gdn_live_d84f93b16e45...",
        snippets=[
            IntegrationSnippet(language="python", filename="agent_integration.py", code=python_code),
            IntegrationSnippet(language="typescript", filename="agentIntegration.ts", code=ts_code),
            IntegrationSnippet(language="curl", filename="evaluate.sh", code=curl_code),
        ],
    )
