import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Integrations } from "../pages/Integrations";
import * as client from "../api/client";

vi.mock("../api/client", () => ({
  getApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  getIntegrationSnippets: vi.fn(),
}));

describe("Integrations Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(client.getApiKeys).mockResolvedValue([
      {
        id: 1,
        name: "production-deploy-bot",
        prefix: "gdn_live_1234",
        scopes: ["action:evaluate"],
        created_at: "2026-10-01T12:00:00Z",
        revoked_at: null,
      },
    ]);

    vi.mocked(client.getIntegrationSnippets).mockResolvedValue({
      api_endpoint: "http://127.0.0.1:8000/analysis",
      api_key_sample: "gdn_live_test...",
      snippets: [
        {
          language: "Python",
          filename: "agent_integration.py",
          code: "from guardian import Guardian\nguardian = Guardian(api_key='gdn_live_...')",
        },
        {
          language: "TypeScript",
          filename: "agentIntegration.ts",
          code: "export async function evaluateAction() {}",
        },
        {
          language: "cURL",
          filename: "evaluate.sh",
          code: "curl -X POST http://127.0.0.1:8000/analysis",
        },
      ],
    });
  });

  it("renders page header, API access endpoint, and sections", async () => {
    render(<Integrations />);

    expect(screen.getByRole("heading", { level: 1, name: "Integrations" })).toBeInTheDocument();
    expect(screen.getByText("API access")).toBeInTheDocument();
    expect(screen.getByText("API keys")).toBeInTheDocument();
    expect(screen.getByText("SDK")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("http://127.0.0.1:8000/analysis")).toBeInTheDocument();
      expect(screen.getByText("production-deploy-bot")).toBeInTheDocument();
      expect(screen.getByText("gdn_live_1234••••••••")).toBeInTheDocument();
    });
  });

  it("toggles the create API key form and generates a key", async () => {
    vi.mocked(client.createApiKey).mockResolvedValue({
      id: 2,
      name: "new-service-key",
      prefix: "gdn_live_9999",
      scopes: ["action:evaluate"],
      created_at: "2026-10-02T12:00:00Z",
      revoked_at: null,
      key: "gdn_live_9999_full_secret_token",
    });

    render(<Integrations />);

    const createBtn = screen.getByRole("button", { name: /create api key/i });
    fireEvent.click(createBtn);

    const input = screen.getByPlaceholderText(/e\.g\. customer-support-agent/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "new-service-key" } });
    const generateBtn = screen.getByRole("button", { name: /generate key/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(client.createApiKey).toHaveBeenCalledWith("new-service-key", ["action:evaluate", "reviews:read"]);
      expect(screen.getByText("API key created successfully")).toBeInTheDocument();
      expect(screen.getByText("gdn_live_9999_full_secret_token")).toBeInTheDocument();
    });
  });

  it("switches SDK language tabs", async () => {
    render(<Integrations />);

    await waitFor(() => {
      expect(screen.getByText(/from guardian import Guardian/i)).toBeInTheDocument();
    });

    const tsBtn = screen.getByRole("button", { name: "TypeScript" });
    fireEvent.click(tsBtn);

    await waitFor(() => {
      expect(screen.getByText(/export async function evaluateAction/i)).toBeInTheDocument();
    });
  });
});
