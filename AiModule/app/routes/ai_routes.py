"""
Core AI prediction and analysis routes.

Endpoints:
  POST /ai/predict    — ML risk prediction from financial data
  POST /ai/anomalies  — Anomaly detection
  POST /ai/explain    — Explain a prediction
  GET  /ai/history    — Past prediction results
  POST /ai/train      — Retrain the model
"""

from fastapi import APIRouter, HTTPException, Query
from app.models.ai_models import FinancialInput
from app.services.risk_model import predict_risk
from app.services.anomaly_detector import full_anomaly_report
from app.services.explanation_engine import explain_prediction
from app.services.training_pipeline import train_model
from app.crud.ai_results_crud import create_result, get_all_results, get_results_by_user, get_results_by_company

router = APIRouter(prefix="/ai", tags=["AI Core"])


@router.post("/predict")
def predict(data: FinancialInput):
    """
    Predict risk score using the trained ML model.

    Accepts financial data, runs it through preprocessing → scaling → model,
    and returns a risk score (0-100), category, confidence, and feature contributions.
    """
    try:
        result = predict_risk(data.model_dump())

        # Store result for history
        record = {
            "risk_score": result["risk_score"],
            "risk_category": result["risk_category"],
            "confidence": result["confidence"],
            "input_data": data.model_dump(),
        }
        stored = create_result(record)
        result["result_id"] = stored["id"]

        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/anomalies")
def detect_anomalies(data: FinancialInput):
    """
    Run anomaly detection on financial data.

    Uses both Z-Score (per-feature) and Isolation Forest (multivariate)
    to identify unusual financial patterns.
    """
    try:
        return full_anomaly_report(data.model_dump())
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/explain")
def explain(data: FinancialInput):
    """
    Explain WHY the model gave a specific risk score.

    Returns feature importance ranking, per-feature effects (increases/decreases risk),
    and a human-readable narrative.
    """
    try:
        risk_result = predict_risk(data.model_dump())
        return explain_prediction(risk_result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/history")
def get_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str = Query(None),
    company_id: str = Query(None),
):
    """
    Retrieve past AI prediction results.
    Optionally filter by user_id or company_id.
    """
    if user_id:
        return get_results_by_user(user_id, limit)
    if company_id:
        return get_results_by_company(company_id, limit)
    return get_all_results(limit, offset)


@router.post("/train")
def retrain():
    """
    Retrain the ML model from scratch.

    Regenerates/reloads the dataset, runs the full training pipeline,
    and saves new model + scaler files. Returns evaluation metrics.
    """
    try:
        result = train_model()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")
