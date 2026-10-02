import type { Decision, RiskLevel } from "../types/guardian";

interface DecisionBadgeProps {
  decision: Decision;
  size?: "sm" | "md" | "lg";
}

export function DecisionBadge({
  decision,
  size = "md",
}: DecisionBadgeProps) {
  const norm = (decision || "ALLOW").toUpperCase() as Decision;
  return (
    <span className={`decision-badge decision-${norm.toLowerCase()} size-${size}`}>
      <span className="decision-text">{norm}</span>
    </span>
  );
}

interface RiskBadgeProps {
  level: RiskLevel;
  size?: "sm" | "md";
}

export function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  const norm = (level || "LOW").toUpperCase() as RiskLevel;
  return (
    <span className={`risk-badge risk-${norm.toLowerCase()} size-${size}`}>
      {norm}
    </span>
  );
}

interface RiskScoreMeterProps {
  score: number;
  level?: RiskLevel;
  showBar?: boolean;
  size?: "sm" | "md";
}

export function RiskScoreMeter({
  score,
  level,
  showBar = true,
  size = "md",
}: RiskScoreMeterProps) {
  const clamped = Math.max(0, Math.min(1, typeof score === "number" ? score : 0));
  const percent = Math.round(clamped * 100);

  const derivedLevel =
    level ||
    (clamped >= 0.75
      ? "CRITICAL"
      : clamped >= 0.6
      ? "HIGH"
      : clamped >= 0.3
      ? "MEDIUM"
      : "LOW");

  return (
    <div className={`risk-meter size-${size}`}>
      <div className="risk-meter-header">
        <span className="risk-score-num">{clamped.toFixed(2)}</span>
        <span className={`risk-level-tag risk-${derivedLevel.toLowerCase()}`}>
          {derivedLevel}
        </span>
      </div>
      {showBar && (
        <div className="risk-meter-track" title={`Risk Score: ${percent}%`}>
          <div
            className={`risk-meter-fill risk-${derivedLevel.toLowerCase()}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
