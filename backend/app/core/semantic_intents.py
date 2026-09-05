from app.core.risk_types import RiskCategory


SEMANTIC_INTENTS = {
    RiskCategory.DESTRUCTIVE: [
        "delete data",
        "permanently remove data",
        "erase records",
        "destroy stored information",
        "purge existing records",
        "remove all customer records",
        "delete all records from a database",
    ],
    RiskCategory.PRIVILEGE_ESCALATION: [
        "give a user administrator privileges",
        "increase a user's access permissions",
        "grant administrator access",
        "escalate account privileges",
        "make a user an administrator",
        "give a user elevated permissions",
    ],
    RiskCategory.CREDENTIAL_ACCESS: [
        "retrieve passwords or credentials",
        "obtain authentication secrets",
        "access API keys or private keys",
        "extract authentication tokens",
        "retrieve account credentials",
        "obtain secret authentication information",
    ],
    RiskCategory.DATA_EXFILTRATION: [
        "send sensitive data outside the organization",
        "transfer customer information to an external system",
        "upload confidential records to a third party",
        "move a database outside the trusted environment",
        "send customer records to an external destination",
        "transfer sensitive information outside the organization",
    ],
}