"""
Decision Engine route.

Endpoint:
  POST /ai/decision  — Full business decision from financial data
"""

from fastapi import APIRouter, HTTPException
from app.models.ai_models import FinancialInput
from app.services.risk_model import predict_risk
from app.services.anomaly_detector import full_anomaly_report
from app.services.decision_engine import generate_decision

router = APIRouter(prefix="/ai", tags=["Decision Engine"])


@router.post("/decision")
def get_decision(data: FinancialInput):
    """
    Generate a final business decision from financial data.

    Runs the full AI pipeline:
      1. ML risk prediction
      2. Anomaly detection
      3. Decision mapping (OK / Monitor / Action Required / Immediate Action)
      4. Priority actions + business impact

    Returns an executive-ready decision package.
    """
    try:
        risk_result = predict_risk(data.model_dump())
        anomaly_result = full_anomaly_report(data.model_dump())
        decision = generate_decision(risk_result, anomaly_result)
        return decision
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
