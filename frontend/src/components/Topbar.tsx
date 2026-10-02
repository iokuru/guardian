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
  analyze: { section: "Workspace", title: "Analyze", sectionRoute: "analyze" },
  reviews: { section: "Workspace", title: "Reviews", sectionRoute: "reviews" },
  audit: { section: "Workspace", title: "Audit", sectionRoute: "audit" },
  decisions: { section: "Workspace", title: "Reviews", sectionRoute: "reviews" },
  policies: { section: "Configuration", title: "Policies", sectionRoute: "policies" },
  risks: { section: "Configuration", title: "Risk categories", sectionRoute: "risks" },
  integrations: { section: "Configuration", title: "Integrations", sectionRoute: "integrations" },
  api: { section: "Configuration", title: "Integrations", sectionRoute: "integrations" },
  users: { section: "Administration", title: "Users", sectionRoute: "users" },
  access: { section: "Administration", title: "Access", sectionRoute: "access" },
  status: { section: "Administration", title: "Status", sectionRoute: "status" },
  engine: { section: "Administration", title: "Status", sectionRoute: "status" },
  models: { section: "Administration", title: "Status", sectionRoute: "status" },
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

        <button
          type="button"
          className="topbar-crumb-btn"
          onClick={() => onNavigate(meta.sectionRoute)}
          title={`Go to ${meta.section}`}
        >
          {meta.section}
        </button>

        <span className="crumb-sep">/</span>

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
