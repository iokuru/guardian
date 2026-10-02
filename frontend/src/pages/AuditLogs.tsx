import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Download } from "lucide-react";
import type { AuditLogResponse } from "../types/guardian";
import { getAuditLogs } from "../api/client";

interface AuditLogsProps {
  onSelectAnalysis: (analysisId: number) => void;
}

function formatIst(iso: string) {
  try {
    const d = new Date(iso);
    const datePart = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    const timePart = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
    return `${datePart} ${timePart} IST`;
  } catch {
    return iso;
  }
}

export function AuditLogs({ onSelectAnalysis }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [decisionFilter, setDecisionFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(100, decisionFilter);
      setLogs(data);
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  }, [decisionFilter]);

  useEffect(() => {
    let active = true;

    async function fetchLogs() {
      try {
        const data = await getAuditLogs(100, decisionFilter);
        if (active) {
          setLogs(data);
        }
      } catch {
        // Fallback gracefully
      }
    }

    fetchLogs();
    return () => {
      active = false;
    };
  }, [decisionFilter]);

  const filtered = logs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(log.id).includes(q) ||
      String(log.analysis_id).includes(q) ||
      (log.action || "").toLowerCase().includes(q)
    );
  });

  function exportJson() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guardian-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="overview-editorial-wrap">
      {/* Page Heading */}
      <div className="page-header-block flex items-start justify-between">
        <div>
          <h1 className="page-main-heading">Audit logs</h1>
          <p className="page-sub-heading">
            Immutable, append-only security audit trail recording all agent executions.
          </p>
        </div>

        <div>
          <button
            type="button"
            className="btn-export-json"
            onClick={exportJson}
            disabled={logs.length === 0}
          >
            <Download size={13} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-pills-group">
          <button
            type="button"
            className={`filter-pill-btn ${decisionFilter === "ALL" ? "is-active" : ""}`}
            onClick={() => setDecisionFilter("ALL")}
          >
            All Events ({logs.length})
          </button>
          <button
            type="button"
            className={`filter-pill-btn block ${decisionFilter === "BLOCK" ? "is-active" : ""}`}
            onClick={() => setDecisionFilter("BLOCK")}
          >
            Blocked
          </button>
          <button
            type="button"
            className={`filter-pill-btn review ${decisionFilter === "REVIEW" ? "is-active" : ""}`}
            onClick={() => setDecisionFilter("REVIEW")}
          >
            Review
          </button>
          <button
            type="button"
            className={`filter-pill-btn allow ${decisionFilter === "ALLOW" ? "is-active" : ""}`}
            onClick={() => setDecisionFilter("ALLOW")}
          >
            Allowed
          </button>
        </div>

        <div className="toolbar-right-cluster">
          <div className="toolbar-search-wrap">
            <Search size={13} className="search-icon-left" />
            <input
              type="text"
              className="toolbar-search-input"
              placeholder="Search audit trail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="toolbar-icon-btn"
            onClick={loadLogs}
            title="Refresh audit logs"
          >
            <RefreshCw size={13} className={loading ? "is-spinning" : ""} />
          </button>
        </div>
      </div>

      
      <div className="dev-table-container">
        <table className="dev-table">
          <thead>
            <tr>
              <th style={{ width: "190px" }}>Timestamp (IST)</th>
              <th style={{ width: "90px" }}>Actor</th>
              <th>Action</th>
              <th style={{ width: "105px" }}>Verdict</th>
              <th style={{ width: "120px" }}>Risk Score</th>
              <th style={{ width: "80px", textAlign: "right" }}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr
                key={log.id}
                className="dev-table-row clickable"
                onClick={() => onSelectAnalysis(log.analysis_id)}
              >
                <td>
                  <code className="mono-text text-[#71717a]">
                    {formatIst(log.created_at)}
                  </code>
                </td>
                <td>
                  <span className="text-[#27272a] font-medium">
                    User #{log.user_id}
                  </span>
                </td>
                <td>
                  <code className="mono-text text-[#09090b] truncate-block">
                    {log.action}
                  </code>
                </td>
                <td>
                  <span className={`decision-col-token ${log.decision.toLowerCase()}`}>
                    {log.decision}
                  </span>
                </td>
                <td>
                  <code className="mono-text font-medium">
                    {(log.risk_score || 0).toFixed(2)}
                  </code>
                  <span className="risk-level-sub-tag">
                    {log.risk_level}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <span className="inspect-link-text">Inspect →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
