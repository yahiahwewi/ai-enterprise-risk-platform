"""
Configuration for the AiModule microservice.
All paths and hyperparameters are centralized here.
"""
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Paths
DATASET_PATH = os.path.join(BASE_DIR, "data", "sample_dataset.csv")
MODEL_PATH = os.path.join(BASE_DIR, "ml", "trained_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "ml", "scaler.pkl")
RESULTS_DB_PATH = os.path.join(BASE_DIR, "data", "ai_results.json")
FEEDBACK_DB_PATH = os.path.join(BASE_DIR, "data", "feedback.json")

# ML hyperparameters
RANDOM_STATE = 42
TEST_SIZE = 0.2
N_ESTIMATORS = 200
MAX_DEPTH = 12

# Feature columns used by the model (order matters)
FEATURE_COLUMNS = [
    "revenue",
    "expenses",
    "cash_flow",
    "invoices_overdue",
    "invoices_overdue_ratio",
    "debt_ratio",
    "growth_rate",
    "expense_ratio",
    "net_margin",
    "loan_burden",
]

# Risk thresholds
RISK_THRESHOLDS = {
    "low": (0, 25),
    "moderate": (25, 50),
    "high": (50, 75),
    "critical": (75, 100),
}

# Anomaly detection
ANOMALY_ZSCORE_THRESHOLD = 2.5

# Dataset generation
DATASET_SIZE = 1500
