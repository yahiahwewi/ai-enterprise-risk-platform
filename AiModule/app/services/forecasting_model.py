"""
Cash Flow Forecasting Service.

Uses linear regression on historical data points to project future cash flow.

Approach:
  - Takes a time series of monthly financial data (revenue, expenses)
  - Fits a simple linear trend line (OLS regression)
  - Projects forward 30 and 60 days
  - Adjusts for known upcoming obligations (pending invoices, loan payments)

Why Linear Regression for forecasting?
  - With limited data points (3-12 months), complex models overfit
  - Linear trends are interpretable and defensible in business context
  - The adjustment layer (invoices, loans) adds domain knowledge on top
"""

import numpy as np
from sklearn.linear_model import LinearRegression


def forecast_cash_flow(
    historical_monthly: list[dict],
    pending_invoices: float = 0,
    monthly_loan_payments: float = 0,
) -> dict:
    """
    Forecast cash flow for the next 30 and 60 days.

    historical_monthly: list of dicts with keys:
      month (int 1-based), revenue, expenses

    Returns forecasted revenue, expenses, and net cash flow for 30d and 60d.
    """
    if len(historical_monthly) < 2:
        # Not enough data for regression — use last known values
        last = historical_monthly[-1] if historical_monthly else {"revenue": 0, "expenses": 0}
        net = last["revenue"] - last["expenses"] + pending_invoices - monthly_loan_payments
        return {
            "forecast_30d": {
                "revenue": round(last["revenue"], 2),
                "expenses": round(last["expenses"], 2),
                "net_cash_flow": round(net, 2),
            },
            "forecast_60d": {
                "revenue": round(last["revenue"] * 2, 2),
                "expenses": round(last["expenses"] * 2, 2),
                "net_cash_flow": round(net * 2, 2),
            },
            "confidence": "low",
            "method": "last_value_carry_forward",
            "data_points": len(historical_monthly),
        }

    months = np.array([d["month"] for d in historical_monthly]).reshape(-1, 1)
    revenues = np.array([d["revenue"] for d in historical_monthly])
    expenses_arr = np.array([d["expenses"] for d in historical_monthly])

    # Fit linear models
    rev_model = LinearRegression().fit(months, revenues)
    exp_model = LinearRegression().fit(months, expenses_arr)

    # R-squared for confidence
    rev_r2 = rev_model.score(months, revenues)
    exp_r2 = exp_model.score(months, expenses_arr)
    avg_r2 = (rev_r2 + exp_r2) / 2

    if avg_r2 > 0.7:
        confidence = "high"
    elif avg_r2 > 0.4:
        confidence = "medium"
    else:
        confidence = "low"

    # Project next 1 and 2 months
    next_month = months[-1][0] + 1
    next_2_months = months[-1][0] + 2

    rev_30 = max(0, float(rev_model.predict([[next_month]])[0]))
    rev_60 = max(0, float(rev_model.predict([[next_2_months]])[0]))
    exp_30 = max(0, float(exp_model.predict([[next_month]])[0]))
    exp_60 = max(0, float(exp_model.predict([[next_2_months]])[0]))

    net_30 = rev_30 - exp_30 + pending_invoices - monthly_loan_payments
    net_60 = rev_60 - exp_60 + (pending_invoices * 1.5) - (monthly_loan_payments * 2)

    return {
        "forecast_30d": {
            "revenue": round(rev_30, 2),
            "expenses": round(exp_30, 2),
            "pending_invoices_inflow": round(pending_invoices, 2),
            "loan_payments": round(monthly_loan_payments, 2),
            "net_cash_flow": round(net_30, 2),
        },
        "forecast_60d": {
            "revenue": round(rev_60, 2),
            "expenses": round(exp_60, 2),
            "pending_invoices_inflow": round(pending_invoices * 1.5, 2),
            "loan_payments": round(monthly_loan_payments * 2, 2),
            "net_cash_flow": round(net_60, 2),
        },
        "trends": {
            "revenue_slope": round(float(rev_model.coef_[0]), 2),
            "expense_slope": round(float(exp_model.coef_[0]), 2),
            "revenue_direction": "growing" if rev_model.coef_[0] > 0 else "declining",
            "expense_direction": "growing" if exp_model.coef_[0] > 0 else "declining",
        },
        "confidence": confidence,
        "r_squared": round(avg_r2, 4),
        "method": "linear_regression",
        "data_points": len(historical_monthly),
    }
