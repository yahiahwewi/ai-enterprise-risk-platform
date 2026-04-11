"""
Forecasting routes.

Endpoints:
  POST /ai/forecast  — Cash flow forecast (30d / 60d)
  POST /ai/trends    — Trend analysis (period comparison)
"""

from fastapi import APIRouter
from app.models.ai_models import ForecastInput, TrendInput
from app.services.forecasting_model import forecast_cash_flow
from app.services.trend_analyzer import analyze_trends

router = APIRouter(prefix="/ai", tags=["Forecasting & Trends"])


@router.post("/forecast")
def forecast(data: ForecastInput):
    """
    Forecast cash flow for the next 30 and 60 days.

    Uses linear regression on historical monthly data, adjusted for
    pending invoices and loan payment obligations.
    """
    return forecast_cash_flow(
        historical_monthly=data.historical_monthly,
        pending_invoices=data.pending_invoices,
        monthly_loan_payments=data.monthly_loan_payments,
    )


@router.post("/trends")
def trends(data: TrendInput):
    """
    Compare two periods of financial data and compute trends.

    Returns per-metric change percentages, direction (improving/worsening/stable),
    and overall momentum score.
    """
    return analyze_trends(data.current_period, data.previous_period)
