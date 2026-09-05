from sentence_transformers import SentenceTransformer, util

from app.core.semantic_config import (
    SEMANTIC_MODEL_NAME,
    SEMANTIC_THRESHOLD,
)
from app.core.semantic_intents import SEMANTIC_INTENTS
from app.core.risk_scores import (
    DESTRUCTIVE_SCORE,
    PRIVILEGE_SCORE,
    CREDENTIAL_SCORE,
    EXFILTRATION_SCORE,
)
from app.core.risk_types import FindingSource
from app.schemas.risk import RiskFinding


model = SentenceTransformer(SEMANTIC_MODEL_NAME)

INTENT_SCORES = {
    "DESTRUCTIVE": DESTRUCTIVE_SCORE,
    "PRIVILEGE_ESCALATION": PRIVILEGE_SCORE,
    "CREDENTIAL_ACCESS": CREDENTIAL_SCORE,
    "DATA_EXFILTRATION": EXFILTRATION_SCORE,
}


def detect_semantic_findings(
    action: str,
    context: str
) -> list[RiskFinding]:

    action_embedding = model.encode(
        action,
        convert_to_tensor=True
    )

    findings = []

    for category, intents in SEMANTIC_INTENTS.items():
        intent_embeddings = model.encode(
            intents,
            convert_to_tensor=True
        )

        similarities = util.cos_sim(
            action_embedding,
            intent_embeddings
        )[0]

        best_score = float(similarities.max())

        if best_score >= SEMANTIC_THRESHOLD:
            findings.append(
                RiskFinding(
                    category=category,
                    score=INTENT_SCORES[category.value],
                    reason=f"Semantic {category.value.lower().replace('_', ' ')} detected",
                    source=FindingSource.MODEL
                )
            )

    return findings