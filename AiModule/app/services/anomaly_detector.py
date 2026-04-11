"""
Anomaly Detection Service.

Two methods implemented:
  1. Z-Score: flags individual feature values > threshold std deviations from mean
  2. Isolation Forest: ML-based multivariate anomaly detection

Z-Score is simple and interpretable — good for explaining WHY a value is anomalous.
Isolation Forest captures complex interactions between features that Z-Score misses.

Both are used: Z-Score for per-feature explanations, IsolationForest for overall verdict.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from app.core.config import ANOMALY_ZSCORE_THRESHOLD, FEATURE_COLUMNS, RANDOM_STATE
from app.utils.preprocessing import input_dict_to_dataframe, prepare_features, load_scaler, scale_features


def detect_zscore_anomalies(financial_data: dict, dataset: pd.DataFrame = None) -> list[dict]:
    """
    Flag features where the input value is > THRESHOLD standard deviations
    from the dataset mean.

    Returns a list of anomalous features with their z-scores.
    """
    # Load dataset stats for comparison
    if dataset is None:
        from app.services.training_pipeline import load_dataset
        dataset = load_dataset()

    df_input = input_dict_to_dataframe(financial_data)
    X_input = prepare_features(df_input)
    X_dataset = prepare_features(dataset)

    means = X_dataset.mean()
    stds = X_dataset.std().replace(0, np.nan)

    anomalies = []
    for col in FEATURE_COLUMNS:
        val = float(X_input[col].iloc[0])
        z = abs((val - means[col]) / stds[col]) if pd.notna(stds[col]) else 0
        if z > ANOMALY_ZSCORE_THRESHOLD:
            direction = "above" if val > means[col] else "below"
            anomalies.append({
                "feature": col,
                "value": round(val, 4),
                "mean": round(float(means[col]), 4),
                "std": round(float(stds[col]), 4),
                "z_score": round(float(z), 2),
                "direction": direction,
                "severity": "high" if z > 3.5 else "moderate",
            })

    return sorted(anomalies, key=lambda x: -x["z_score"])


def detect_isolation_forest(financial_data: dict, dataset: pd.DataFrame = None) -> dict:
    """
    Use Isolation Forest to determine if the input is an overall anomaly.

    Isolation Forest works by randomly partitioning data — anomalies are
    isolated in fewer splits (shorter path length in the tree).

    Returns is_anomaly flag + anomaly_score (-1 to 0 = anomaly, 0 to 1 = normal).
    """
    if dataset is None:
        from app.services.training_pipeline import load_dataset
        dataset = load_dataset()

    X_dataset = prepare_features(dataset)
    df_input = input_dict_to_dataframe(financial_data)
    X_input = prepare_features(df_input)

    scaler = load_scaler()
    X_train_scaled = scale_features(X_dataset, scaler)
    X_input_scaled = scale_features(X_input, scaler)

    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.05,  # expect ~5% anomalies (matches our dataset)
        random_state=RANDOM_STATE,
    )
    iso_forest.fit(X_train_scaled)

    prediction = iso_forest.predict(X_input_scaled)[0]  # 1 = normal, -1 = anomaly
    score = iso_forest.decision_function(X_input_scaled)[0]  # negative = more anomalous

    return {
        "is_anomaly": bool(prediction == -1),
        "anomaly_score": round(float(score), 4),
        "interpretation": "anomalous" if prediction == -1 else "normal",
    }


def full_anomaly_report(financial_data: dict) -> dict:
    """Combined anomaly detection using both methods."""
    from app.services.training_pipeline import load_dataset
    dataset = load_dataset()

    zscore_results = detect_zscore_anomalies(financial_data, dataset)
    iforest_result = detect_isolation_forest(financial_data, dataset)

    return {
        "overall_anomaly": iforest_result["is_anomaly"],
        "anomaly_score": iforest_result["anomaly_score"],
        "method_isolation_forest": iforest_result,
        "method_zscore": {
            "threshold": ANOMALY_ZSCORE_THRESHOLD,
            "anomalous_features": zscore_results,
            "count": len(zscore_results),
        },
    }
