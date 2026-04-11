"""
Synthetic Dataset Generator for Enterprise Risk Management.

Generates realistic financial company data with engineered noise,
anomalies, and balanced risk distribution for ML training.

Logic:
  1. Sample base revenue from a log-normal distribution (realistic company sizes)
  2. Derive expenses, cash_flow, debt, invoices from revenue with controlled noise
  3. Compute a deterministic "ground truth" risk_score from financial ratios
  4. Inject ~5% anomaly rows (extreme values) so the model learns edge cases
  5. Add Gaussian noise to the target so the model generalises (not memorises rules)
"""

import numpy as np
import pandas as pd
import os
from app.core.config import DATASET_PATH, DATASET_SIZE, RANDOM_STATE


def generate_dataset(n_samples: int = DATASET_SIZE, seed: int = RANDOM_STATE) -> pd.DataFrame:
    rng = np.random.RandomState(seed)

    # ── Base financials ─────────────────────────────────
    # Log-normal revenue: median ~$500K, range $50K–$5M
    revenue = rng.lognormal(mean=13.0, sigma=0.8, size=n_samples)
    revenue = np.clip(revenue, 50_000, 10_000_000).round(2)

    # Expenses: 50-120% of revenue (some companies lose money)
    expense_ratio = rng.uniform(0.45, 1.25, size=n_samples)
    expenses = (revenue * expense_ratio).round(2)

    cash_flow = revenue - expenses

    # Invoices overdue: 0-40% of revenue
    invoices_overdue_ratio = rng.beta(2, 5, size=n_samples)  # Skewed low (most ~20%)
    invoices_overdue = (revenue * invoices_overdue_ratio).round(2)

    # Debt ratio: 0.0-2.5 (debt / assets proxy)
    debt_ratio = rng.exponential(0.4, size=n_samples)
    debt_ratio = np.clip(debt_ratio, 0.0, 3.0).round(4)

    # Growth rate: -30% to +50%
    growth_rate = rng.normal(0.05, 0.15, size=n_samples)
    growth_rate = np.clip(growth_rate, -0.5, 0.8).round(4)

    # Loan burden: monthly payments as fraction of monthly revenue
    loan_burden = rng.beta(2, 8, size=n_samples).round(4)

    # ── Derived features ────────────────────────────────
    net_margin = ((revenue - expenses) / np.maximum(revenue, 1)).round(4)

    # ── Ground-truth risk score (deterministic formula) ──
    # Weighted combination of financial health indicators
    risk_score = (
        30 * np.clip(expenses / np.maximum(revenue, 1), 0, 2)     # expense pressure
        + 20 * np.clip(invoices_overdue_ratio, 0, 1)               # collection risk
        + 20 * np.clip(debt_ratio / 2.0, 0, 1)                     # leverage risk
        + 15 * np.clip(loan_burden * 3, 0, 1)                      # loan pressure
        + 15 * np.clip(0.5 - growth_rate, 0, 1)                    # stagnation risk
    )
    # Normalise to 0-100
    risk_score = np.clip(risk_score, 0, 100)

    # ── Inject anomalies (~5% of data) ──────────────────
    n_anomalies = int(n_samples * 0.05)
    anomaly_idx = rng.choice(n_samples, n_anomalies, replace=False)
    # Anomalies: extreme expense ratios or debt
    expenses[anomaly_idx] *= rng.uniform(1.5, 3.0, size=n_anomalies)
    debt_ratio[anomaly_idx] = rng.uniform(2.0, 3.0, size=n_anomalies)
    # Recalculate derived values for anomaly rows
    cash_flow[anomaly_idx] = revenue[anomaly_idx] - expenses[anomaly_idx]
    net_margin[anomaly_idx] = ((revenue[anomaly_idx] - expenses[anomaly_idx]) /
                                np.maximum(revenue[anomaly_idx], 1))
    expense_ratio[anomaly_idx] = expenses[anomaly_idx] / np.maximum(revenue[anomaly_idx], 1)
    # Recalculate risk for anomalies
    risk_score[anomaly_idx] = np.clip(
        30 * np.clip(expenses[anomaly_idx] / np.maximum(revenue[anomaly_idx], 1), 0, 2)
        + 20 * np.clip(invoices_overdue_ratio[anomaly_idx], 0, 1)
        + 20 * np.clip(debt_ratio[anomaly_idx] / 2.0, 0, 1)
        + 15 * np.clip(loan_burden[anomaly_idx] * 3, 0, 1)
        + 15 * np.clip(0.5 - growth_rate[anomaly_idx], 0, 1),
        0, 100,
    )

    # ── Add noise to target (prevents overfitting to rules) ──
    noise = rng.normal(0, 3, size=n_samples)
    risk_score = np.clip(risk_score + noise, 0, 100).round(2)

    # ── Assemble DataFrame ──────────────────────────────
    df = pd.DataFrame({
        "revenue": revenue,
        "expenses": expenses,
        "cash_flow": cash_flow.round(2),
        "invoices_overdue": invoices_overdue,
        "invoices_overdue_ratio": invoices_overdue_ratio.round(4),
        "debt_ratio": debt_ratio,
        "growth_rate": growth_rate,
        "expense_ratio": expense_ratio.round(4),
        "net_margin": net_margin,
        "loan_burden": loan_burden,
        "risk_score": risk_score,
    })

    return df


def save_dataset(df: pd.DataFrame, path: str = DATASET_PATH):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_csv(path, index=False)
    print(f"Dataset saved: {path}  ({len(df)} rows, {len(df.columns)} columns)")


if __name__ == "__main__":
    df = generate_dataset()
    save_dataset(df)
    print("\nDataset statistics:")
    print(df.describe().round(2))
    print(f"\nRisk score distribution:")
    bins = [0, 25, 50, 75, 100]
    labels = ["low", "moderate", "high", "critical"]
    df["risk_level"] = pd.cut(df["risk_score"], bins=bins, labels=labels)
    print(df["risk_level"].value_counts().sort_index())
