import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  X,
  Search,
  ExternalLink,
} from "lucide-react";
import type { ReviewRecord, ReviewStats } from "../types/guardian";
import { getReviews, getReviewStats, approveReview, rejectReview } from "../api/client";

interface ReviewsProps {
  onInspectRequest?: (requestId: string) => void;
}

export function Reviews({ onInspectRequest }: ReviewsProps) {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<{ id: number; action: "approve" | "reject"; reqId: string } | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = filter === "all" ? undefined : filter.toUpperCase();
      const [listRes, statsRes] = await Promise.allSettled([
        getReviews(statusParam),
        getReviewStats(),
      ]);

      if (listRes.status === "fulfilled") {
        setReviews(listRes.value);
      }
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleConfirmResolution() {
    if (!activeModal) return;
    setProcessingId(activeModal.id);
    try {
      if (activeModal.action === "approve") {
        await approveReview(activeModal.id, resolutionNotes || "Approved in review queue", "Krishna");
      } else {
        await rejectReview(activeModal.id, resolutionNotes || "Rejected in review queue", "Krishna");
      }
      setActiveModal(null);
      setResolutionNotes("");
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to resolve review");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="reviews-page max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#27272a] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Reviews</span>
            {stats.pending > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#ea4b71]/20 text-[#ea4b71] border border-[#ea4b71]/30">
                {stats.pending} pending
              </span>
            )}
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Action review and policy enforcement requiring human verification
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 bg-[#18181b] p-1 rounded-lg border border-[#27272a]">
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === "pending"
                ? "bg-[#27272a] text-white shadow-sm"
                : "text-[#a1a1aa] hover:text-white"
            }`}
            onClick={() => setFilter("pending")}
          >
            Pending ({stats.pending})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === "approved"
                ? "bg-[#27272a] text-white shadow-sm"
                : "text-[#a1a1aa] hover:text-white"
            }`}
            onClick={() => setFilter("approved")}
          >
            Approved ({stats.approved})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === "rejected"
                ? "bg-[#27272a] text-white shadow-sm"
                : "text-[#a1a1aa] hover:text-white"
            }`}
            onClick={() => setFilter("rejected")}
          >
            Rejected ({stats.rejected})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === "all"
                ? "bg-[#27272a] text-white shadow-sm"
                : "text-[#a1a1aa] hover:text-white"
            }`}
            onClick={() => setFilter("all")}
          >
            All ({stats.total})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-[#71717a] text-sm">
          Loading review queue...
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#27272a] rounded-xl bg-[#121214]">
          <CheckCircle className="mx-auto text-[#22c55e] mb-3" size={32} />
          <h3 className="text-base font-semibold text-white">No {filter} reviews</h3>
          <p className="text-sm text-[#a1a1aa] mt-1 max-w-sm mx-auto">
            {filter === "pending"
              ? "All risky actions have been evaluated or resolved."
              : "No reviews found matching this filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reviews.map((rev) => {
            const isPending = rev.status.toLowerCase() === "pending";
            const isApproved = rev.status.toLowerCase() === "approved";
            const isRejected = rev.status.toLowerCase() === "rejected";
            const analysis = rev.analysis;

            return (
              <div
                key={rev.id}
                className="review-card p-5 rounded-xl border border-[#27272a] bg-[#121214] hover:border-[#3f3f46] transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#ea4b71] bg-[#ea4b71]/10 px-2 py-0.5 rounded border border-[#ea4b71]/20">
                        {rev.request_id}
                      </span>
                      <span
                        className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded ${
                          isPending
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : isApproved
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {rev.status.toLowerCase()}
                      </span>
                      {analysis && (
                        <span className="text-xs text-[#71717a]">
                          {analysis.risk_level.toLowerCase()} · {analysis.risk_score.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-semibold text-white">
                      {analysis?.action || "Action under review"}
                    </h2>

                    {analysis?.context && (
                      <p className="text-xs text-[#a1a1aa] font-mono bg-[#18181b] p-2 rounded border border-[#27272a]">
                        Context: {analysis.context}
                      </p>
                    )}
                  </div>

                  {/* Actions for pending items */}
                  {isPending && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      <button
                        type="button"
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#27272a] text-[#f43f5e] hover:bg-rose-500/20 border border-rose-500/30 transition-colors flex items-center gap-1.5"
                        onClick={() => setActiveModal({ id: rev.id, action: "reject", reqId: rev.request_id })}
                        disabled={processingId === rev.id}
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#15803d] text-white hover:bg-[#16a34a] border border-[#22c55e]/40 transition-colors flex items-center gap-1.5 shadow-sm"
                        onClick={() => setActiveModal({ id: rev.id, action: "approve", reqId: rev.request_id })}
                        disabled={processingId === rev.id}
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Findings chips */}
                {analysis?.findings && analysis.findings.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#27272a]/60">
                    <span className="text-[11px] text-[#71717a] font-medium">Signals:</span>
                    {analysis.findings.map((f, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#18181b] text-[#d4d4d8] border border-[#27272a]"
                        title={f.reason}
                      >
                        {String(f.category).toLowerCase()} ({f.score.toFixed(2)})
                      </span>
                    ))}
                  </div>
                )}

                {/* Resolution note display if resolved */}
                {rev.resolution_notes && (
                  <div className="text-xs text-[#a1a1aa] bg-[#18181b]/80 p-2.5 rounded border border-[#27272a]">
                    <span className="text-white font-medium">Reviewer Note: </span>
                    {rev.resolution_notes}
                  </div>
                )}

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-[11px] text-[#71717a] pt-1">
                  <span>Created {new Date(rev.created_at).toLocaleString()}</span>
                  {onInspectRequest && (
                    <button
                      type="button"
                      className="text-[#ea4b71] hover:underline flex items-center gap-1"
                      onClick={() => onInspectRequest(rev.request_id)}
                    >
                      <span>Inspect audit trace</span>
                      <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white capitalize">
              {activeModal.action} Request {activeModal.reqId}
            </h3>
            <p className="text-xs text-[#a1a1aa]">
              {activeModal.action === "approve"
                ? "Approving this action allows it to proceed and writes an immutable approval record to the audit log."
                : "Rejecting this action blocks execution and flags the request as blocked by reviewer."}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#d4d4d8]">
                Resolution Note / Justification
              </label>
              <textarea
                className="w-full text-xs bg-[#121214] border border-[#27272a] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#ea4b71] min-h-[80px]"
                placeholder="Enter justification or verification reference..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-white"
                onClick={() => {
                  setActiveModal(null);
                  setResolutionNotes("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg text-white ${
                  activeModal.action === "approve"
                    ? "bg-[#15803d] hover:bg-[#16a34a]"
                    : "bg-[#e11d48] hover:bg-[#f43f5e]"
                }`}
                onClick={handleConfirmResolution}
                disabled={processingId !== null}
              >
                {processingId !== null ? "Processing..." : `Confirm ${activeModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
