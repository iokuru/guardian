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
  agent_id?: string;
  environment?: string;
  request_id?: string;
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
  request_id?: string;
  analysis_id?: number;
  review_id?: number;
}

export interface AnalysisRecord {
  id: number;
  request_id?: string;
  workspace_id?: number;
  agent_id?: string;
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

export interface ReviewRecord {
  id: number;
  request_id: string;
  workspace_id?: number;
  analysis_id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  assigned_to?: number | null;
  reviewed_by?: number | null;
  resolution_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
  analysis?: {
    id: number;
    request_id: string;
    action: string;
    context: string;
    risk_score: number;
    risk_level: RiskLevel;
    policy_version: string;
    detector_version: string;
    semantic_model: string;
    created_at: string;
    findings: RiskFinding[];
  };
}

export interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface PolicyRecord {
  id: number;
  workspace_id?: number;
  environment: string;
  version: string;
  name: string;
  status: string;
  is_active: boolean;
  block_threshold: number;
  review_threshold: number;
  low_threshold: number;
  rules: { category: string; decision: string; reason: string }[];
  created_by: string;
  published_at: string;
  created_at: string;
}

export interface TimelineStage {
  stage: string;
  timestamp: string;
  title: string;
  description: string;
  actor: string;
  outcome?: string | null;
  metadata?: Record<string, any>;
}

export interface RequestTimeline {
  request_id: string;
  action: string;
  current_status: string;
  risk_score: number;
  risk_level: RiskLevel;
  policy_version: string;
  timeline: TimelineStage[];
}

export interface AgentRecord {
  id: number;
  workspace_id?: number;
  agent_id: string;
  name: string;
  description?: string | null;
  environment: string;
  status: string;
  created_at: string;
}

export interface ApiKeyRecord {
  id: number;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  revoked_at?: string | null;
  key?: string;
}

export interface AuditLogResponse {
  id: number;
  request_id?: string;
  workspace_id?: number;
  event_type?: string;
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
  | "reviews"
  | "audit"
  | "policies"
  | "risks"
  | "integrations"
  | "users"
  | "access"
  | "status"
  | "decisions"
  | "api"
  | "engine"
  | "models";
