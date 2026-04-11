"""
Data preprocessing utilities.

Handles:
  - Missing value imputation (median for numerics)
  - Feature scaling (StandardScaler)
  - Feature engineering from raw financial inputs
  - Conversion of API input dicts into model-ready arrays
"""

import numpy as np
import pandas as pd
import joblib
import os
from sklearn.preprocessing import StandardScaler
from app.core.config import FEATURE_COLUMNS, SCALER_PATH


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute derived features from raw financial data.
    If a derived column already exists, it is overwritten.
    """
    df = df.copy()

    # Expense ratio = expenses / revenue
    if "expense_ratio" not in df.columns or df["expense_ratio"].isna().all():
        df["expense_ratio"] = (df["expenses"] / df["revenue"].replace(0, np.nan)).fillna(0)

    # Net margin = (revenue - expenses) / revenue
    if "net_margin" not in df.columns or df["net_margin"].isna().all():
        df["net_margin"] = ((df["revenue"] - df["expenses"]) / df["revenue"].replace(0, np.nan)).fillna(0)

    # Cash flow (if missing)
    if "cash_flow" not in df.columns:
        df["cash_flow"] = df["revenue"] - df["expenses"]

    # Invoices overdue ratio (if missing)
    if "invoices_overdue_ratio" not in df.columns:
        df["invoices_overdue_ratio"] = (
            df["invoices_overdue"] / df["revenue"].replace(0, np.nan)
        ).fillna(0)

    # Loan burden default
    if "loan_burden" not in df.columns:
        df["loan_burden"] = 0.0

    return df


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract and order the feature columns expected by the model."""
    df = engineer_features(df)
    # Fill any remaining NaN with 0
    return df[FEATURE_COLUMNS].fillna(0)


def fit_scaler(X: pd.DataFrame) -> StandardScaler:
    """Fit a StandardScaler on training data and persist it."""
    scaler = StandardScaler()
    scaler.fit(X)
    os.makedirs(os.path.dirname(SCALER_PATH), exist_ok=True)
    joblib.dump(scaler, SCALER_PATH)
    return scaler


def load_scaler() -> StandardScaler:
    """Load the persisted scaler (raises if not trained yet)."""
    if not os.path.exists(SCALER_PATH):
        raise FileNotFoundError(f"Scaler not found at {SCALER_PATH}. Run training first.")
    return joblib.load(SCALER_PATH)


def scale_features(X: pd.DataFrame, scaler: StandardScaler = None) -> np.ndarray:
    """Apply StandardScaler to feature DataFrame."""
    if scaler is None:
        scaler = load_scaler()
    return scaler.transform(X)


def input_dict_to_dataframe(data: dict) -> pd.DataFrame:
    """
    Convert a single API input dict into a 1-row DataFrame
    ready for feature engineering and prediction.
    """
    df = pd.DataFrame([data])
    df = engineer_features(df)
    return df
