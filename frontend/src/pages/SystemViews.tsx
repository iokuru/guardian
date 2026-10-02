import { useState, useEffect } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { getHealth } from "../api/client";
import { CodeBlock } from "../components/CodeBlock";

interface SystemViewsProps {
  view: "engine" | "models" | "api" | "status" | "users" | "access" | "integrations";
}

export function SystemViews({ view }: SystemViewsProps) {
  const [healthStatus, setHealthStatus] = useState<string>("checking");
  const [latency, setLatency] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<string>("");

  async function checkBackend() {
    setHealthStatus("checking");
    const start = performance.now();
    try {
      const data = await getHealth();
      const end = performance.now();
      setLatency(Math.round(end - start));
      setHealthStatus(data.status === "ok" ? "healthy" : "degraded");
      setLastCheck(new Date().toLocaleTimeString());
    } catch {
      setHealthStatus("offline");
      setLatency(null);
      setLastCheck(new Date().toLocaleTimeString());
    }
  }

  useEffect(() => {
    if (view !== "engine" && view !== "status") return;
    let active = true;

    async function probe() {
      const start = performance.now();
      try {
        const data = await getHealth();
        if (!active) return;
        const end = performance.now();
        setLatency(Math.round(end - start));
        setHealthStatus(data.status === "ok" ? "healthy" : "degraded");
        setLastCheck(new Date().toLocaleTimeString());
      } catch {
        if (!active) return;
        setHealthStatus("offline");
        setLatency(null);
        setLastCheck(new Date().toLocaleTimeString());
      }
    }

    probe();
    return () => {
      active = false;
    };
  }, [view]);

  if (view === "engine" || view === "status") {
    return (
      <div className="overview-editorial-wrap">
        <div className="page-header-block flex items-start justify-between">
          <div>
            <h1 className="page-main-heading">{view === "status" ? "System status" : "Runtime engine"}</h1>
            <p className="page-sub-heading">
              Operational diagnostics and live technical configuration of the active Guardian instance.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={checkBackend}
            title="Query /health endpoint"
          >
            <RefreshCw size={13} className={healthStatus === "checking" ? "is-spinning" : ""} />
            <span>Probe engine</span>
          </button>
        </div>

        {/* Live Status Metric Bar */}
        <div className="engine-status-banner">
          <div className="status-banner-col">
            <span className="banner-label">Control plane health</span>
            <div className="banner-val-cluster">
              <span className={`status-pill ${healthStatus}`}>
                {healthStatus === "healthy" ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <AlertCircle size={13} />
                )}
                <span>{healthStatus === "healthy" ? "operational" : healthStatus.toLowerCase()}</span>
              </span>
            </div>
          </div>

          <div className="status-banner-col">
            <span className="banner-label">Probe latency</span>
            <div className="banner-val-cluster">
              <Clock size={13} className="text-[#9aa39c]" />
              <code className="mono-text font-medium text-[15px]">
                {latency !== null ? `${latency} ms` : "—"}
              </code>
            </div>
          </div>

          <div className="status-banner-col">
            <span className="banner-label">Last probe timestamp</span>
            <code className="mono-text text-[#6b756d]">
              {lastCheck || "Initial boot"}
            </code>
          </div>

          <div className="status-banner-col">
            <span className="banner-label">Backend URL</span>
            <code className="mono-text text-[#6b756d]">
              http://127.0.0.1:8000
            </code>
          </div>
        </div>

        
        <div className="subsystem-catalog">
          <h2 className="section-title">Runtime configuration</h2>

          <div className="dev-table-container">
            <table className="dev-table">
              <thead>
                <tr>
                  <th style={{ width: "200px" }}>Parameter</th>
                  <th style={{ width: "220px" }}>Value</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="dev-table-row">
                  <td>
                    <span className="font-medium text-[#111813]">API Framework</span>
                  </td>
                  <td>
                    <code className="mono-text text-[#09090b] font-medium">FastAPI</code>
                  </td>
                  <td>
                    <span className="text-[#374139]">
                      Asynchronous ASGI gateway with Pydantic validation and JWT bearer authentication.
                    </span>
                  </td>
                </tr>

                <tr className="dev-table-row">
                  <td>
                    <span className="font-medium text-[#111813]">Embedding Model</span>
                  </td>
                  <td>
                    <code className="mono-text font-medium text-[#111813]">all-MiniLM-L6-v2</code>
                  </td>
                  <td>
                    <span className="text-[#374139]">
                      Sentence-transformers model encoding action and execution context strings.
                    </span>
                  </td>
                </tr>

                <tr className="dev-table-row">
                  <td>
                    <span className="font-medium text-[#111813]">Embedding Dimension</span>
                  </td>
                  <td>
                    <code className="mono-text">384 floats</code>
                  </td>
                  <td>
                    <span className="text-[#374139]">
                      Dense vector representation used for cosine similarity scoring against threat categories.
                    </span>
                  </td>
                </tr>

                <tr className="dev-table-row">
                  <td>
                    <span className="font-medium text-[#111813]">Policy Version</span>
                  </td>
                  <td>
                    <code className="mono-text font-medium">1.0 (Fail-closed)</code>
                  </td>
                  <td>
                    <span className="text-[#374139]">
                      Compiled deterministic ruleset enforcing strict interception on critical threats.
                    </span>
                  </td>
                </tr>

                <tr className="dev-table-row">
                  <td>
                    <span className="font-medium text-[#111813]">Detector Version</span>
                  </td>
                  <td>
                    <code className="mono-text">1.0</code>
                  </td>
                  <td>
                    <span className="text-[#374139]">
                      6-step pipeline combining heuristic keyword matches with semantic classification.
                    </span>
                  </td>
                </tr>

                <tr className="dev-table-row">
                  <td>
                    <span className="font-medium text-[#111813]">Semantic Threshold</span>
                  </td>
                  <td>
                    <code className="mono-text font-medium text-[#09090b]">0.75</code>
                  </td>
                  <td>
                    <span className="text-[#374139]">
                      Critical boundary cutoff. Similarity scores ≥ 0.75 trigger an immediate policy block.
                    </span>
                  </td>
                </tr>

                <tr className="dev-table-row">
                  <td>
                    <span className="font-medium text-[#111813]">Review Threshold</span>
                  </td>
                  <td>
                    <code className="mono-text font-medium text-[#8c4a06]">0.50</code>
                  </td>
                  <td>
                    <span className="text-[#374139]">
                      Escalation cutoff. Similarity scores between 0.50 and 0.74 require human analyst review.
                    </span>
                  </td>
                </tr>

                <tr className="dev-table-row">
                  <td>
                    <span className="font-medium text-[#111813]">Audit Persistence</span>
                  </td>
                  <td>
                    <span className="font-medium text-[#111813]">PostgreSQL</span>
                  </td>
                  <td>
                    <span className="text-[#374139]">
                      Append-only compliance log recording actions, evaluated risk scores, and decisions.
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "models") {
    return (
      <div className="overview-editorial-wrap">
        <div className="page-header-block">
          <h1 className="page-main-heading">Embedding model</h1>
          <p className="page-sub-heading">
            Technical configuration and threshold calibrations powering threat detection.
          </p>
        </div>

        {/* Model Spec Card */}
        <div className="model-spec-card">
          <div className="model-spec-header-row">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="model-title-text">all-MiniLM-L6-v2</h2>
                <span className="model-active-tag">Active Model</span>
              </div>
              <p className="model-desc-text">
                Sentence-transformers embedding model mapping natural language actions and context strings into a
                384-dimensional dense semantic vector space to detect destructive patterns and intent deviation.
              </p>
            </div>
          </div>

          <div className="model-meta-grid">
            <div className="meta-box">
              <span className="meta-box-label">Embedding dimension</span>
              <code className="meta-box-val">384 floats</code>
            </div>
            <div className="meta-box">
              <span className="meta-box-label">Distance metric</span>
              <code className="meta-box-val">Cosine Similarity</code>
            </div>
            <div className="meta-box">
              <span className="meta-box-label">Critical threshold</span>
              <code className="meta-box-val text-[#09090b]">≥ 0.75</code>
            </div>
            <div className="meta-box">
              <span className="meta-box-label">Review threshold</span>
              <code className="meta-box-val text-[#09090b]">≥ 0.50</code>
            </div>
          </div>
        </div>

        {/* Calibration Boundaries */}
        <div className="subsystem-catalog">
          <h2 className="section-title">Calibration thresholds</h2>

          <div className="dev-table-container">
            <table className="dev-table">
              <thead>
                <tr>
                  <th style={{ width: "220px" }}>Boundary tier</th>
                  <th style={{ width: "100px" }}>Threshold</th>
                  <th style={{ width: "110px" }}>Verdict</th>
                  <th>Operational enforcement policy</th>
                </tr>
              </thead>
              <tbody>
                <tr className="dev-table-row">
                  <td>
                    <strong className="text-[#111813]">Critical Threat Boundary</strong>
                  </td>
                  <td>
                    <code className="mono-text font-medium text-[#09090b]">≥ 0.75</code>
                  </td>
                  <td>
                    <span className="decision-col-token block">
                      block
                    </span>
                  </td>
                  <td>
                    <span className="text-[#27272a]">
                      Immediate hard interception. Downstream execution denied without exception.
                    </span>
                  </td>
                </tr>

                <tr className="dev-table-row">
                  <td>
                    <strong className="text-[#09090b]">Review Escalation Boundary</strong>
                  </td>
                  <td>
                    <code className="mono-text font-medium text-[#09090b]">0.50 – 0.74</code>
                  </td>
                  <td>
                    <span className="decision-col-token review">
                      review
                    </span>
                  </td>
                  <td>
                    <span className="text-[#27272a]">
                      Escalated to security queue. Requires explicit human analyst sign-off before proceeding.
                    </span>
                  </td>
                </tr>

                <tr className="dev-table-row">
                  <td>
                    <strong className="text-[#09090b]">Authorized Baseline Boundary</strong>
                  </td>
                  <td>
                    <code className="mono-text font-medium text-[#09090b]">&lt; 0.50</code>
                  </td>
                  <td>
                    <span className="decision-col-token allow">
                      allow
                    </span>
                  </td>
                  <td>
                    <span className="text-[#27272a]">
                      Standard operational envelope. Autonomous authorization granted; recorded to audit trail.
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === "users" || view === "access") {
    return (
      <div className="overview-editorial-wrap">
        <div className="page-header-block">
          <h1 className="page-main-heading">{view === "users" ? "Users & Teams" : "Access control"}</h1>
          <p className="page-sub-heading">
            Team members, role privileges, and automated service identities.
          </p>
        </div>

        <div className="subsystem-catalog">
          <h2 className="section-title">Active members & accounts</h2>
          <div className="dev-table-container">
            <table className="dev-table">
              <thead>
                <tr>
                  <th style={{ width: "200px" }}>Identity</th>
                  <th style={{ width: "120px" }}>Type</th>
                  <th style={{ width: "120px" }}>Role</th>
                  <th>Privilege scope</th>
                </tr>
              </thead>
              <tbody>
                <tr className="dev-table-row">
                  <td>
                    <strong className="text-[#111813]">krishna</strong>
                    <div className="text-xs text-[#71717a]">krishna@guardian.local</div>
                  </td>
                  <td>
                    <span className="mono-text text-xs text-[#374139]">user</span>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      admin
                    </span>
                  </td>
                  <td>
                    <span className="text-[#27272a] text-xs">
                      Full workspace authority: review resolution, policy authoring, key management.
                    </span>
                  </td>
                </tr>
                <tr className="dev-table-row">
                  <td>
                    <strong className="text-[#111813]">agent_deploy_prod</strong>
                    <div className="text-xs text-[#71717a]">Deploy Pipeline Agent</div>
                  </td>
                  <td>
                    <span className="mono-text text-xs text-[#374139]">service</span>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      agent
                    </span>
                  </td>
                  <td>
                    <span className="text-[#27272a] text-xs">
                      Submit action analysis requests; receive policy evaluation verdicts.
                    </span>
                  </td>
                </tr>
                <tr className="dev-table-row">
                  <td>
                    <strong className="text-[#111813]">agent_db_worker</strong>
                    <div className="text-xs text-[#71717a]">Database Migration Worker</div>
                  </td>
                  <td>
                    <span className="mono-text text-xs text-[#374139]">service</span>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      agent
                    </span>
                  </td>
                  <td>
                    <span className="text-[#27272a] text-xs">
                      Submit DDL and database operations for pre-flight safety screening.
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // API Reference / Integrations View
  const analyzeCurl = `curl -X POST http://127.0.0.1:8000/analyze \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "drop table users cascade",
    "context": "Production database"
  }'`;

  const analysesListCurl = `curl -X GET "http://127.0.0.1:8000/analyses?limit=20&offset=0" \\
  -H "Authorization: Bearer YOUR_TOKEN"`;

  const auditCurl = `curl -X GET "http://127.0.0.1:8000/audit-logs?decision=block&limit=50" \\
  -H "Authorization: Bearer YOUR_TOKEN"`;

  return (
    <div className="overview-editorial-wrap">
      <div className="page-header-block">
        <h1 className="page-main-heading">{view === "integrations" ? "Integrations & API" : "API reference"}</h1>
        <p className="page-sub-heading">
          Integrate Guardian policy guardrails into your agent loops, tool-call middleware, and CI pipelines.
        </p>
      </div>

      <div className="api-endpoints-stack">
        <div className="api-endpoint-item">
          <div className="endpoint-header-row">
            <div className="flex items-center gap-2.5">
              <span className="http-badge post">POST</span>
              <code className="endpoint-route-text">/analyze</code>
            </div>
            <span className="endpoint-summary-text">Evaluate action through 6-step detection & policy pipeline</span>
          </div>
          <p className="endpoint-doc-paragraph">
            Accepts an action command string and optional execution context. Returns full evaluation
            verdict (<code className="inline-code">allow</code>, <code className="inline-code">review</code>, <code className="inline-code">block</code>),
            calibrated risk score, detected categories, and itemized findings.
          </p>
          <CodeBlock code={analyzeCurl} language="bash" label="curl example" />
        </div>

        <div className="api-endpoint-item">
          <div className="endpoint-header-row">
            <div className="flex items-center gap-2.5">
              <span className="http-badge get">GET</span>
              <code className="endpoint-route-text">/analyses</code>
            </div>
            <span className="endpoint-summary-text">Paginated list of historical action evaluations</span>
          </div>
          <p className="endpoint-doc-paragraph">
            Query historical evaluations by limit and offset. Returns comprehensive records including detected categories and granular findings.
          </p>
          <CodeBlock code={analysesListCurl} language="bash" label="curl example" />
        </div>

        <div className="api-endpoint-item">
          <div className="endpoint-header-row">
            <div className="flex items-center gap-2.5">
              <span className="http-badge get">GET</span>
              <code className="endpoint-route-text">/audit-logs</code>
            </div>
            <span className="endpoint-summary-text">Query sequential compliance audit trail</span>
          </div>
          <p className="endpoint-doc-paragraph">
            Filter immutable audit log events by <code className="inline-code">decision</code> (<code className="inline-code">allow</code> | <code className="inline-code">review</code> | <code className="inline-code">block</code>)
            and <code className="inline-code">risk_level</code> (<code className="inline-code">critical</code> | <code className="inline-code">high</code> | <code className="inline-code">medium</code> | <code className="inline-code">low</code>).
          </p>
          <CodeBlock code={auditCurl} language="bash" label="curl example" />
        </div>
      </div>
    </div>
  );
}
