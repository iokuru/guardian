from sentence_transformers import SentenceTransformer, util

from app.core.risk_scores import (
    CREDENTIAL_SCORE,
    DESTRUCTIVE_SCORE,
    EXFILTRATION_SCORE,
    PRIVILEGE_SCORE,
)
from app.core.risk_types import FindingSource
from app.core.semantic_config import (
    SEMANTIC_MODEL_NAME,
    SEMANTIC_THRESHOLD,
)
from app.core.semantic_intents import SEMANTIC_INTENTS
from app.schemas.risk import RiskFinding

_model = None
_intent_embeddings = None


INTENT_SCORES = {
    "DESTRUCTIVE": DESTRUCTIVE_SCORE,
    "PRIVILEGE_ESCALATION": PRIVILEGE_SCORE,
    "CREDENTIAL_ACCESS": CREDENTIAL_SCORE,
    "DATA_EXFILTRATION": EXFILTRATION_SCORE,
}


def get_model():
    global _model

    if _model is None:
        _model = SentenceTransformer(SEMANTIC_MODEL_NAME)

    return _model


def get_intent_embeddings(model):
    global _intent_embeddings

    if _intent_embeddings is None:
        _intent_embeddings = {
            category: model.encode(
                intents,
                convert_to_tensor=True,
            )
            for category, intents in SEMANTIC_INTENTS.items()
        }

    return _intent_embeddings


def detect_semantic_findings(
    action: str,
    context: str,
) -> list[RiskFinding]:
    model = get_model()

    action_embedding = model.encode(
        action,
        convert_to_tensor=True,
    )

    intent_embeddings = get_intent_embeddings(model)

    findings = []

    for category, embeddings in intent_embeddings.items():
        similarities = util.cos_sim(
            action_embedding,
            embeddings,
        )[0]

        best_score = float(similarities.max())

        if best_score >= SEMANTIC_THRESHOLD:
            findings.append(
                RiskFinding(
                    category=category,
                    score=INTENT_SCORES[category.value],
                    reason=f"Semantic {category.value.lower().replace('_', ' ')} detected",
                    source=FindingSource.MODEL,
                )
            )

    return findings