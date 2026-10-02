import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  apiRequest,
  getHealth,
  getAnalysisStats,
  getAnalyses,
  getAnalysis,
  analyzeAction,
  getAuditLogs,
  getCurrentUser,
  listUsers,
} from "../api/client";

describe("API Client Service", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("adds Authorization header when token is stored in localStorage", async () => {
    localStorage.setItem("guardian_token", "test-token-xyz");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    } as Response);

    await apiRequest("/health");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token-xyz",
        }),
      })
    );
  });

  it("handles validation error array in 422 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [
          { loc: ["body", "action"], msg: "Field required" },
          { loc: ["body", "context"], msg: "Invalid format" },
        ],
      }),
    } as Response);

    await expect(apiRequest("/analyze")).rejects.toThrow("Field required, Invalid format");
  });

  it("handles generic failure with status code when detail is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(apiRequest("/crash")).rejects.toThrow("Request failed: 500");
  });

  it("calls getHealth endpoint", async () => {
    const mockHealth = { status: "healthy", version: "1.0.0", timestamp: "2026-09-11T10:00:00Z" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealth,
    } as Response);

    const result = await getHealth();
    expect(result).toEqual(mockHealth);
  });

  it("calls getAnalysisStats endpoint", async () => {
    const mockStats = { total_analyses: 120, block_count: 30, review_count: 40, allow_count: 50 };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    } as Response);

    const result = await getAnalysisStats();
    expect(result).toEqual(mockStats);
  });

  it("calls getAnalyses with default and custom pagination params", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    await getAnalyses();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/analyses?limit=50&offset=0",
      expect.anything()
    );

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    await getAnalyses(10, 20);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/analyses?limit=10&offset=20",
      expect.anything()
    );
  });

  it("calls getAnalysis by id", async () => {
    const mockAnalysis = { id: 42, action: "rm -rf /", decision: "BLOCK" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysis,
    } as Response);

    const result = await getAnalysis(42);
    expect(result).toEqual(mockAnalysis);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/analyses/42",
      expect.anything()
    );
  });

  it("calls analyzeAction with POST payload", async () => {
    const reqPayload = { action: "cat secret.txt", context: "agent test" };
    const mockResp = {
      decision: "BLOCK" as const,
      risk_score: 95,
      risk_level: "CRITICAL" as const,
      policy_matches: [],
      execution_time_ms: 12,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResp,
    } as Response);

    const result = await analyzeAction(reqPayload);
    expect(result).toEqual(mockResp);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/analyze",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(reqPayload),
      })
    );
  });

  it("calls getAuditLogs with query filters", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    await getAuditLogs(25, "BLOCK", "HIGH");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/audit-logs?limit=25&decision=BLOCK&risk_level=HIGH",
      expect.anything()
    );
  });

  it("calls getCurrentUser and listUsers", async () => {
    const user = { id: 1, username: "analyst" };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => user,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [user],
      } as Response);

    const currentUser = await getCurrentUser();
    expect(currentUser).toEqual(user);

    const users = await listUsers();
    expect(users).toEqual([user]);
  });
});
