def get_policy_decision(score: float):
    if score >= 0.80:
        return "BLOCK", "CRITICAL"

    if score >= 0.50:
        return "REVIEW", "HIGH"

    if score >= 0.20:
        return "ALLOW", "MEDIUM"

    return "ALLOW", "LOW"