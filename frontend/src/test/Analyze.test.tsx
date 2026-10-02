import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Analyze } from "../pages/Analyze";
import * as client from "../api/client";
import type { AnalysisResponse } from "../types/guardian";

describe("Analyze Page Component", () => {
  const mockSuccessResponse: AnalysisResponse = {
    decision: "BLOCK",
    risk_score: 95,
    risk_level: "CRITICAL",
    category: "DATA_DESTRUCTION",
    matched_rules: ["Rule 1: Disallow dropping core tables"],
    decision_reason: "Attempted cascade drop on customer data store.",
    policy_matches: [
      {
        policy_id: "POL-001",
        rule_name: "Prevent table drops",
        severity: "CRITICAL",
        decision: "BLOCK",
      },
    ],
    execution_time_ms: 14,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page title, presets cluster, and form inputs", () => {
    render(<Analyze />);
    expect(screen.getByRole("heading", { name: /analyze action/i })).toBeInTheDocument();
    expect(screen.getByText(/presets:/i)).toBeInTheDocument();
    expect(screen.getByText("Delete customer records (BLOCK)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run evaluation/i })).toBeInTheDocument();
  });

  it("applies a scenario preset when clicked", () => {
    render(<Analyze />);
    const presetBtn = screen.getByText("Extract credentials & secrets (BLOCK)");
    fireEvent.click(presetBtn);

    const actionTextarea = screen.getByPlaceholderText(/e\.g\. drop table users/i) as HTMLTextAreaElement;
    expect(actionTextarea.value).toContain("cat /root/.aws/credentials");
  });

  it("submits action analysis and displays evaluation results", async () => {
    vi.spyOn(client, "analyzeAction").mockResolvedValueOnce(mockSuccessResponse);
    const onEvaluationComplete = vi.fn();

    render(<Analyze onEvaluationComplete={onEvaluationComplete} />);

    const runBtn = screen.getByRole("button", { name: /run evaluation/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(client.analyzeAction).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Attempted cascade drop on customer data store.")).toBeInTheDocument();
    expect(onEvaluationComplete).toHaveBeenCalledTimes(1);
  });

  it("handles API error gracefully and displays the error message", async () => {
    vi.spyOn(client, "analyzeAction").mockRejectedValueOnce(new Error("Connection refused to backend"));

    render(<Analyze />);
    const runBtn = screen.getByRole("button", { name: /run evaluation/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText("Connection refused to backend")).toBeInTheDocument();
    });
  });

  it("clears inputs and results when Reset is clicked", async () => {
    render(<Analyze initialAction="rm -rf /data" initialContext="test context" />);
    const actionTextarea = screen.getByPlaceholderText(/e\.g\. drop table users/i) as HTMLTextAreaElement;
    expect(actionTextarea.value).toBe("rm -rf /data");

    const resetBtn = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetBtn);

    expect(actionTextarea.value).toBe("");
  });

  it("switches snippet tabs and copies snippet code after evaluation", async () => {
    vi.spyOn(client, "analyzeAction").mockResolvedValueOnce(mockSuccessResponse);
    render(<Analyze />);

    const runBtn = screen.getByRole("button", { name: /run evaluation/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText("API Replication Snippet")).toBeInTheDocument();
    });

    const pythonTab = screen.getByRole("button", { name: /python sdk/i });
    fireEvent.click(pythonTab);

    expect(screen.getByText(/import requests/i)).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: /copy code/i });
    fireEvent.click(copyBtn);
    expect(screen.getByText(/copied/i)).toBeInTheDocument();
  });
});
