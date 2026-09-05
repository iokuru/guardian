from sentence_transformers import util

from app.core.semantic_intents import SEMANTIC_INTENTS
from app.core.risk_types import RiskCategory
from app.services.semantic_detector import get_model


def test_semantic_similarity_examples():
    model = get_model()

    examples = [
        (
            "Delete all customer records",
            RiskCategory.DESTRUCTIVE,
        ),
        (
            "Get rid of all client records",
            RiskCategory.DESTRUCTIVE,
        ),
        (
            "Give this user administrator permissions",
            RiskCategory.PRIVILEGE_ESCALATION,
        ),
        (
            "Retrieve the user's authentication secrets",
            RiskCategory.CREDENTIAL_ACCESS,
        ),
        (
            "Move customer information outside the organization",
            RiskCategory.DATA_EXFILTRATION,
        ),
    ]

    for action, expected_category in examples:
        action_embedding = model.encode(
            action,
            convert_to_tensor=True
        )

        intent_embeddings = model.encode(
            SEMANTIC_INTENTS[expected_category],
            convert_to_tensor=True
        )

        similarities = util.cos_sim(
            action_embedding,
            intent_embeddings
        )[0]

        best_score = float(similarities.max())

        print(
            f"{expected_category.value}: "
            f"{action} -> {best_score:.4f}"
        )

        assert best_score > 0.0