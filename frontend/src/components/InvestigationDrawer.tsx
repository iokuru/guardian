import { useEffect, useState, useCallback } from "react";
import { X, Copy, Check, ExternalLink } from "lucide-react";
import type { AnalysisRecord } from "../types/guardian";
import { getAnalysis } from "../api/client";
import { copyToClipboard } from "../utils/clipboard";

interface InvestigationDrawerProps {
  analysisId: number | null;
  onClose: () => void;
  onTestInWorkbench?: (action: string, context: string) => void;
  fallbackRecord?: AnalysisRecord | null;
}

function formatIst(iso?: string) {
  if (!iso) return "—";
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

export function InvestigationDrawer({
  analysisId,
  onClose,
  onTestInWorkbench,
  fallbackRecord,
}: InvestigationDrawerProps) {
  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const activeRecord =
    record && record.id === analysisId
      ? record
      : fallbackRecord && fallbackRecord.id === analysisId
      ? fallbackRecord
      : null;

  const handleClose = useCallback(() => {
    setRecord(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  useEffect(() => {
    if (!analysisId) return;
    let isCurrent = true;

    getAnalysis(analysisId)
      .then((data) => {
        if (isCurrent && data) {
          setRecord(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [analysisId]);

  if (!analysisId) return null;

  async function copyPayload() {
    if (!activeRecord) return;
    const ok = await copyToClipboard(JSON.stringify(activeRecord, null, 2));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="drawer-sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drawer-top-bar">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[14px] text-[#09090b]">
              Evaluation #{analysisId}
            </span>
            {activeRecord && (
              <span className={`decision-badge-pill ${activeRecord.decision.toLowerCase()}`}>
                <span>{activeRecord.decision}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="copy-btn"
              onClick={copyPayload}
            >
              {copied ? <Check size={12} className="copy-check-icon" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy JSON"}</span>
            </button>
            <button
              type="button"
              className="toolbar-icon-btn !w-7 !h-7"
              onClick={handleClose}
              title="Close (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="drawer-scroll-body">
          {loading && !activeRecord ? (
            <div className="py-16 text-center text-[#71717a] text-[13px]">
              Loading evaluation details...
            </div>
          ) : activeRecord ? (
            <>
              
              <div className="drawer-status-banner">
                <div className="drawer-status-banner-header">
                  <span className="drawer-status-banner-title">
                    {activeRecord.decision === "BLOCK"
                      ? "Action Intercepted"
                      : activeRecord.decision === "REVIEW"
                      ? "Approval Required"
                      : "Action Cleared"}
                  </span>
                  <span className="drawer-status-banner-risk">
                    Risk {(activeRecord.risk_score || 0).toFixed(2)} · {activeRecord.risk_level}
                  </span>
                </div>
                <p className="drawer-status-banner-desc">
                  {activeRecord.decision_reason ||
                    (activeRecord.decision === "BLOCK"
                      ? "Policy override intercepted this action. Operation exceeded critical risk limits."
                      : activeRecord.decision === "REVIEW"
                      ? "Sensitive boundaries flagged. Manual analyst authorization required."
                      : "Action passed all guardrail checks and complied with baseline policy.")}
                </p>
              </div>

              {/* Action Code Block */}
              <div>
                <span className="drawer-section-label">
                  Evaluated Command
                </span>
                <pre className="drawer-code-box">
                  {activeRecord.action}
                </pre>
              </div>

              {/* Context Block */}
              <div>
                <span className="drawer-section-label">
                  Execution Context
                </span>
                <div className="drawer-context-box">
                  {activeRecord.context || "No context specified"}
                </div>
              </div>

              {/* Forensic Findings Table */}
              <div>
                <span className="drawer-section-label">
                  Threat Findings ({activeRecord.findings?.length || 0})
                </span>
                {activeRecord.findings && activeRecord.findings.length > 0 ? (
                  <table className="findings-clean-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Score</th>
                        <th>Source</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRecord.findings.map((f, idx) => (
                        <tr key={idx}>
                          <td className="mono font-medium">{f.category}</td>
                          <td className="mono">{(f.score || 0).toFixed(2)}</td>
                          <td className="text-[11px] text-[#71717a]">{f.source}</td>
                          <td>{f.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[12px] text-[#71717a]">No threat signals flagged.</p>
                )}
              </div>

              {/* Metadata Grid */}
              <div className="drawer-meta-grid">
                <div className="drawer-meta-item">
                  <span>Policy version</span>
                  <code>{activeRecord.policy_version || "1.0"}</code>
                </div>
                <div className="drawer-meta-item">
                  <span>Detector model</span>
                  <code>{activeRecord.semantic_model || "all-MiniLM-L6-v2"}</code>
                </div>
                <div className="drawer-meta-item">
                  <span>Timestamp (IST)</span>
                  <code>{formatIst(activeRecord.created_at)}</code>
                </div>
                <div className="drawer-meta-item">
                  <span>Analysis ID</span>
                  <code>#{activeRecord.id}</code>
                </div>
              </div>

              {/* Raw JSON toggle */}
              <div className="pt-2 border-t border-[#e4e4e7]">
                <button
                  type="button"
                  className="drawer-toggle-json-btn"
                  onClick={() => setShowJson(!showJson)}
                >
                  <span>{showJson ? "Hide" : "Show"} Raw JSON Record</span>
                  <ExternalLink size={12} />
                </button>
                {showJson && (
                  <pre className="drawer-raw-json">
                    {JSON.stringify(activeRecord, null, 2)}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-[#71717a] text-[13px]">
              <p>Evaluation details unavailable.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="drawer-footer-bar">
          {onTestInWorkbench && activeRecord ? (
            <button
              type="button"
              className="view-all-link"
              onClick={() => {
                onTestInWorkbench(activeRecord.action, activeRecord.context);
                handleClose();
              }}
            >
              <span>Test in Workbench</span>
              <span>→</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            className="btn-primary !h-8 !px-4"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
