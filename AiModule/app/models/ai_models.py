"""
Pydantic models for API request/response validation.

These define the exact shape of data flowing through the API,
providing automatic validation, documentation, and type safety.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Input models ────────────────────────────────────────

class FinancialInput(BaseModel):
    """Raw financial data for a company — input to the risk prediction model."""
    revenue: float = Field(..., ge=0, description="Total revenue")
    expenses: float = Field(..., ge=0, description="Total expenses")
    cash_flow: Optional[float] = Field(None, description="Net cash flow (auto-calculated if missing)")
    invoices_overdue: float = Field(0, ge=0, description="Dollar amount of overdue invoices")
    invoices_overdue_ratio: Optional[float] = Field(None, ge=0, le=1, description="Overdue ratio (auto-calculated)")
    debt_ratio: float = Field(0, ge=0, description="Debt-to-asset ratio")
    growth_rate: float = Field(0, description="Revenue growth rate (-1 to +1)")
    loan_burden: float = Field(0, ge=0, le=1, description="Monthly loan payments as fraction of income")
    expense_ratio: Optional[float] = Field(None, description="Expense/revenue ratio (auto-calculated)")
    net_margin: Optional[float] = Field(None, description="Net margin (auto-calculated)")

    class Config:
        json_schema_extra = {
            "example": {
                "revenue": 500000,
                "expenses": 380000,
                "invoices_overdue": 45000,
                "debt_ratio": 0.6,
                "growth_rate": 0.08,
                "loan_burden": 0.15,
            }
        }


class TrendInput(BaseModel):
    """Two periods of data for trend comparison."""
    current_period: dict = Field(..., description="Current period financial data")
    previous_period: dict = Field(..., description="Previous period financial data")

    class Config:
        json_schema_extra = {
            "example": {
                "current_period": {"revenue": 500000, "expenses": 380000, "cash_flow": 120000, "invoices_overdue": 45000, "debt_ratio": 0.6},
                "previous_period": {"revenue": 420000, "expenses": 350000, "cash_flow": 70000, "invoices_overdue": 60000, "debt_ratio": 0.7},
            }
        }


class ForecastInput(BaseModel):
    """Historical monthly data for cash flow forecasting."""
    historical_monthly: list[dict] = Field(..., min_length=1, description="Monthly data with month, revenue, expenses")
    pending_invoices: float = Field(0, ge=0, description="Total pending invoice amount")
    monthly_loan_payments: float = Field(0, ge=0, description="Monthly loan payment total")

    class Config:
        json_schema_extra = {
            "example": {
                "historical_monthly": [
                    {"month": 1, "revenue": 400000, "expenses": 320000},
                    {"month": 2, "revenue": 420000, "expenses": 330000},
                    {"month": 3, "revenue": 500000, "expenses": 380000},
                ],
                "pending_invoices": 55000,
                "monthly_loan_payments": 8200,
            }
        }


# ── Response models ─────────────────────────────────────

class RiskResponse(BaseModel):
    risk_score: float
    risk_category: str
    confidence: float
    feature_contributions: dict
    input_features: dict


class DecisionResponse(BaseModel):
    decision: str
    decision_color: str
    risk_score: float
    risk_category: str
    confidence: float
    summary: str
    priority_actions: list[dict]
    business_impact: str


class AIResultRecord(BaseModel):
    """Stored AI analysis result."""
    id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    company_id: Optional[str] = None
    user_id: Optional[str] = None
    risk_score: float
    risk_category: str
    confidence: float
    decision: Optional[str] = None
    input_data: dict
