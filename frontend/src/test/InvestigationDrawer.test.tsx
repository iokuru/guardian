import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InvestigationDrawer } from "../components/InvestigationDrawer";
import * as client from "../api/client";
import type { AnalysisRecord } from "../types/guardian";

describe("InvestigationDrawer Component", () => {
  const mockRecord: AnalysisRecord = {
    id: 99,
    action: "DROP TABLE users CASCADE",
    context: "Production database maintenance",
    decision: "BLOCK",
    risk_score: 98,
    risk_level: "CRITICAL",
    category: "DATA_DESTRUCTION",
    matched_rules: ["Disallow dropping user tables"],
    decision_reason: "Direct destruction of user records detected.",
    policy_matches: [
      {
        policy_id: "POL-001",
        rule_name: "Prevent table drops",
        severity: "CRITICAL",
        decision: "BLOCK",
      },
    ],
    created_at: "2026-09-11T09:30:00Z",
    execution_time_ms: 12,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when analysisId is null", () => {
    const { container } = render(
      <InvestigationDrawer analysisId={null} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders analysis details using fallbackRecord immediately", () => {
    render(
      <InvestigationDrawer
        analysisId={99}
        fallbackRecord={mockRecord}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Evaluation #99")).toBeInTheDocument();
    expect(screen.getByText("DROP TABLE users CASCADE")).toBeInTheDocument();
    expect(screen.getByText("Direct destruction of user records detected.")).toBeInTheDocument();
  });

  it("fetches analysis record from API if not provided in fallback", async () => {
    vi.spyOn(client, "getAnalysis").mockResolvedValueOnce(mockRecord);

    render(
      <InvestigationDrawer analysisId={99} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(client.getAnalysis).toHaveBeenCalledWith(99);
    });

    expect(screen.getByText("Evaluation #99")).toBeInTheDocument();
  });

  it("calls onTestInWorkbench with action and context when button is clicked", () => {
    const onTestInWorkbench = vi.fn();
    render(
      <InvestigationDrawer
        analysisId={99}
        fallbackRecord={mockRecord}
        onClose={vi.fn()}
        onTestInWorkbench={onTestInWorkbench}
      />
    );

    const testBtn = screen.getByRole("button", { name: /test in workbench/i });
    fireEvent.click(testBtn);

    expect(onTestInWorkbench).toHaveBeenCalledWith(
      "DROP TABLE users CASCADE",
      "Production database maintenance"
    );
  });

  it("toggles raw JSON preview when toggle button is clicked", () => {
    render(
      <InvestigationDrawer
        analysisId={99}
        fallbackRecord={mockRecord}
        onClose={vi.fn()}
      />
    );

    const toggleBtn = screen.getByRole("button", { name: /raw json/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole("button", { name: /hide raw json/i })).toBeInTheDocument();
  });

  it("copies payload JSON when Copy JSON button is clicked", async () => {
    render(
      <InvestigationDrawer
        analysisId={99}
        fallbackRecord={mockRecord}
        onClose={vi.fn()}
      />
    );

    const copyBtn = screen.getByRole("button", { name: /copy json/i });
    fireEvent.click(copyBtn);

    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <InvestigationDrawer
        analysisId={99}
        fallbackRecord={mockRecord}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByTitle("Close (Esc)");
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes drawer when pressing Escape key", () => {
    const onClose = vi.fn();
    render(
      <InvestigationDrawer
        analysisId={99}
        fallbackRecord={mockRecord}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
