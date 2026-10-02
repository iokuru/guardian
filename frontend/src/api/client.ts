import type {
  AnalysisRecord,
  AnalysisRequest,
  AnalysisResponse,
  AnalysisStats,
  AuditLogResponse,
  HealthResponse,
  UserResponse,
  ReviewRecord,
  ReviewStats,
  PolicyRecord,
  RequestTimeline,
  AgentRecord,
  ApiKeyRecord,
} from "../types/guardian";

const API_BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

interface ApiValidationError {
  msg?: string;
  [key: string]: unknown;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("guardian_token");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const errorMsg =
      typeof data.detail === "string"
        ? data.detail
        : Array.isArray(data.detail)
        ? (data.detail as ApiValidationError[]).map((e) => e.msg || JSON.stringify(e)).join(", ")
        : `Request failed: ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export async function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}

export async function getAnalysisStats(): Promise<AnalysisStats> {
  return apiRequest<AnalysisStats>("/analyses/stats");
}

export async function getAnalyses(
  limit: number = 50,
  offset: number = 0,
): Promise<AnalysisRecord[]> {
  return apiRequest<AnalysisRecord[]>(`/analyses?limit=${limit}&offset=${offset}`);
}

export async function getAnalysis(id: number): Promise<AnalysisRecord> {
  return apiRequest<AnalysisRecord>(`/analyses/${id}`);
}

export async function analyzeAction(
  request: AnalysisRequest,
): Promise<AnalysisResponse> {
  return apiRequest<AnalysisResponse>("/analyze", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getAuditLogs(
  limit: number = 50,
  decision?: string,
  riskLevel?: string,
): Promise<AuditLogResponse[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (decision && decision !== "ALL") {
    params.set("decision", decision);
  }
  if (riskLevel && riskLevel !== "ALL") {
    params.set("risk_level", riskLevel);
  }
  return apiRequest<AuditLogResponse[]>(`/audit-logs?${params.toString()}`);
}

export async function getCurrentUser(): Promise<UserResponse> {
  return apiRequest<UserResponse>("/auth/me");
}

export async function listUsers(): Promise<UserResponse[]> {
  return apiRequest<UserResponse[]>("/auth/users");
}

export async function getReviews(status?: string): Promise<ReviewRecord[]> {
  const query = status ? `?status=${status}` : "";
  return apiRequest<ReviewRecord[]>(`/reviews${query}`);
}

export async function getReviewStats(): Promise<ReviewStats> {
  return apiRequest<ReviewStats>("/reviews/stats");
}

export async function approveReview(
  reviewId: number,
  notes: string = "",
  reviewerName: string = "Krishna",
): Promise<ReviewRecord> {
  return apiRequest<ReviewRecord>(`/reviews/${reviewId}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes, reviewer_name: reviewerName }),
  });
}

export async function rejectReview(
  reviewId: number,
  notes: string = "",
  reviewerName: string = "Krishna",
): Promise<ReviewRecord> {
  return apiRequest<ReviewRecord>(`/reviews/${reviewId}/reject`, {
    method: "POST",
    body: JSON.stringify({ notes, reviewer_name: reviewerName }),
  });
}

export async function getPolicies(): Promise<PolicyRecord[]> {
  return apiRequest<PolicyRecord[]>("/policies");
}

export async function getActivePolicy(environment: string = "Production"): Promise<PolicyRecord> {
  return apiRequest<PolicyRecord>(`/policies/active?environment=${environment}`);
}

export async function createPolicy(policy: {
  environment: string;
  version: string;
  name: string;
  block_threshold?: number;
  review_threshold?: number;
  low_threshold?: number;
  rules?: { category: string; decision: string; reason: string }[];
}): Promise<PolicyRecord> {
  return apiRequest<PolicyRecord>("/policies", {
    method: "POST",
    body: JSON.stringify(policy),
  });
}

export async function activatePolicy(policyId: number): Promise<PolicyRecord> {
  return apiRequest<PolicyRecord>(`/policies/${policyId}/activate`, {
    method: "POST",
  });
}

export async function getRequestTimeline(requestId: string): Promise<RequestTimeline> {
  return apiRequest<RequestTimeline>(`/audit/requests/${requestId}`);
}

export async function getAgents(): Promise<AgentRecord[]> {
  return apiRequest<AgentRecord[]>("/agents");
}

export async function getApiKeys(): Promise<ApiKeyRecord[]> {
  return apiRequest<ApiKeyRecord[]>("/integrations/keys");
}

export async function createApiKey(name: string, scopes: string[] = ["action:evaluate"]): Promise<ApiKeyRecord> {
  return apiRequest<ApiKeyRecord>("/integrations/keys", {
    method: "POST",
    body: JSON.stringify({ name, scopes }),
  });
}

export async function revokeApiKey(keyId: number): Promise<void> {
  return apiRequest<void>(`/integrations/keys/${keyId}`, {
    method: "DELETE",
  });
}

export async function getIntegrationSnippets(): Promise<{
  api_endpoint: string;
  api_key_sample: string;
  snippets: { language: string; filename: string; code: string }[];
}> {
  return apiRequest("/integrations/snippets");
}