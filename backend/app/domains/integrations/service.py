from app.domains.integrations.schemas import IntegrationSnippet, IntegrationSnippetResponse


def get_integration_snippets(base_url: str = "http://localhost:8000") -> IntegrationSnippetResponse:
    python_code = f'''import httpx

GUARDIAN_API_URL = "{base_url}/api/v1/analysis"
GUARDIAN_API_KEY = "gdn_live_YOUR_API_KEY"

def evaluate_agent_action(action: str, context: str) -> dict:
    headers = {{
        "Authorization": f"Bearer {{GUARDIAN_API_KEY}}",
        "Content-Type": "application/json",
    }}
    payload = {{
        "action": action,
        "context": context,
        "agent_id": "agent_auto_remediate_01"
    }}
    response = httpx.post(GUARDIAN_API_URL, json=payload, headers=headers)
    result = response.json()

    # Decision is ALLOW, REVIEW, or BLOCK
    decision = result["decision"]
    if decision == "BLOCK":
        raise PermissionError(f"Action blocked by Guardian policy: {{result['decision_reason']}}")
    elif decision == "REVIEW":
        print(f"Action placed in Guardian review queue (ID: {{result['review_id']}})")
        return result
    
    return result
'''

    ts_code = f'''import axios from "axios";

const GUARDIAN_API_URL = "{base_url}/api/v1/analysis";
const GUARDIAN_API_KEY = "gdn_live_YOUR_API_KEY";

export async function evaluateAgentAction(action: string, context: string) {{
  const response = await axios.post(
    GUARDIAN_API_URL,
    {{
      action,
      context,
      agent_id: "agent_auto_remediate_01"
    }},
    {{
      headers: {{
        Authorization: `Bearer ${{GUARDIAN_API_KEY}}`,
        "Content-Type": "application/json"
      }}
    }}
  );

  const {{ decision, decision_reason, review_id }} = response.data;
  if (decision === "BLOCK") {{
    throw new Error(`Action blocked by Guardian: ${{decision_reason}}`);
  }}
  return response.data;
}}
'''

    curl_code = f'''curl -X POST "{base_url}/api/v1/analysis" \\
  -H "Authorization: Bearer gdn_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{{
    "action": "GRANT admin TO krishna",
    "context": "Production database cluster eu-west-1",
    "agent_id": "agent_auto_remediate_01"
  }}'
'''

    return IntegrationSnippetResponse(
        api_endpoint=f"{base_url}/api/v1/analysis",
        api_key_sample="gdn_live_d84f93b16e45...",
        snippets=[
            IntegrationSnippet(language="python", filename="guardian_client.py", code=python_code),
            IntegrationSnippet(language="typescript", filename="guardianClient.ts", code=ts_code),
            IntegrationSnippet(language="bash", filename="evaluate.sh", code=curl_code),
        ],
    )
