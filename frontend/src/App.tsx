import { useEffect, useState, useCallback } from "react";
import type { RouteId, AnalysisRecord, AnalysisStats, ReviewStats } from "./types/guardian";
import { getAnalysisStats, getAnalyses, getReviewStats } from "./api/client";
import { DEFAULT_MOCK_ANALYSES } from "./api/mockData";
import Login from "./pages/Login";
import { Overview } from "./pages/Overview";
import { Analyze } from "./pages/Analyze";
import { Reviews } from "./pages/Reviews";
import { AuditLogs } from "./pages/AuditLogs";
import { Governance } from "./pages/Governance";
import { Integrations } from "./pages/Integrations";
import { SystemViews } from "./pages/SystemViews";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { CommandPalette } from "./components/CommandPalette";
import { InvestigationDrawer } from "./components/InvestigationDrawer";

function App() {
  const [username, setUsername] = useState(
    () => localStorage.getItem("guardian_username") || "krishna"
  );
  const [route, setRoute] = useState<RouteId>("overview");
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && (localStorage.getItem("guardian_sidebar_collapsed") === "true" || window.location.hash.includes("collapsed"))
  );

  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
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
    () => localStorage.getItem("guardian_token")
  );

  useEffect(() => {
    localStorage.setItem("guardian_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [statsRes, analysesRes, revStatsRes] = await Promise.allSettled([
        getAnalysisStats(),
        getAnalyses(50, 0),
        getReviewStats(),
      ]);

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value);
      }
      if (analysesRes.status === "fulfilled") {
        setAnalyses(analysesRes.value);
      }
      if (revStatsRes.status === "fulfilled") {
        setReviewStats(revStatsRes.value);
      }

      if (analysesRes.status === "rejected" && statsRes.status === "rejected") {
        setError("Failed to load workspace data from Guardian backend.");
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
        const [statsRes, analysesRes, revStatsRes] = await Promise.allSettled([
          getAnalysisStats(),
          getAnalyses(50, 0),
          getReviewStats(),
        ]);

        if (!isSubscribed) return;

        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value);
        }
        if (analysesRes.status === "fulfilled" && analysesRes.value.length > 0) {
          setAnalyses(analysesRes.value);
        }
        if (revStatsRes.status === "fulfilled") {
          setReviewStats(revStatsRes.value);
        }
        if (analysesRes.status === "rejected" && statsRes.status === "rejected") {
          setError("Failed to load workspace data from Guardian backend.");
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
  }

  function handleLogout() {
    localStorage.removeItem("guardian_token");
    localStorage.removeItem("guardian_auth_provider");
    setToken(null);
    setAnalyses([]);
    setStats(null);
    setReviewStats(null);
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
        pendingReviewsCount={reviewStats?.pending || 0}
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

          {(route === "reviews" || route === "decisions") && (
            <Reviews
              onInspectRequest={(reqId) => {
                const found = effectiveAnalyses.find((a) => a.request_id === reqId);
                if (found) {
                  setSelectedAnalysisId(found.id);
                } else if (effectiveAnalyses.length > 0) {
                  setSelectedAnalysisId(effectiveAnalyses[0].id);
                }
              }}
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

          {route === "integrations" && <Integrations />}

          {(route === "api" || route === "engine" || route === "models" || route === "users" || route === "access" || route === "status") && (
            <SystemViews view={route === "users" || route === "access" ? "status" : route} />
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
