from app.schemas.risk import RiskFinding


def detect_semantic_findings(
    action: str,
    context: str
) -> list[RiskFinding]:
    return []