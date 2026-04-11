"""
Full ML Training Pipeline.

Steps:
  1. Load or generate dataset
  2. Feature engineering (preprocessing.py)
  3. Train/test split (80/20)
  4. Fit StandardScaler on training set
  5. Train a GradientBoostingRegressor (predicts risk_score 0-100)
  6. Evaluate on test set (regression + classification metrics)
  7. Persist model and scaler as .pkl files

Why GradientBoosting?
  - Handles non-linear relationships in financial data
  - Robust to outliers (important — we injected anomalies)
  - Built-in feature importance for explainability
  - Better generalisation than RandomForest on structured tabular data
  - No need for feature normalisation internally (trees don't need it),
    but we scale anyway so the scaler is available for anomaly detection
"""

import os
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor

from app.core.config import (
    DATASET_PATH, MODEL_PATH, SCALER_PATH,
    RANDOM_STATE, TEST_SIZE, N_ESTIMATORS, MAX_DEPTH, FEATURE_COLUMNS,
)
from app.utils.preprocessing import prepare_features, fit_scaler, scale_features
from app.utils.metrics import regression_metrics, classification_metrics, score_to_category
from app.data.dataset_generator import generate_dataset, save_dataset


def load_dataset() -> pd.DataFrame:
    """Load CSV dataset, or generate it if missing."""
    if not os.path.exists(DATASET_PATH):
        print("Dataset not found — generating synthetic dataset...")
        df = generate_dataset()
        save_dataset(df)
        return df
    return pd.read_csv(DATASET_PATH)


def train_model() -> dict:
    """
    Execute the full training pipeline. Returns evaluation metrics.

    This function is called:
      - Once at startup (if model doesn't exist)
      - On-demand via POST /ai/train
    """
    print("=" * 60)
    print("  TRAINING PIPELINE START")
    print("=" * 60)

    # 1. Load data
    df = load_dataset()
    print(f"Loaded dataset: {len(df)} rows, {len(df.columns)} columns")

    # 2. Feature engineering
    X = prepare_features(df)
    y = df["risk_score"].values
    print(f"Features prepared: {list(X.columns)}")

    # 3. Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )
    print(f"Split: {len(X_train)} train, {len(X_test)} test")

    # 4. Fit scaler on training data
    scaler = fit_scaler(X_train)
    X_train_scaled = scale_features(X_train, scaler)
    X_test_scaled = scale_features(X_test, scaler)
    print(f"Scaler fitted and saved to {SCALER_PATH}")

    # 5. Train model
    model = GradientBoostingRegressor(
        n_estimators=N_ESTIMATORS,
        max_depth=MAX_DEPTH,
        learning_rate=0.1,
        subsample=0.8,
        random_state=RANDOM_STATE,
        loss="squared_error",
    )
    model.fit(X_train_scaled, y_train)
    print(f"Model trained: GradientBoostingRegressor ({N_ESTIMATORS} trees, depth {MAX_DEPTH})")

    # 6. Evaluate
    y_pred = np.clip(model.predict(X_test_scaled), 0, 100)

    reg_metrics = regression_metrics(y_test, y_pred)
    print(f"\nRegression metrics:")
    for k, v in reg_metrics.items():
        print(f"  {k}: {v}")

    # Classification evaluation (risk categories)
    y_true_cat = [score_to_category(s) for s in y_test]
    y_pred_cat = [score_to_category(s) for s in y_pred]
    cls_metrics = classification_metrics(
        y_true_cat, y_pred_cat,
        labels=["low", "moderate", "high", "critical"]
    )
    print(f"\nClassification accuracy: {cls_metrics['accuracy']}")

    # Feature importance
    importance = dict(zip(FEATURE_COLUMNS, model.feature_importances_.round(4)))
    importance_sorted = dict(sorted(importance.items(), key=lambda x: -x[1]))
    print(f"\nFeature importance:")
    for feat, imp in importance_sorted.items():
        bar = "#" * int(imp * 50)
        print(f"  {feat:30s} {imp:.4f} {bar}")

    # 7. Save model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")

    print("=" * 60)
    print("  TRAINING PIPELINE COMPLETE")
    print("=" * 60)

    return {
        "status": "success",
        "dataset_size": len(df),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "model": "GradientBoostingRegressor",
        "hyperparameters": {
            "n_estimators": N_ESTIMATORS,
            "max_depth": MAX_DEPTH,
            "learning_rate": 0.1,
        },
        "regression_metrics": reg_metrics,
        "classification_metrics": cls_metrics,
        "feature_importance": importance_sorted,
    }


if __name__ == "__main__":
    result = train_model()
    print("\nTraining result:", result["status"])
