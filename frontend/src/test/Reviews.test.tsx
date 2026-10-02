import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Reviews } from "../pages/Reviews";
import * as clientApi from "../api/client";
import type { ReviewRecord } from "../types/guardian";

const mockReviews: ReviewRecord[] = [
  {
    id: 101,
    request_id: "req_test1234",
    analysis_id: 1,
    status: "PENDING",
    created_at: new Date().toISOString(),
    analysis: {
      id: 1,
      request_id: "req_test1234",
      action: "Grant administrator permissions",
      context: "Production database cluster",
      risk_score: 0.60,
      risk_level: "HIGH",
      policy_version: "v1.4",
      detector_version: "v1.0",
      semantic_model: "all-MiniLM-L6-v2",
      created_at: new Date().toISOString(),
      findings: [
        {
          category: "privilege_escalation",
          severity: "HIGH",
          score: 0.60,
          reason: "Matches privilege escalation pattern",
          source: "ACTION",
        },
      ],
    },
  },
];

describe("Reviews Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(clientApi, "getReviews").mockResolvedValue(mockReviews);
    vi.spyOn(clientApi, "getReviewStats").mockResolvedValue({
      total: 1,
      pending: 1,
      approved: 0,
      rejected: 0,
    });
  });

  it("renders review queue headline and pending items", async () => {
    render(<Reviews />);

    expect(screen.getByText("Reviews")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Grant administrator permissions")).toBeInTheDocument();
      expect(screen.getByText("req_test1234")).toBeInTheDocument();
    });
  });

  it("opens modal when clicking approve button", async () => {
    render(<Reviews />);

    await waitFor(() => {
      expect(screen.getByText("Grant administrator permissions")).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole("button", { name: /^approve$/i });
    fireEvent.click(approveBtn);

    expect(screen.getByText(/Approve Request req_test1234/i)).toBeInTheDocument();
  });

  it("opens modal when clicking reject button", async () => {
    render(<Reviews />);

    await waitFor(() => {
      expect(screen.getByText("Grant administrator permissions")).toBeInTheDocument();
    });

    const rejectBtn = screen.getByRole("button", { name: /^reject$/i });
    fireEvent.click(rejectBtn);

    expect(screen.getByText(/Reject Request req_test1234/i)).toBeInTheDocument();
  });
});
