from app.core.risk_types import RiskCategory


SEMANTIC_INTENTS = {
    RiskCategory.DESTRUCTIVE: [
        "delete or permanently remove data",
        "erase records or information",
        "destroy stored data",
        "purge existing records",
    ],
    RiskCategory.PRIVILEGE_ESCALATION: [
        "give a user elevated administrative privileges",
        "increase a user's access permissions",
        "grant administrator level access",
        "escalate account privileges",
    ],
    RiskCategory.CREDENTIAL_ACCESS: [
        "retrieve passwords or credentials",
        "obtain authentication secrets",
        "access API keys or private keys",
        "extract authentication tokens",
    ],
    RiskCategory.DATA_EXFILTRATION: [
        "send sensitive data outside the organization",
        "transfer customer information to an external system",
        "upload confidential records to a third party",
        "move a database outside the trusted environment",
    ],
}