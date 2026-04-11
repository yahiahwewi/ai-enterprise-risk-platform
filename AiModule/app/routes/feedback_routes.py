"""
Feedback routes for model improvement.

Endpoints:
  POST /ai/feedback       — Submit feedback on a prediction
  GET  /ai/feedback       — Retrieve all feedback
  GET  /ai/feedback/stats — Feedback statistics for model monitoring
"""

from fastapi import APIRouter, Query
from app.models.feedback_model import FeedbackInput
from app.crud.feedback_crud import create_feedback, get_all_feedback, get_feedback_stats

router = APIRouter(prefix="/ai", tags=["Feedback"])


@router.post("/feedback")
def submit_feedback(data: FeedbackInput):
    """
    Submit feedback on an AI prediction.

    Users can indicate:
      - What the AI predicted (predicted_score)
      - What actually happened (actual_outcome)
      - What the score should have been (corrected_score)
      - Free-text comments

    This data is stored and can be used to retrain the model.
    """
    record = create_feedback(data.model_dump())
    return {"message": "Feedback recorded", "feedback": record}


@router.get("/feedback")
def list_feedback(limit: int = Query(50, ge=1, le=200)):
    """Retrieve all feedback entries, newest first."""
    return get_all_feedback(limit)


@router.get("/feedback/stats")
def feedback_statistics():
    """
    Get aggregated feedback statistics.

    Shows total feedback count, average correction error,
    and outcome distribution — useful for monitoring model drift.
    """
    return get_feedback_stats()
