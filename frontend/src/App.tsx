import { useEffect, useMemo, useState, type ReactNode } from "react";
import Login from "./pages/Login";
import "./index.css";

type Page = "overview" | "analyze" | "decisions" | "audit" | "policies" | "risk" | "system";

type User = { username: string; role: string };

type NavItem = { id: Page; label: string; group: string; key: string };

const nav: NavItem[] = [
  { id: "overview", label: "Overview", group: "WORKSPACE", key: "1" },
  { id: "analyze", label: "Analyze", group: "WORKSPACE", key: "2" },
  { id: "decisions", label: "Decisions", group: "WORKSPACE", key: "3" },
  { id: "audit", label: "Audit logs", group: "WORKSPACE", key: "4" },
  { id: "policies", label: "Policies", group: "GOVERNANCE", key: "5" },
  { id: "risk", label: "Risk categories", group: "GOVERNANCE", key: "6" },
  { id: "system", label: "System", group: "SYSTEM", key: "7" },
];

const pageTitles: Record<Page, string> = {
  overview: "Overview",
  analyze: "Analyze",
  decisions: "Decisions",
  audit: "Audit logs",
  policies: "Policies",
  risk: "Risk categories",
  system: "System",
};

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("guardian_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [page, setPage] = useState<Page>("overview");
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("guardian_sidebar") === "collapsed");
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groups = useMemo(() => [...new Set(nav.map((item) => item.group))], []);

  if (!localStorage.getItem("guardian_token") || !user) {
    return (
      <Login
        onLogin={(nextUser) => {
          setUser(nextUser);
          localStorage.setItem("guardian_user", JSON.stringify(nextUser));
        }}
      />
    );
  }

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("guardian_sidebar", next ? "collapsed" : "expanded");
  }

  function logout() {
    localStorage.removeItem("guardian_token");
    localStorage.removeItem("guardian_user");
    setUser(null);
  }

  function navigate(next: Page) {
    setPage(next);
    setPaletteOpen(false);
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand-row">
          <button className="brand-mark" onClick={() => navigate("overview")} aria-label="GUARDIAN overview">G</button>
          {!collapsed && <div><div className="brand-name">GUARDIAN</div><div className="brand-subtitle">Security Control</div></div>}
        </div>

        <nav className="sidebar-nav">
          {groups.map((group) => (
            <div className="nav-group" key={group}>
              {!collapsed && <div className="nav-label">{group}</div>}
              {nav.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id)}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="nav-icon">{item.key}</span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {!collapsed && <div className="system-state"><span className="status-dot" /> System operational</div>}
          <button className="user-chip" onClick={logout} title="Sign out">
            <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
            {!collapsed && <span><strong>{user.username}</strong><small>{user.role}</small></span>}
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>GUARDIAN</span><span className="slash">/</span><strong>{pageTitles[page]}</strong></div>
          <div className="topbar-actions">
            <button className="search-trigger" onClick={() => setPaletteOpen(true)}><span>Search anything...</span><kbd>⌘ K</kbd></button>
            <button className="icon-button" onClick={toggleSidebar} title="Toggle sidebar">{collapsed ? "→" : "←"}</button>
            <button className="env-button"><span className="status-dot" /> Production <span className="chevron">⌄</span></button>
          </div>
        </header>

        <section className="page-content">
          <PageView page={page} username={user.username} onNavigate={navigate} />
        </section>
      </main>

      {paletteOpen && <CommandPalette nav={nav} onNavigate={navigate} onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

function PageView({ page, username, onNavigate }: { page: Page; username: string; onNavigate: (page: Page) => void }) {
  if (page === "overview") return <Overview username={username} onNavigate={onNavigate} />;
  if (page === "analyze") return <Analyze />;
  if (page === "audit") return <Audit />;
  return <Placeholder page={page} />;
}

function Overview({ username, onNavigate }: { username: string; onNavigate: (page: Page) => void }) {
  const [stats, setStats] = useState<{ total: number; allow: number; review: number; block: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/analyses/stats", { headers: authHeaders() })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="view-stack page-enter">
      <div className="page-heading">
        <div><div className="eyebrow">SECURITY OVERVIEW</div><h1>Control surface</h1><p>Monitor decisions, risk activity, and engine state from one place.</p></div>
        <div className="heading-meta">SIGNED IN AS <strong>{username}</strong></div>
      </div>

      {error ? <ErrorState /> : (
        <div className="metric-strip">
          <Metric label="Total analyses" value={stats ? String(stats.total) : "--"} detail="All decisions" />
          <Metric label="Allowed" value={stats ? String(stats.allow) : "--"} detail="Low-risk actions" />
          <Metric label="Review" value={stats ? String(stats.review) : "--"} detail="Human attention" />
          <Metric label="Blocked" value={stats ? String(stats.block) : "--"} detail="Policy prevented" />
        </div>
      )}

      <div className="grid-2-1">
        <Panel title="Risk activity" meta="DECISIONS">
          <div className="empty-activity"><div className="activity-line"><span /><span /><span /><span /><span /><span /><span /><span /></div><strong>No activity yet</strong><p>Run an analysis to populate the security activity stream.</p><button className="primary-button" onClick={() => onNavigate("analyze")}>Run analysis</button></div>
        </Panel>
        <Panel title="Engine status" meta="LIVE">
          <StatusRow name="Risk Engine" status="Operational" />
          <StatusRow name="Policy Engine" status="Operational" />
          <StatusRow name="Semantic Detector" status="Loaded" />
          <StatusRow name="PostgreSQL" status="Connected" />
        </Panel>
      </div>

      <div className="grid-1-1">
        <Panel title="Top risk categories" meta="CURRENT">
          <div className="bars"><Bar label="DESTRUCTIVE" value={72} /><Bar label="PRODUCTION" value={41} /><Bar label="CUSTOMER_DATA" value={29} /><Bar label="CREDENTIAL_ACCESS" value={18} /></div>
        </Panel>
        <Panel title="Active policies" meta="VERSION 1.0">
          <PolicyRow name="Production destructive actions" state="ENFORCED" />
          <PolicyRow name="Production credential access" state="ENFORCED" />
          <PolicyRow name="Risk score thresholds" state="ENFORCED" />
        </Panel>
      </div>
    </div>
  );
}

function Analyze() {
  const [action, setAction] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAnalysis(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("http://localhost:8000/analyze", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ action, context }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Analysis failed");
      setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="view-stack page-enter">
      <div className="page-heading"><div><div className="eyebrow">RISK EVALUATION</div><h1>Analyze an action</h1><p>Evaluate an agent action against GUARDIAN's detection and policy pipeline.</p></div></div>
      <div className="analyze-layout">
        <form className="panel input-panel" onSubmit={runAnalysis}>
          <div className="panel-header"><div><h2>Action request</h2><span>INPUT</span></div></div>
          <label>Action<textarea value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. Delete all customer records" required /></label>
          <label>Context<textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="e.g. Production database" required /></label>
          {error && <div className="inline-error">{error}</div>}
          <button className="primary-button full" disabled={loading}>{loading ? "Evaluating..." : "Evaluate action"}<span>↗</span></button>
          <div className="pipeline-hint">ACTION → POLICY → DETECTION → SCOPE → DECISION</div>
        </form>

        <div className="panel result-panel">
          {!result && !loading && <EmptyResult />}
          {loading && <EvaluationState />}
          {result && <ResultView result={result} />}
        </div>
      </div>
    </div>
  );
}

function ResultView({ result }: { result: any }) {
  const decision = String(result.decision || "").toLowerCase();
  return <div className={`result-content result-${decision}`}>
    <div className="verdict-row"><div><span className="eyebrow">ENGINE DECISION</span><div className="verdict">{result.decision}</div></div><div className="score"><small>RISK SCORE</small><strong>{Number(result.risk_score).toFixed(2)}</strong></div></div>
    <div className="reason-box"><span>DECISION REASON</span><p>{result.decision_reason}</p></div>
    <div className="findings-title"><span>FINDINGS</span><span>{result.findings?.length || 0}</span></div>
    <div className="finding-list">{(result.findings || []).map((finding: any, index: number) => <div className="finding" key={`${finding.category}-${index}`}><div><strong>{finding.category}</strong><span>{finding.reason}</span></div><div className="finding-score">{Number(finding.score).toFixed(2)}<small>{finding.source}</small></div></div>)}</div>
    <div className="metadata"><span>POLICY {result.policy_version}</span><span>DETECTOR {result.detector_version}</span><span>{result.semantic_model}</span></div>
  </div>;
}

function Audit() {
  const [logs, setLogs] = useState<any[]>([]); const [error, setError] = useState(false); const [selected, setSelected] = useState<any>(null);
  useEffect(() => { fetch("http://localhost:8000/audit-logs?limit=50", { headers: authHeaders() }).then(async r => { if (!r.ok) throw new Error(); return r.json(); }).then(setLogs).catch(() => setError(true)); }, []);
  return <div className="view-stack page-enter"><div className="page-heading"><div><div className="eyebrow">SECURITY HISTORY</div><h1>Audit logs</h1><p>Every evaluated action, decision, and engine version in one traceable record.</p></div></div><div className="panel table-panel"><div className="table-toolbar"><div className="table-search">⌕ <span>Search actions</span></div><button className="filter-button">Decision ▾</button><button className="filter-button">Risk ▾</button></div>{error ? <ErrorState /> : logs.length === 0 ? <div className="table-empty"><strong>No audit events yet</strong><p>Run an analysis to create the first traceable decision.</p></div> : <div className="table-wrap"><table><thead><tr><th>Decision</th><th>Action</th><th>Risk</th><th>Version</th><th>Time</th></tr></thead><tbody>{logs.map(log => <tr key={log.id} onClick={() => setSelected(log)}><td><DecisionBadge value={log.decision} /></td><td className="action-cell">{log.action}</td><td className="mono">{Number(log.risk_score).toFixed(2)} · {log.risk_level}</td><td className="mono">{log.policy_version}</td><td className="mono">{new Date(log.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>}</div>{selected && <Drawer log={selected} onClose={() => setSelected(null)} />}</div>;
}

function Placeholder({ page }: { page: Page }) { return <div className="view-stack page-enter"><div className="page-heading"><div><div className="eyebrow">GUARDIAN</div><h1>{pageTitles[page]}</h1><p>This surface is reserved for the next layer of the control plane.</p></div></div><Panel title="Under construction" meta="FOUNDATION READY"><div className="placeholder-copy">The application shell and API-connected foundation are in place. This screen will be built as a real GUARDIAN workflow, not a placeholder dashboard.</div></Panel></div>; }

function CommandPalette({ nav, onNavigate, onClose }: { nav: NavItem[]; onNavigate: (p: Page) => void; onClose: () => void }) { const [query, setQuery] = useState(""); const filtered = nav.filter(n => n.label.toLowerCase().includes(query.toLowerCase())); return <div className="overlay" onMouseDown={onClose}><div className="command-palette" onMouseDown={e => e.stopPropagation()}><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search GUARDIAN..." /><div className="command-section">NAVIGATION</div>{filtered.map(item => <button key={item.id} onClick={() => onNavigate(item.id)}><span>{item.label}</span><kbd>⌘ {item.key}</kbd></button>)}{filtered.length === 0 && <div className="command-empty">No matching commands</div>}</div></div>; }

function Drawer({ log, onClose }: { log: any; onClose: () => void }) { return <div className="overlay drawer-overlay" onMouseDown={onClose}><aside className="drawer" onMouseDown={e => e.stopPropagation()}><div className="drawer-header"><div><span className="eyebrow">AUDIT EVENT #{log.id}</span><h2>Decision trace</h2></div><button className="icon-button" onClick={onClose}>×</button></div><DecisionBadge value={log.decision} /><div className="trace"><Trace label="Action received" value={log.action} /><Trace label="Decision" value={`${log.decision} · ${log.risk_level} · ${Number(log.risk_score).toFixed(2)}`} /><Trace label="Policy" value={log.policy_version} /><Trace label="Detector" value={log.detector_version} /><Trace label="Semantic model" value={log.semantic_model} /></div><div className="drawer-section"><span>ENGINE RECORD</span><pre>{JSON.stringify(log, null, 2)}</pre></div></aside></div>; }

function Trace({ label, value }: { label: string; value: string }) { return <div className="trace-row"><span>{label}</span><strong>{value}</strong></div>; }
function EmptyResult() { return <div className="empty-result"><div className="empty-icon">+</div><span>READY TO EVALUATE</span><strong>Your decision will appear here</strong><p>GUARDIAN will evaluate the action through policy, risk, scope, and decision stages.</p></div>; }
function EvaluationState() { return <div className="evaluation"><div className="eyebrow">EVALUATING REQUEST</div>{["Action received", "Policy evaluation", "Risk detection", "Scope analysis", "Decision"].map((s, i) => <div className={`eval-step ${i === 4 ? "pending" : "done"}`} key={s}><span>{i < 4 ? "✓" : ""}</span>{s}</div>)}</div>; }
function ErrorState() { return <div className="error-state"><span>ENGINE UNAVAILABLE</span><strong>GUARDIAN could not reach the risk engine.</strong><p>Check that the FastAPI backend is running on localhost:8000.</p><button className="secondary-button" onClick={() => location.reload()}>Retry</button></div>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
function Panel({ title, meta, children }: { title: string; meta: string; children: ReactNode }) { return <section className="panel"><div className="panel-header"><div><h2>{title}</h2><span>{meta}</span></div></div>{children}</section>; }
function StatusRow({ name, status }: { name: string; status: string }) { return <div className="status-row"><span>{name}</span><strong><i className="status-dot" />{status}</strong></div>; }
function PolicyRow({ name, state }: { name: string; state: string }) { return <div className="policy-row"><span>{name}</span><strong>{state}</strong></div>; }
function Bar({ label, value }: { label: string; value: number }) { return <div className="bar-row"><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><strong>{value}%</strong></div>; }
function DecisionBadge({ value }: { value: string }) { return <span className={`decision-badge decision-${value.toLowerCase()}`}>{value}</span>; }

function authHeaders() { const token = localStorage.getItem("guardian_token"); return token ? { Authorization: `Bearer ${token}` } : {}; }

export default App;
