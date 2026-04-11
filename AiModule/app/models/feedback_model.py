"""
Pydantic models for the feedback system.

Feedback allows users to tell the AI whether its prediction was correct.
This creates a feedback loop for future model improvement.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class FeedbackInput(BaseModel):
    """User feedback on an AI prediction."""
    prediction_id: Optional[str] = Field(None, description="ID of the prediction being reviewed")
    predicted_score: float = Field(..., ge=0, le=100, description="What the AI predicted")
    actual_outcome: str = Field(..., description="What actually happened (e.g. 'no_default', 'late_payments', 'default')")
    corrected_score: Optional[float] = Field(None, ge=0, le=100, description="What the user thinks the score should have been")
    comment: Optional[str] = Field(None, description="Free-text feedback")
    user_id: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "predicted_score": 65.5,
                "actual_outcome": "late_payments",
                "corrected_score": 72.0,
                "comment": "Risk was actually higher due to a major client going bankrupt",
            }
        }


class FeedbackRecord(BaseModel):
    """Stored feedback entry."""
    id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    prediction_id: Optional[str] = None
    predicted_score: float
    actual_outcome: str
    corrected_score: Optional[float] = None
    comment: Optional[str] = None
    user_id: Optional[str] = None
