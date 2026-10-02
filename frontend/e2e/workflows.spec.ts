import { test, expect } from "@playwright/test";

const mockUser = {
  id: 1,
  username: "analyst",
  email: "analyst@guardian.io",
  role: "Analyst",
};

const mockAnalysisStats = {
  total: 4,
  allow: 2,
  review: 1,
  block: 1,
};

const mockReviewStats = {
  total: 1,
  pending: 1,
  approved: 0,
  rejected: 0,
};

const mockInitialAnalyses = [
  {
    id: 101,
    request_id: "req_audit_101",
    action: "SELECT id, email FROM users LIMIT 10",
    context: "Read replica query",
    decision: "ALLOW",
    risk_score: 0.1,
    risk_level: "LOW",
    policy_version: "v1.4",
    detector_version: "1.0",
    semantic_model: "all-MiniLM-L6-v2",
    created_at: new Date().toISOString(),
    findings: [],
  },
];

const mockAuditLogs = [
  {
    id: 201,
    request_id: "req_audit_101",
    analysis_id: 101,
    user_id: 1,
    action: "SELECT id, email FROM users LIMIT 10",
    decision: "ALLOW",
    risk_score: 0.1,
    risk_level: "LOW",
    policy_version: "v1.4",
    detector_version: "1.0",
    semantic_model: "all-MiniLM-L6-v2",
    created_at: new Date().toISOString(),
  },
];

test.describe("Guardian End-to-End Workflows", () => {
  test.beforeEach(async ({ page }) => {
    let pendingReviews = [
      {
        id: 501,
        request_id: "req_review_501",
        status: "PENDING",
        resolution_notes: null,
        created_at: new Date().toISOString(),
        resolved_at: null,
        analysis: {
          id: 301,
          action: "pg_dump -U postgres customer_db > /tmp/backup.sql",
          context: "Ad-hoc database export",
          decision: "REVIEW",
          risk_score: 0.55,
          risk_level: "MEDIUM",
        },
      },
    ];

    await page.route("**/auth/token", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock_jwt_token_12345",
          token_type: "bearer",
        }),
      });
    });

    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUser),
      });
    });

    await page.route("**/analyses/stats", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAnalysisStats),
      });
    });

    await page.route("**/reviews/stats", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: pendingReviews.length,
          pending: pendingReviews.filter((r) => r.status === "PENDING").length,
          approved: pendingReviews.filter((r) => r.status === "APPROVED").length,
          rejected: pendingReviews.filter((r) => r.status === "REJECTED").length,
        }),
      });
    });

    await page.route("**/analyses?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockInitialAnalyses),
      });
    });

    await page.route("**/analyses/101", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockInitialAnalyses[0]),
      });
    });

    await page.route("**/audit/requests/req_audit_101", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          request_id: "req_audit_101",
          action: "SELECT id, email FROM users LIMIT 10",
          decision: "ALLOW",
          risk_level: "LOW",
          risk_score: 0.1,
          policy_version: "v1.4",
          timeline: [
            {
              stage: "SUBMITTED",
              title: "Request Submitted",
              timestamp: new Date().toISOString(),
              actor: "analyst",
              description: "Action analysis initiated via API",
            },
            {
              stage: "AUTOMATED_DECISION",
              title: "Policy Evaluated",
              timestamp: new Date().toISOString(),
              actor: "Policy v1.4",
              description: "Action cleared by baseline policy rules",
            },
          ],
        }),
      });
    });

    await page.route("**/audit-logs*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAuditLogs),
      });
    });

    await page.route("**/analyze", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      const isRisky = body.action?.includes("pg_dump") || body.action?.includes("backup");
      const decision = isRisky ? "REVIEW" : "ALLOW";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          request_id: isRisky ? "req_review_501" : "req_safe_999",
          analysis_id: isRisky ? 301 : 999,
          decision,
          risk_score: isRisky ? 0.55 : 0.05,
          risk_level: isRisky ? "MEDIUM" : "LOW",
          decision_reason: isRisky
            ? "Action requires operational confirmation"
            : "Action passed guardrail checks",
          policy_version: "v1.4",
          detector_version: "1.0",
          semantic_model: "all-MiniLM-L6-v2",
          findings: [],
        }),
      });
    });

    await page.route("**/reviews?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(pendingReviews),
      });
    });

    await page.route("**/reviews/501/approve", async (route) => {
      pendingReviews = pendingReviews.map((r) =>
        r.id === 501
          ? {
              ...r,
              status: "APPROVED",
              resolution_notes: "Approved for staging deployment",
              resolved_at: new Date().toISOString(),
            }
          : r
      );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(pendingReviews[0]),
      });
    });
  });

  test("Flow 1: login, analyze safe action, and observe allow verdict", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.locator("h1")).toContainText("Sign in");
    await page.fill("#login-username", "analyst");
    await page.fill("#login-password", "password123");
    await page.click("button[type='submit']");

    await expect(page.locator(".dev-main-wrap")).toBeVisible();

    await page.click("button.n8n-nav-item:has-text('Analyze')");
    await expect(page.locator("textarea#action-textarea")).toBeVisible();

    await page.click("button.preset-pill-item:has-text('Read active user directory')");
    await page.click("button.btn-run-evaluation");

    const badge = page.locator(".verdict-hero-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("ALLOW");
  });

  test("Flow 2: analyze risky action, navigate to review queue, and approve", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("guardian_token", "mock_jwt_token_12345");
      localStorage.setItem("guardian_username", "analyst");
    });
    await page.reload();

    await page.click("button.n8n-nav-item:has-text('Analyze')");
    await expect(page.locator("textarea#action-textarea")).toBeVisible();

    await page.click("button.preset-pill-item:has-text('Export database dump')");
    await page.click("button.btn-run-evaluation");

    const badge = page.locator(".verdict-hero-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("REVIEW");

    await page.click("button.n8n-nav-item:has-text('Reviews')");
    await expect(page.locator(".review-card")).toBeVisible();
    await expect(page.locator(".review-card")).toContainText("req_review_501");

    const approveBtn = page.getByRole("button", { name: /^approve$/i });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    const justificationInput = page.getByPlaceholder("Enter justification or verification reference...");
    await expect(justificationInput).toBeVisible();
    await justificationInput.fill("Approved for staging deployment");

    await page.getByRole("button", { name: /confirm approve/i }).click();
    await expect(justificationInput).not.toBeVisible();
  });

  test("Flow 3: inspect audit log, search by request id, and view timeline", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("guardian_token", "mock_jwt_token_12345");
      localStorage.setItem("guardian_username", "analyst");
    });
    await page.reload();

    await page.click("button.n8n-nav-item:has-text('Audit')");
    await expect(page.locator(".dev-table")).toBeVisible();

    await page.fill("input.toolbar-search-input", "req_audit_101");
    const row = page.locator("tr.dev-table-row:has-text('SELECT id, email')");
    await expect(row).toBeVisible();

    await row.click();
    await expect(page.locator(".drawer-sheet")).toBeVisible();
    await expect(page.locator(".drawer-sheet")).toContainText("Request lifecycle trace");
    await expect(page.locator(".drawer-sheet")).toContainText("Policy v1.4");
  });
});
