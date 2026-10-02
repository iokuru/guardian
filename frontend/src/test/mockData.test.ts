import { describe, it, expect } from "vitest";
import { DEFAULT_MOCK_ANALYSES, DEFAULT_MOCK_STATS } from "../api/mockData";

describe("Mock Data Integrity & Standards", () => {
  it("exports valid DEFAULT_MOCK_STATS", () => {
    expect(DEFAULT_MOCK_STATS.total).toBe(5);
    expect(DEFAULT_MOCK_STATS.allow + DEFAULT_MOCK_STATS.review + DEFAULT_MOCK_STATS.block).toBe(
      DEFAULT_MOCK_STATS.total
    );
  });

  it("contains 5 structured mock analyses", () => {
    expect(DEFAULT_MOCK_ANALYSES.length).toBe(5);
  });

  it("ensures each analysis record strictly adheres to enterprise schema", () => {
    for (const record of DEFAULT_MOCK_ANALYSES) {
      expect(typeof record.id).toBe("number");
      expect(record.action.length).toBeGreaterThan(0);
      expect(record.context.length).toBeGreaterThan(0);
      expect(["ALLOW", "REVIEW", "BLOCK"]).toContain(record.decision);
      expect(record.risk_score).toBeGreaterThanOrEqual(0);
      expect(record.risk_score).toBeLessThanOrEqual(1);
      expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(record.risk_level);

      // Verify created_at is valid ISO 8601 string
      const parsedDate = new Date(record.created_at);
      expect(parsedDate.toISOString()).toBe(record.created_at);
      expect(isNaN(parsedDate.getTime())).toBe(false);
    }
  });

  it("contains calibrated threat findings for critical actions", () => {
    const blockRecord = DEFAULT_MOCK_ANALYSES.find((r) => r.decision === "BLOCK");
    expect(blockRecord).toBeDefined();
    expect(blockRecord?.findings).toBeDefined();
    expect(blockRecord!.findings!.length).toBeGreaterThan(0);
  });
});
