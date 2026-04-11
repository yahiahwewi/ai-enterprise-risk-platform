"""
Explanation Engine.

Makes AI predictions interpretable by providing:
  1. Feature importance ranking (from the trained model)
  2. Per-feature contribution direction (why each feature pushes risk up or down)
  3. Human-readable explanation text

This is critical for trust — business users need to understand WHY
the AI gave a certain score, not just WHAT the score is.
"""

import numpy as np
import joblib

from app.core.config import MODEL_PATH, FEATURE_COLUMNS
from app.utils.metrics import score_to_category


# Human-friendly feature descriptions
FEATURE_DESCRIPTIONS = {
    "revenue": "Total revenue",
    "expenses": "Total expenses",
    "cash_flow": "Net cash flow (revenue minus expenses)",
    "invoices_overdue": "Dollar amount of overdue invoices",
    "invoices_overdue_ratio": "Percentage of invoiced revenue that is overdue",
    "debt_ratio": "Total debt relative to assets",
    "growth_rate": "Revenue growth rate",
    "expense_ratio": "Expenses as a percentage of revenue",
    "net_margin": "Net profit margin",
    "loan_burden": "Monthly loan payments as share of income",
}

# Thresholds that define "healthy" vs "risky" for each feature
HEALTHY_RANGES = {
    "expense_ratio": (0, 0.8),
    "net_margin": (0.1, 1.0),
    "debt_ratio": (0, 0.5),
    "invoices_overdue_ratio": (0, 0.15),
    "growth_rate": (0, 1.0),
    "loan_burden": (0, 0.2),
    "cash_flow": (0, float("inf")),
}


def explain_prediction(risk_result: dict) -> dict:
    """
    Generate a full explanation for a risk prediction.

    Takes the output of risk_model.predict_risk() and produces
    human-readable explanations.
    """
    score = risk_result["risk_score"]
    category = risk_result["risk_category"]
    features = risk_result.get("input_features", {})
    importances = risk_result.get("feature_contributions", {})

    # Sort features by importance
    sorted_features = sorted(importances.items(), key=lambda x: -x[1])

    # Generate per-feature explanations
    feature_explanations = []
    for feat, importance in sorted_features:
        val = features.get(feat, 0)
        desc = FEATURE_DESCRIPTIONS.get(feat, feat)
        healthy = HEALTHY_RANGES.get(feat)

        # Determine if this feature pushes risk UP or DOWN
        if healthy:
            lo, hi = healthy
            if val < lo:
                effect = "increases_risk"
                reason = f"Below healthy range ({lo})"
            elif val > hi:
                effect = "increases_risk"
                reason = f"Above healthy range ({hi})"
            else:
                effect = "decreases_risk"
                reason = "Within healthy range"
        else:
            effect = "neutral"
            reason = "Contextual"

        feature_explanations.append({
            "feature": feat,
            "description": desc,
            "value": round(val, 4),
            "importance": round(importance, 4),
            "effect": effect,
            "reason": reason,
        })

    # Generate narrative
    risk_drivers = [f for f in feature_explanations if f["effect"] == "increases_risk"]
    protective = [f for f in feature_explanations if f["effect"] == "decreases_risk"]

    narrative_parts = []
    narrative_parts.append(
        f"The AI model predicts a risk score of {score}/100 ({category} risk) "
        f"with {risk_result.get('confidence', 'N/A')}% confidence."
    )

    if risk_drivers:
        top_drivers = risk_drivers[:3]
        driver_texts = [
            f"{d['description']} ({d['value']:.4g})" for d in top_drivers
        ]
        narrative_parts.append(
            f"Key risk drivers: {'; '.join(driver_texts)}."
        )

    if protective:
        top_protective = protective[:2]
        prot_texts = [
            f"{p['description']} ({p['value']:.4g})" for p in top_protective
        ]
        narrative_parts.append(
            f"Positive factors: {'; '.join(prot_texts)}."
        )

    return {
        "risk_score": score,
        "risk_category": category,
        "model_type": "GradientBoostingRegressor",
        "total_features": len(FEATURE_COLUMNS),
        "feature_explanations": feature_explanations,
        "narrative": " ".join(narrative_parts),
        "risk_drivers_count": len(risk_drivers),
        "protective_factors_count": len(protective),
    }
