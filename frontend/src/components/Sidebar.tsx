import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Play,
  ShieldCheck,
  ListFilter,
  Shield,
  Cpu,
  Layers,
  Search,
  Plus,
  MoreHorizontal,
  LogOut,
  ExternalLink,
  Check,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { GuardianLogo } from "./GuardianLogo";
import type { RouteId } from "../types/guardian";

interface SidebarProps {
  currentRoute: RouteId;
  onNavigate: (route: RouteId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  username: string;
  onLogout: () => void;
  onOpenCommand?: () => void;
  activeWorkspace?: string;
  onSelectWorkspace?: (ws: string) => void;
}

const WORKSPACES = [
  { id: "Production", label: "Production" },
  { id: "Development", label: "Development" },
  { id: "Staging", label: "Staging" },
];

export function Sidebar({
  currentRoute,
  onNavigate,
  collapsed,
  onToggleCollapse,
  username,
  onLogout,
  onOpenCommand,
  activeWorkspace = "Production",
  onSelectWorkspace,
}: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const ignoreHoverRef = useRef(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  function handleToggle() {
    setIsHovered(false);
    ignoreHoverRef.current = true;
    onToggleCollapse();
  }

  function handleMouseEnter() {
    if (collapsed && !ignoreHoverRef.current) {
      setIsHovered(true);
    }
  }

  function handleMouseLeave() {
    ignoreHoverRef.current = false;
    setIsHovered(false);
  }

  const isExpanded = !collapsed || isHovered;
  const initials = (username || "AN").slice(0, 2).toUpperCase();

  return (
    <aside
      className={`n8n-sidebar ${collapsed ? "is-collapsed" : ""} ${
        collapsed && isHovered ? "is-hover-expanded" : ""
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Sidebar Navigation"
    >
      <div className="n8n-sidebar-header">
        <button
          type="button"
          className="n8n-sidebar-brand"
          onClick={() => {
            if (collapsed && !isHovered) {
              handleToggle();
            } else {
              onNavigate("overview");
            }
          }}
          title="Guardian Security Control Plane"
        >
          <GuardianLogo size={20} color="#ea4b71" />
          {isExpanded && (
            <span className="n8n-sidebar-brand-title">Guardian</span>
          )}
        </button>

        {isExpanded && (
          <button
            type="button"
            className="n8n-sidebar-add-btn"
            onClick={() => onNavigate("analyze")}
            title="Evaluate new action (Analyze)"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      <div className="n8n-sidebar-search-container">
        {isExpanded ? (
          <button
            type="button"
            className="sidebar-search-trigger"
            onClick={onOpenCommand}
            title="Open command palette (Ctrl+K)"
          >
            <Search size={13} className="sidebar-search-icon" />
            <span className="sidebar-search-placeholder">Search...</span>
            <kbd className="sidebar-kbd">Ctrl K</kbd>
          </button>
        ) : (
          <button
            type="button"
            className="sidebar-search-icon-btn"
            onClick={onOpenCommand}
            title="Search or command (Ctrl+K)"
          >
            <Search size={15} />
          </button>
        )}
      </div>

      <div className="n8n-sidebar-body">
        <div className="n8n-nav-section">
          {isExpanded && (
            <div className="n8n-section-label">OPERATE</div>
          )}

          <div className="n8n-nav-group">
            <button
              type="button"
              className={`n8n-nav-item ${
                currentRoute === "overview" ? "is-active" : ""
              }`}
              onClick={() => onNavigate("overview")}
              title={!isExpanded ? "Overview" : undefined}
            >
              <LayoutDashboard size={15} className="n8n-nav-icon" />
              {isExpanded && <span className="n8n-nav-label">Overview</span>}
            </button>

            <button
              type="button"
              className={`n8n-nav-item ${
                currentRoute === "analyze" ? "is-active" : ""
              }`}
              onClick={() => onNavigate("analyze")}
              title={!isExpanded ? "Analyze" : undefined}
            >
              <Play size={15} className="n8n-nav-icon" />
              {isExpanded && <span className="n8n-nav-label">Analyze</span>}
            </button>

            <button
              type="button"
              className={`n8n-nav-item ${
                currentRoute === "decisions" ? "is-active" : ""
              }`}
              onClick={() => onNavigate("decisions")}
              title={!isExpanded ? "Decisions" : undefined}
            >
              <ShieldCheck size={15} className="n8n-nav-icon" />
              {isExpanded && <span className="n8n-nav-label">Decisions</span>}
            </button>

            <button
              type="button"
              className={`n8n-nav-item ${
                currentRoute === "audit" ? "is-active" : ""
              }`}
              onClick={() => onNavigate("audit")}
              title={!isExpanded ? "Audit logs" : undefined}
            >
              <ListFilter size={15} className="n8n-nav-icon" />
              {isExpanded && <span className="n8n-nav-label">Audit logs</span>}
            </button>
          </div>
        </div>

        <div className="n8n-nav-section">
          {isExpanded ? (
            <>
              <div className="n8n-section-label">WORKSPACES</div>
              <div className="n8n-workspace-list">
                {WORKSPACES.map((ws) => {
                  const isActive = activeWorkspace === ws.id;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      className={`n8n-workspace-item ${
                        isActive ? "is-active" : ""
                      }`}
                      onClick={() => onSelectWorkspace && onSelectWorkspace(ws.id)}
                      title={`Workspace: ${ws.label}`}
                    >
                      <span className="n8n-ws-label">{ws.label}</span>
                      {isActive && (
                        <Check size={12} className="text-[#09090b] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex justify-center py-2">
              <button
                type="button"
                className="n8n-workspace-collapsed-indicator"
                onClick={handleToggle}
                title={`Workspace: ${activeWorkspace} (click to expand)`}
              >
                <Layers size={14} className="text-[#71717a]" />
              </button>
            </div>
          )}
        </div>

        <div className="n8n-nav-section mt-auto">
          {isExpanded && (
            <div className="n8n-section-label">SYSTEM</div>
          )}

          <div className="n8n-nav-group">
            <button
              type="button"
              className={`n8n-nav-item ${
                currentRoute === "policies" ? "is-active" : ""
              }`}
              onClick={() => onNavigate("policies")}
              title={!isExpanded ? "Policy ruleset" : undefined}
            >
              <Shield size={15} className="n8n-nav-icon" />
              {isExpanded && (
                <span className="n8n-nav-label">Policy ruleset</span>
              )}
            </button>

            <button
              type="button"
              className={`n8n-nav-item ${
                currentRoute === "engine" ? "is-active" : ""
              }`}
              onClick={() => onNavigate("engine")}
              title={!isExpanded ? "Runtime engine" : undefined}
            >
              <Cpu size={15} className="n8n-nav-icon" />
              {isExpanded && (
                <span className="n8n-nav-label">Runtime engine</span>
              )}
            </button>

            <button
              type="button"
              className={`n8n-nav-item ${
                currentRoute === "risks" ? "is-active" : ""
              }`}
              onClick={() => onNavigate("risks")}
              title={!isExpanded ? "Threat taxonomy" : undefined}
            >
              <Layers size={15} className="n8n-nav-icon" />
              {isExpanded && (
                <span className="n8n-nav-label">Threat taxonomy</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="n8n-sidebar-bottom-rail">
        <button
          type="button"
          className="n8n-sidebar-bottom-toggle"
          onClick={handleToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed && !isHovered ? (
            <ChevronsRight size={14} />
          ) : (
            <ChevronsLeft size={14} />
          )}
          {isExpanded && <span className="text-[12px]">Collapse sidebar</span>}
        </button>
      </div>

      <div className="n8n-user-footer" ref={userMenuRef}>
        <div className="n8n-user-footer-content">
          <div
            className="n8n-user-avatar"
            title={username || "analyst"}
            onClick={!isExpanded ? () => setUserMenuOpen((prev) => !prev) : undefined}
            style={{ cursor: !isExpanded ? "pointer" : "default" }}
          >
            {initials}
          </div>
          {isExpanded && (
            <div className="n8n-user-info">
              <span className="n8n-user-name" title={username || "analyst"}>
                {username || "analyst"}
              </span>
              <span className="n8n-user-role">ANALYST</span>
            </div>
          )}
          {isExpanded && (
            <button
              type="button"
              className="n8n-user-more-btn"
              onClick={(e) => {
                e.stopPropagation();
                setUserMenuOpen((prev) => !prev);
              }}
              title="User options"
              aria-label="User options"
              aria-expanded={userMenuOpen}
            >
              <MoreHorizontal size={15} />
            </button>
          )}
        </div>

        {userMenuOpen && (
          <div className="n8n-user-menu-popover">
            <div className="n8n-user-menu-header">
              <div className="text-[12px] text-[#09090b] leading-tight">
                Signed in as <strong className="font-semibold text-[#09090b]">{username || "analyst"}</strong>
              </div>
              <div className="text-[11px] text-[#71717a] mt-0.5">Role: ANALYST</div>
            </div>
            <div className="n8n-user-menu-divider" />
            {onOpenCommand && (
              <button
                type="button"
                className="n8n-user-menu-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  onOpenCommand();
                }}
              >
                <Search size={13} className="text-[#71717a] shrink-0" />
                <span>Command palette</span>
              </button>
            )}
            <button
              type="button"
              className="n8n-user-menu-item"
              onClick={() => {
                setUserMenuOpen(false);
                onNavigate("api");
              }}
            >
              <ExternalLink size={13} className="text-[#71717a] shrink-0" />
              <span>API documentation</span>
            </button>
            <button
              type="button"
              className="n8n-user-menu-item danger"
              onClick={() => {
                setUserMenuOpen(false);
                onLogout();
              }}
            >
              <LogOut size={13} className="shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
