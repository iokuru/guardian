export type Decision = "ALLOW" | "REVIEW" | "BLOCK";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FindingSource = "ACTION" | "CONTEXT" | "SCOPE" | "MODEL";

export type RiskCategory =
  | "DESTRUCTIVE"
  | "PRIVILEGE_ESCALATION"
  | "CREDENTIAL_ACCESS"
  | "DATA_EXFILTRATION"
  | "PRODUCTION"
  | "CUSTOMER_DATA"
  | "FINANCIAL_DATA"
  | "EMPLOYEE_DATA"
  | "DATABASE"
  | "TEMPORARY_FILES";

export interface RiskFinding {
  category: RiskCategory | string;
  severity?: RiskLevel | null;
  score: number;
  reason: string;
  source: FindingSource;
}

export interface AnalysisRequest {
  action: string;
  context: string;
}

export interface AnalysisResponse {
  decision: Decision;
  risk_score: number;
  risk_level: RiskLevel;
  decision_reason: string;
  risk_categories: (RiskCategory | string)[];
  reasons: string[];
  scopes: (RiskCategory | string)[];
  findings: RiskFinding[];
  policy_version: string;
  detector_version: string;
  semantic_model: string;
}

export interface AnalysisRecord {
  id: number;
  action: string;
  context: string;
  decision: Decision;
  risk_score: number;
  risk_level: RiskLevel;
  decision_reason?: string;
  policy_version: string;
  detector_version: string;
  semantic_model: string;
  created_at: string;
  findings?: RiskFinding[];
}

export interface AnalysisStats {
  total: number;
  allow: number;
  review: number;
  block: number;
}

export interface AuditLogResponse {
  id: number;
  user_id: number;
  analysis_id: number;
  action: string;
  decision: Decision;
  risk_score: number;
  risk_level: RiskLevel;
  policy_version: string;
  detector_version: string;
  semantic_model: string;
  created_at: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface HealthResponse {
  status: string;
}

export type RouteId =
  | "overview"
  | "analyze"
  | "decisions"
  | "audit"
  | "policies"
  | "risks"
  | "engine"
  | "models"
  | "api";
