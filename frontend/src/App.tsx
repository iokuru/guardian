import { useEffect, useState, useCallback } from "react";
import type { RouteId, AnalysisRecord, AnalysisStats } from "./types/guardian";
import { getAnalysisStats, getAnalyses } from "./api/client";
import { DEFAULT_MOCK_ANALYSES } from "./api/mockData";
import Login from "./pages/Login";
import { Overview } from "./pages/Overview";
import { Analyze } from "./pages/Analyze";
import { Decisions } from "./pages/Decisions";
import { AuditLogs } from "./pages/AuditLogs";
import { Governance } from "./pages/Governance";
import { SystemViews } from "./pages/SystemViews";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { CommandPalette } from "./components/CommandPalette";
import { InvestigationDrawer } from "./components/InvestigationDrawer";

function App() {
  const [username, setUsername] = useState(
    () => localStorage.getItem("guardian_username") || "analyst"
  );
  const [route, setRoute] = useState<RouteId>("overview");
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && (localStorage.getItem("guardian_sidebar_collapsed") === "true" || window.location.hash.includes("collapsed"))
  );

  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<string>("Production");
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Investigation Drawer state
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [workbenchDraft, setWorkbenchDraft] = useState<{ action: string; context: string } | null>(null);

  // Command Palette state
  const [isCommandOpen, setIsCommandOpen] = useState(
    () => typeof window !== "undefined" && window.location.hash.includes("command")
  );

  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("guardian_token") || "sandbox_analyst_token"
  );

  useEffect(() => {
    localStorage.setItem("guardian_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [statsRes, analysesRes] = await Promise.allSettled([
        getAnalysisStats(),
        getAnalyses(50, 0),
      ]);

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value);
      }
      if (analysesRes.status === "fulfilled" && analysesRes.value.length > 0) {
        setAnalyses(analysesRes.value);
      }

      if (analysesRes.status === "rejected" && statsRes.status === "rejected") {
        setError("Failed to load workspace data from GUARDIAN backend.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error connecting to backend");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let isSubscribed = true;

    async function initialize() {
      try {
        const [statsRes, analysesRes] = await Promise.allSettled([
          getAnalysisStats(),
          getAnalyses(50, 0),
        ]);

        if (!isSubscribed) return;

        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value);
        }
        if (analysesRes.status === "fulfilled" && analysesRes.value.length > 0) {
          setAnalyses(analysesRes.value);
        }
        if (analysesRes.status === "rejected" && statsRes.status === "rejected") {
          setError("Failed to load workspace data from GUARDIAN backend.");
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err instanceof Error ? err.message : "Error connecting to backend");
        }
      }
    }

    initialize();
    return () => {
      isSubscribed = false;
    };
  }, [token]);

  // Global Keyboard shortcuts: Ctrl+K or / to open search and command palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
        return;
      }
      if (
        e.key === "/" &&
        !isCommandOpen &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement)?.isContentEditable
        )
      ) {
        e.preventDefault();
        setIsCommandOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandOpen]);

  function handleLogin(user: string) {
    localStorage.setItem("guardian_username", user);
    setUsername(user);
    setToken(localStorage.getItem("guardian_token"));
    loadData();
  }

  function handleLogout() {
    localStorage.removeItem("guardian_token");
    localStorage.removeItem("guardian_username");
    setToken(null);
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  const effectiveAnalyses = analyses.length > 0 ? analyses : DEFAULT_MOCK_ANALYSES;

  return (
    <div className={`dev-app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentRoute={route}
        onNavigate={setRoute}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        username={username}
        onLogout={handleLogout}
        onOpenCommand={() => setIsCommandOpen(true)}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
      />

      {/* Main Operational Area */}
      <div className="dev-main-wrap">
        <Topbar
          currentRoute={route}
          onNavigate={setRoute}
          onRefresh={loadData}
          isRefreshing={loading}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={setActiveWorkspace}
        />

        <main className="dev-canvas-content" role="main">
          {route === "overview" && (
            <Overview
              stats={stats}
              analyses={effectiveAnalyses}
              loading={loading}
              error={error}
              onRetry={loadData}
              onNavigate={setRoute}
              onSelectAnalysis={(id) => setSelectedAnalysisId(id)}
            />
          )}

          {route === "analyze" && (
            <Analyze
              onEvaluationComplete={loadData}
              initialAction={workbenchDraft?.action}
              initialContext={workbenchDraft?.context}
            />
          )}

          {route === "decisions" && (
            <Decisions
              analyses={effectiveAnalyses}
              loading={loading}
              onRefresh={loadData}
              onSelectAnalysis={(id) => setSelectedAnalysisId(id)}
            />
          )}

          {route === "audit" && (
            <AuditLogs
              onSelectAnalysis={(id) => setSelectedAnalysisId(id)}
            />
          )}

          {(route === "policies" || route === "risks") && (
            <Governance view={route} />
          )}

          {(route === "engine" || route === "models" || route === "api") && (
            <SystemViews view={route} />
          )}
        </main>
      </div>

      {/* Forensic Investigation Drawer */}
      <InvestigationDrawer
        analysisId={selectedAnalysisId}
        fallbackRecord={effectiveAnalyses.find((a) => a.id === selectedAnalysisId)}
        onClose={() => setSelectedAnalysisId(null)}
        onTestInWorkbench={(action, context) => {
          setWorkbenchDraft({ action, context });
          setRoute("analyze");
        }}
      />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onNavigate={setRoute}
        onLogout={handleLogout}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
      />
    </div>
  );
}

export default App;
