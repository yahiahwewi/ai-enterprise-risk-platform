"""
CRUD operations for user feedback on AI predictions.

Feedback is essential for improving the model over time:
  - Users report whether predictions were accurate
  - Feedback data can augment the training dataset
  - Corrected scores become new training targets
"""

import json
import os
import uuid
from datetime import datetime
from app.core.config import FEEDBACK_DB_PATH


def _load_db() -> list[dict]:
    if not os.path.exists(FEEDBACK_DB_PATH):
        return []
    with open(FEEDBACK_DB_PATH, "r") as f:
        return json.load(f)


def _save_db(records: list[dict]):
    os.makedirs(os.path.dirname(FEEDBACK_DB_PATH), exist_ok=True)
    with open(FEEDBACK_DB_PATH, "w") as f:
        json.dump(records, f, indent=2, default=str)


def create_feedback(feedback: dict) -> dict:
    """Store new feedback."""
    records = _load_db()
    feedback["id"] = str(uuid.uuid4())
    feedback["timestamp"] = datetime.utcnow().isoformat()
    records.append(feedback)
    _save_db(records)
    return feedback


def get_all_feedback(limit: int = 50) -> list[dict]:
    """Get all feedback entries, newest first."""
    records = _load_db()
    records.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return records[:limit]


def get_feedback_stats() -> dict:
    """Compute feedback statistics for model monitoring."""
    records = _load_db()
    if not records:
        return {"total": 0, "avg_error": None, "outcomes": {}}

    errors = []
    outcomes = {}
    for r in records:
        if r.get("corrected_score") is not None:
            errors.append(abs(r["corrected_score"] - r["predicted_score"]))
        outcome = r.get("actual_outcome", "unknown")
        outcomes[outcome] = outcomes.get(outcome, 0) + 1

    return {
        "total": len(records),
        "with_corrections": len(errors),
        "avg_correction_error": round(sum(errors) / len(errors), 2) if errors else None,
        "outcomes": outcomes,
    }
