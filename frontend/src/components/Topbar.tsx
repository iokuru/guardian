import { useState, useRef, useEffect } from "react";
import { Plus, RefreshCw, Check } from "lucide-react";
import type { RouteId } from "../types/guardian";

interface TopbarProps {
  currentRoute: RouteId;
  onNavigate: (route: RouteId) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  activeWorkspace?: string;
  onSelectWorkspace?: (workspace: string) => void;
}

const WORKSPACES = [
  { id: "Production", label: "Production" },
  { id: "Development", label: "Development" },
  { id: "Staging", label: "Staging" },
];

const ROUTE_TITLES: Record<RouteId, { section: string; title: string; sectionRoute: RouteId }> = {
  overview: { section: "Workspace", title: "Overview", sectionRoute: "overview" },
  analyze: { section: "Workbench", title: "Analyze", sectionRoute: "analyze" },
  decisions: { section: "Enforcement", title: "Decisions", sectionRoute: "decisions" },
  audit: { section: "Compliance", title: "Audit logs", sectionRoute: "audit" },
  policies: { section: "Specification", title: "Policy ruleset", sectionRoute: "policies" },
  risks: { section: "Specification", title: "Threat taxonomy", sectionRoute: "risks" },
  engine: { section: "System", title: "Runtime engine", sectionRoute: "engine" },
  models: { section: "System", title: "Embedding model", sectionRoute: "models" },
  api: { section: "System", title: "API reference", sectionRoute: "api" },
};

export function Topbar({
  currentRoute,
  onNavigate,
  onRefresh,
  isRefreshing = false,
  activeWorkspace = "Production",
  onSelectWorkspace,
}: TopbarProps) {
  const [wsOpen, setWsOpen] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsOpen(false);
      }
    }
    if (wsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wsOpen]);

  const meta = ROUTE_TITLES[currentRoute] || {
    section: "Workspace",
    title: "Overview",
    sectionRoute: "overview",
  };

  return (
    <header className="dev-topbar">
      <div className="topbar-breadcrumbs flex items-center gap-1.5 text-[13px]">
        {/* Interactive Workspace Dropdown */}
        <div className="relative" ref={wsRef}>
          <button
            type="button"
            className="topbar-crumb-btn workspace-active"
            onClick={() => setWsOpen((prev) => !prev)}
            title="Switch workspace"
            aria-expanded={wsOpen}
          >
            <span>{activeWorkspace}</span>
          </button>

          {wsOpen && (
            <div className="topbar-ws-dropdown">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-[#a1a1aa] tracking-wider uppercase border-b border-[#e4e4e7]">
                Workspaces
              </div>
              <div className="py-1">
                {WORKSPACES.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    className={`topbar-ws-item ${
                      ws.id === activeWorkspace ? "is-active" : ""
                    }`}
                    onClick={() => {
                      onSelectWorkspace?.(ws.id);
                      setWsOpen(false);
                    }}
                  >
                    <span>{ws.label}</span>
                    {ws.id === activeWorkspace && (
                      <Check size={12} className="text-[#09090b] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <span className="crumb-sep">/</span>

        {/* Section crumb */}
        <button
          type="button"
          className="topbar-crumb-btn"
          onClick={() => onNavigate(meta.sectionRoute)}
          title={`Go to ${meta.section}`}
        >
          {meta.section}
        </button>

        <span className="crumb-sep">/</span>

        {/* Current leaf page */}
        <span className="crumb-leaf">
          {meta.title}
        </span>
      </div>

      <div className="topbar-right-rail">
        {onRefresh && (
          <button
            type="button"
            className="toolbar-icon-btn !w-8 !h-8"
            onClick={onRefresh}
            title="Refresh workspace data"
            disabled={isRefreshing}
          >
            <RefreshCw size={13} className={isRefreshing ? "is-spinning" : ""} />
          </button>
        )}

        {currentRoute !== "analyze" && (
          <button
            type="button"
            className="btn-primary !h-8 !px-3"
            onClick={() => onNavigate("analyze")}
            title="Evaluate new action"
          >
            <Plus size={13} />
            <span>Analyze</span>
          </button>
        )}
      </div>
    </header>
  );
}

