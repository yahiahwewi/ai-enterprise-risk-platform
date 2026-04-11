"""
Evaluation metrics for model performance reporting.

Used by the training pipeline to print a human-readable report
and by the /ai/train endpoint to return evaluation results.
"""

import numpy as np
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    accuracy_score,
    classification_report,
)


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """Compute standard regression metrics for the risk score predictor."""
    return {
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
        "r2": round(float(r2_score(y_true, y_pred)), 4),
        "max_error": round(float(np.max(np.abs(y_true - y_pred))), 4),
        "median_error": round(float(np.median(np.abs(y_true - y_pred))), 4),
    }


def classification_metrics(y_true: np.ndarray, y_pred: np.ndarray, labels=None) -> dict:
    """Compute classification metrics for risk category prediction."""
    report = classification_report(y_true, y_pred, labels=labels, output_dict=True, zero_division=0)
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "per_class": {
            k: {m: round(v, 4) for m, v in vals.items()}
            for k, vals in report.items()
            if k not in ("accuracy", "macro avg", "weighted avg")
        },
        "macro_avg": {m: round(v, 4) for m, v in report.get("macro avg", {}).items()},
    }


def score_to_category(score: float) -> str:
    """Map a 0-100 risk score to a human-readable category."""
    if score < 25:
        return "low"
    elif score < 50:
        return "moderate"
    elif score < 75:
        return "high"
    else:
        return "critical"
