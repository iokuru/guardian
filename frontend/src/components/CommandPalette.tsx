import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  LayoutDashboard,
  Scan,
  Inbox,
  List,
  Shield,
  Layers,
  Activity,
  Cpu,
  Terminal,
  ArrowRight,
  LogOut,
} from "lucide-react";
import type { RouteId } from "../types/guardian";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: RouteId) => void;
  onLogout: () => void;
  activeWorkspace?: string;
  onSelectWorkspace?: (ws: string) => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Workspace" | "Action" | "System";
  icon: typeof Search;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onLogout,
  activeWorkspace = "Production",
  onSelectWorkspace,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: CommandItem[] = [
    {
      id: "nav-overview",
      title: "Security Overview",
      subtitle: "Workspace risk posture and real-time decision stream",
      category: "Navigation",
      icon: LayoutDashboard,
      action: () => onNavigate("overview"),
    },
    {
      id: "nav-analyze",
      title: "Action Workbench (Analyze)",
      subtitle: "Evaluate action through 6-step detection pipeline",
      category: "Navigation",
      icon: Scan,
      action: () => onNavigate("analyze"),
    },
    {
      id: "nav-decisions",
      title: "Decision Records",
      subtitle: "Filter and inspect historical enforcement actions",
      category: "Navigation",
      icon: Inbox,
      action: () => onNavigate("decisions"),
    },
    {
      id: "nav-audit",
      title: "Audit Logs",
      subtitle: "Immutable security audit log trail",
      category: "Navigation",
      icon: List,
      action: () => onNavigate("audit"),
    },
    {
      id: "nav-policies",
      title: "Governance Policies",
      subtitle: "View active enforcement thresholds and rules",
      category: "Navigation",
      icon: Shield,
      action: () => onNavigate("policies"),
    },
    {
      id: "nav-risks",
      title: "Risk Categories",
      subtitle: "Classifiers: DESTRUCTIVE, PRODUCTION, CREDENTIAL_ACCESS...",
      category: "Navigation",
      icon: Layers,
      action: () => onNavigate("risks"),
    },
    {
      id: "nav-engine",
      title: "Runtime Engine Status",
      subtitle: "Inspect health check, latencies, and service dependencies",
      category: "System",
      icon: Activity,
      action: () => onNavigate("engine"),
    },
    {
      id: "nav-models",
      title: "Semantic Detector Models",
      subtitle: "all-MiniLM-L6-v2 embedding vectors and thresholds",
      category: "System",
      icon: Cpu,
      action: () => onNavigate("models"),
    },
    {
      id: "nav-api",
      title: "API Reference & cURL",
      subtitle: "Endpoints, request payloads, and integration snippets",
      category: "System",
      icon: Terminal,
      action: () => onNavigate("api"),
    },
    {
      id: "ws-prod",
      title: "Switch to Production",
      subtitle: activeWorkspace === "Production" ? "Current workspace · Active" : "Strict enforcement policies & immutable logging",
      category: "Workspace",
      icon: Layers,
      action: () => onSelectWorkspace?.("Production"),
    },
    {
      id: "ws-dev",
      title: "Switch to Development",
      subtitle: activeWorkspace === "Development" ? "Current workspace · Active" : "Isolated test bed · Permissive audit logging",
      category: "Workspace",
      icon: Layers,
      action: () => onSelectWorkspace?.("Development"),
    },
    {
      id: "ws-staging",
      title: "Switch to Staging",
      subtitle: activeWorkspace === "Staging" ? "Current workspace · Active" : "Pre-release canary evaluation workspace",
      category: "Workspace",
      icon: Layers,
      action: () => onSelectWorkspace?.("Staging"),
    },
    {
      id: "act-signout",
      title: "Sign out",
      subtitle: "Terminate analyst session and clear bearer token",
      category: "Action",
      icon: LogOut,
      action: onLogout,
    },
  ];

  const filtered = items.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleClose = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          handleClose();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, filtered, selectedIndex, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="palette-backdrop" onClick={handleClose}>
      <div
        className="palette-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="palette-input-row">
          <Search size={16} className="palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Type a command or jump to surface..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="palette-esc-badge" onClick={handleClose}>
            ESC
          </kbd>
        </div>

        <div className="palette-results">
          {filtered.length === 0 ? (
            <div className="palette-empty">No matching commands or destinations found.</div>
          ) : (
            filtered.map((item, index) => {
              const IconComp = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`palette-item ${isSelected ? "is-selected" : ""}`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    item.action();
                    handleClose();
                  }}
                >
                  <div className="palette-item-icon">
                    <IconComp size={15} />
                  </div>
                  <div className="palette-item-info">
                    <span className="palette-item-title">{item.title}</span>
                    <span className="palette-item-subtitle">{item.subtitle}</span>
                  </div>
                  <span className="palette-item-category">{item.category}</span>
                  <ArrowRight size={13} className="palette-item-arrow" />
                </button>
              );
            })
          )}
        </div>

        <div className="palette-footer">
          <div className="palette-hint">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="palette-brand-tag">GUARDIAN v1.0</span>
        </div>
      </div>
    </div>
  );
}
