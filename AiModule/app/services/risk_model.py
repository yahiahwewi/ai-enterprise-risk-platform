"""
ML-based Risk Scoring Service.

Uses the trained GradientBoostingRegressor to predict a risk score (0-100)
and derive a risk category + confidence estimate.

Confidence is estimated by running the input through all individual trees
in the ensemble and measuring the agreement (low variance = high confidence).
"""

import numpy as np
import joblib
import os

from app.core.config import MODEL_PATH, FEATURE_COLUMNS
from app.utils.preprocessing import input_dict_to_dataframe, prepare_features, load_scaler, scale_features
from app.utils.metrics import score_to_category


def _load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Run training first (POST /ai/train).")
    return joblib.load(MODEL_PATH)


def predict_risk(financial_data: dict) -> dict:
    """
    Predict risk from raw financial inputs.

    Input dict keys:
      revenue, expenses, cash_flow (optional), invoices_overdue,
      debt_ratio, growth_rate, loan_burden (optional)

    Returns:
      score (0-100), category, confidence (0-100), feature_contributions
    """
    model = _load_model()
    scaler = load_scaler()

    # Prepare input
    df = input_dict_to_dataframe(financial_data)
    X = prepare_features(df)
    X_scaled = scale_features(X, scaler)

    # Predict score
    raw_score = model.predict(X_scaled)[0]
    score = float(np.clip(raw_score, 0, 100))
    category = score_to_category(score)

    # Estimate confidence via individual tree predictions
    # GradientBoosting stores staged predictions; we approximate
    # confidence by looking at how the prediction compares to training range
    tree_predictions = []
    staged = model.staged_predict(X_scaled)
    for stage_pred in staged:
        tree_predictions.append(float(np.clip(stage_pred[0], 0, 100)))

    # Confidence: inverse of how much the prediction changed in last 20% of boosting stages
    last_n = max(1, len(tree_predictions) // 5)
    late_variance = np.std(tree_predictions[-last_n:])
    confidence = float(np.clip(100 - late_variance * 10, 40, 99))

    # Feature contributions (global importance as proxy for this prediction)
    importances = dict(zip(FEATURE_COLUMNS, model.feature_importances_.round(4)))

    return {
        "risk_score": round(score, 2),
        "risk_category": category,
        "confidence": round(confidence, 1),
        "feature_contributions": importances,
        "input_features": {col: float(X[col].iloc[0]) for col in FEATURE_COLUMNS},
    }


def predict_batch(data_list: list[dict]) -> list[dict]:
    """Predict risk for multiple companies at once."""
    return [predict_risk(d) for d in data_list]
