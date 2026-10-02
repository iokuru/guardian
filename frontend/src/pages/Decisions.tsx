import { useState, useMemo } from "react";
import { Search, RefreshCw, Copy, Check } from "lucide-react";
import type { AnalysisRecord } from "../types/guardian";
import { copyToClipboard } from "../utils/clipboard";

interface DecisionsProps {
  analyses: AnalysisRecord[];
  loading: boolean;
  onRefresh: () => void;
  onSelectAnalysis: (id: number) => void;
}

function formatRelative(iso: string) {
  try {
    const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
    return (
      new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(iso)) + " IST"
    );
  } catch {
    return iso;
  }
}

function getHumanActionTitle(action: string): string {
  const low = action.toLowerCase();
  if (low.includes("drop table users") || low.includes("delete from users")) {
    return "Delete customer records";
  }
  if (low.includes("credentials") || low.includes("id_rsa") || low.includes("aws")) {
    return "Extract credentials & secrets";
  }
  if (low.includes("pg_dump") || low.includes("backup.sql")) {
    return "Create database backup & export";
  }
  if (low.includes("select") && low.includes("users")) {
    return "Read active user directory";
  }
  if (low.includes("cache") || low.includes("tmp")) {
    return "Clear ephemeral build cache";
  }
  return action.length > 55 ? action.slice(0, 52) + "..." : action;
}

export function Decisions({
  analyses,
  loading,
  onRefresh,
  onSelectAnalysis,
}: DecisionsProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return analyses.filter((item) => {
      const dec = (item.decision || "").toUpperCase();
      if (filter !== "ALL" && dec !== filter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchId = String(item.id).includes(q);
        const matchAction = (item.action || "").toLowerCase().includes(q);
        const matchContext = (item.context || "").toLowerCase().includes(q);
        const matchReason = (item.decision_reason || "").toLowerCase().includes(q);
        if (!matchId && !matchAction && !matchContext && !matchReason) return false;
      }
      return true;
    });
  }, [analyses, filter, search]);

  const blockCount = analyses.filter((a) => (a.decision || "").toUpperCase() === "BLOCK").length;
  const reviewCount = analyses.filter((a) => (a.decision || "").toUpperCase() === "REVIEW").length;
  const allowCount = analyses.filter((a) => (a.decision || "").toUpperCase() === "ALLOW").length;

  async function handleCopyCommand(e: React.MouseEvent, id: number, action: string) {
    e.stopPropagation();
    const ok = await copyToClipboard(action);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1400);
    }
  }

  return (
    <div className="overview-editorial-wrap">
      {/* Page Heading */}
      <div className="page-header-block">
        <h1 className="page-main-heading">Decisions</h1>
        <p className="page-sub-heading">
          Complete log of all evaluated agent operations and runtime policy verdicts.
        </p>
      </div>

      
      <div className="filter-toolbar">
        <div className="filter-pills-group">
          <button
            type="button"
            className={`filter-pill-btn ${filter === "ALL" ? "is-active" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All ({analyses.length})
          </button>
          <button
            type="button"
            className={`filter-pill-btn block ${filter === "BLOCK" ? "is-active" : ""}`}
            onClick={() => setFilter("BLOCK")}
          >
            Blocked ({blockCount})
          </button>
          <button
            type="button"
            className={`filter-pill-btn review ${filter === "REVIEW" ? "is-active" : ""}`}
            onClick={() => setFilter("REVIEW")}
          >
            Review ({reviewCount})
          </button>
          <button
            type="button"
            className={`filter-pill-btn allow ${filter === "ALLOW" ? "is-active" : ""}`}
            onClick={() => setFilter("ALLOW")}
          >
            Allowed ({allowCount})
          </button>
        </div>

        <div className="toolbar-right-cluster">
          <div className="toolbar-search-wrap">
            <Search size={13} className="search-icon-left" />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search decisions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="toolbar-icon-btn"
            onClick={onRefresh}
            title="Refresh decisions"
          >
            <RefreshCw size={13} className={loading ? "is-spinning" : ""} />
          </button>
        </div>
      </div>

      
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-[#71717a]">
          <p className="text-[13px]">No decisions match your current filters.</p>
        </div>
      ) : (
        <div className="decision-items-list">
          {filtered.map((item) => {
            const humanTitle = getHumanActionTitle(item.action || "");
            const scoreVal = (item.risk_score != null ? item.risk_score : 0).toFixed(2);
            const rawLevel = item.risk_level ? String(item.risk_level) : "Low";
            const levelCapitalized =
              rawLevel.charAt(0).toUpperCase() + rawLevel.slice(1).toLowerCase();
            const isCopied = copiedId === item.id;
            const decUpper = (item.decision || "ALLOW").toUpperCase();
            const decLower = decUpper.toLowerCase();

            return (
              <div
                key={item.id}
                className="decision-item-row group"
                onClick={() => onSelectAnalysis(item.id)}
              >
                <div className={`decision-col-token ${decLower}`}>
                  {decUpper}
                </div>

                <div className="decision-copy-cluster">
                  <div className="decision-row-headline">
                    <span className="decision-action-title">{humanTitle}</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="copy-btn opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleCopyCommand(e, item.id, item.action)}
                        title="Copy evaluated command"
                      >
                        {isCopied ? <Check size={11} className="copy-check-icon" /> : <Copy size={11} />}
                        <span>{isCopied ? "Copied" : "Copy"}</span>
                      </button>
                      <span className="decision-time-text">
                        {formatRelative(item.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="decision-context-sub">
                    {item.context || "No context specified"}
                  </div>

                  <div className="decision-meta-sub">
                    <span>{levelCapitalized}</span>
                    <span> · </span>
                    <span className="mono">{scoreVal}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
