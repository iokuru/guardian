import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuditLogs } from "../pages/AuditLogs";
import * as client from "../api/client";
import type { AuditLogResponse } from "../types/guardian";

describe("AuditLogs Page Component", () => {
  const mockLogs: AuditLogResponse[] = [
    {
      id: 1,
      user_id: 42,
      analysis_id: 101,
      action: "DROP TABLE users CASCADE",
      context: "Production database maintenance",
      decision: "BLOCK",
      decision_reason: "High risk database destruction command",
      risk_level: "CRITICAL",
      risk_score: 98,
      signature_hash: "a1b2c3d4e5f67890",
      created_at: "2026-09-11T09:30:00Z",
    },
    {
      id: 2,
      user_id: 43,
      analysis_id: 102,
      action: "SELECT * FROM orders LIMIT 10",
      context: "Reporting dashboard query",
      decision: "ALLOW",
      decision_reason: "Safe read operation",
      risk_level: "LOW",
      risk_score: 12,
      signature_hash: "f6e5d4c3b2a10987",
      created_at: "2026-09-11T09:45:00Z",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(client, "getAuditLogs").mockResolvedValue(mockLogs);
  });

  it("loads and displays audit logs from API", async () => {
    render(<AuditLogs onSelectAnalysis={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("DROP TABLE users CASCADE")).toBeInTheDocument();
    });

    expect(screen.getByText("SELECT * FROM orders LIMIT 10")).toBeInTheDocument();
    expect(screen.getByText("User #42")).toBeInTheDocument();
  });

  it("filters audit logs by decision filter button", async () => {
    render(<AuditLogs onSelectAnalysis={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("DROP TABLE users CASCADE")).toBeInTheDocument();
    });

    const blockedPill = screen.getByRole("button", { name: /^blocked$/i });
    fireEvent.click(blockedPill);

    await waitFor(() => {
      expect(client.getAuditLogs).toHaveBeenCalledWith(100, "BLOCK");
    });
  });

  it("filters audit logs in-memory using search input", async () => {
    render(<AuditLogs onSelectAnalysis={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("DROP TABLE users CASCADE")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search audit trail\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "orders" } });

    expect(screen.getByText("SELECT * FROM orders LIMIT 10")).toBeInTheDocument();
    expect(screen.queryByText("DROP TABLE users CASCADE")).not.toBeInTheDocument();
  });

  it("invokes onSelectAnalysis callback when clicking an audit row", async () => {
    const onSelectAnalysis = vi.fn();
    render(<AuditLogs onSelectAnalysis={onSelectAnalysis} />);

    await waitFor(() => {
      expect(screen.getByText("DROP TABLE users CASCADE")).toBeInTheDocument();
    });

    const rowAction = screen.getByText("DROP TABLE users CASCADE");
    fireEvent.click(rowAction);

    expect(onSelectAnalysis).toHaveBeenCalledWith(101);
  });

  it("triggers JSON file export when Export JSON button is clicked", async () => {
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    render(<AuditLogs onSelectAnalysis={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("DROP TABLE users CASCADE")).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole("button", { name: /export json/i });
    fireEvent.click(exportBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");
  });

  it("reloads logs when clicking refresh button", async () => {
    render(<AuditLogs onSelectAnalysis={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("DROP TABLE users CASCADE")).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole("button", { name: /refresh audit logs/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(client.getAuditLogs).toHaveBeenCalledTimes(2);
    });
  });
});
