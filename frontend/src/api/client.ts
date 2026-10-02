import type {
  AnalysisRecord,
  AnalysisRequest,
  AnalysisResponse,
  AnalysisStats,
  AuditLogResponse,
  HealthResponse,
  UserResponse,
} from "../types/guardian";

const API_BASE_URL = "http://127.0.0.1:8000";

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