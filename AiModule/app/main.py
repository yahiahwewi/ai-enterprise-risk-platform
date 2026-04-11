"""
AiModule — AI-powered Enterprise Risk Management Microservice.

A standalone FastAPI service that provides ML-based financial risk analysis,
anomaly detection, cash flow forecasting, and business decision generation.

Startup behavior:
  1. Check if trained model exists
  2. If not → generate dataset + train model automatically
  3. Register all API routes
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.ai_routes import router as ai_router
from app.routes.forecast_routes import router as forecast_router
from app.routes.decision_routes import router as decision_router
from app.routes.feedback_routes import router as feedback_router
from app.core.config import MODEL_PATH

app = FastAPI(
    title="AiModule — Enterprise Risk Management AI",
    description=(
        "ML-powered microservice for financial risk prediction, anomaly detection, "
        "cash flow forecasting, and business decision generation. "
        "Uses GradientBoosting trained on synthetic financial data."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the MERN frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route groups
app.include_router(ai_router)
app.include_router(forecast_router)
app.include_router(decision_router)
app.include_router(feedback_router)


@app.on_event("startup")
def startup_event():
    """Auto-train model on first launch if no model file exists."""
    if not os.path.exists(MODEL_PATH):
        print("\n[STARTUP] No trained model found — running initial training pipeline...\n")
        from app.services.training_pipeline import train_model
        train_model()
        print("\n[STARTUP] Model ready.\n")
    else:
        print(f"\n[STARTUP] Trained model loaded from {MODEL_PATH}\n")


@app.get("/", tags=["Health"])
def health_check():
    """Health check endpoint."""
    model_exists = os.path.exists(MODEL_PATH)
    return {
        "service": "AiModule",
        "status": "healthy" if model_exists else "model_not_trained",
        "version": "1.0.0",
        "endpoints": [
            "POST /ai/predict",
            "POST /ai/anomalies",
            "POST /ai/explain",
            "POST /ai/decision",
            "POST /ai/forecast",
            "POST /ai/trends",
            "POST /ai/feedback",
            "GET  /ai/feedback",
            "GET  /ai/feedback/stats",
            "GET  /ai/history",
            "POST /ai/train",
        ],
    }
