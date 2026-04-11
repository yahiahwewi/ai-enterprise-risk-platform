# AiModule — ML-Powered Enterprise Risk Management Microservice

A standalone Python/FastAPI microservice that provides real machine learning-based
financial risk analysis, anomaly detection, cash flow forecasting, and business
decision generation.

---

## Quick Start

```bash
cd AiModule

# Install dependencies
pip install -r requirements.txt

# Option 1: Just start (auto-trains on first launch)
uvicorn app.main:app --reload --port 8000

# Option 2: Manual training first
python -m app.data.dataset_generator    # Generate dataset
python -m app.services.training_pipeline # Train model
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs for the interactive Swagger UI.

---

## Project Structure

```
AiModule/
├── app/
│   ├── main.py                  # FastAPI app + startup auto-training
│   ├── core/config.py           # Centralized config (paths, hyperparams)
│   ├── routes/
│   │   ├── ai_routes.py         # /predict, /anomalies, /explain, /history, /train
│   │   ├── forecast_routes.py   # /forecast, /trends
│   │   ├── decision_routes.py   # /decision
│   │   └── feedback_routes.py   # /feedback, /feedback/stats
│   ├── services/
│   │   ├── risk_model.py        # ML prediction (GradientBoosting)
│   │   ├── anomaly_detector.py  # Z-Score + Isolation Forest
│   │   ├── trend_analyzer.py    # Period comparison
│   │   ├── forecasting_model.py # Linear regression forecasting
│   │   ├── decision_engine.py   # Score → business decision
│   │   ├── explanation_engine.py# Feature importance explanations
│   │   └── training_pipeline.py # Full train/evaluate/save pipeline
│   ├── models/
│   │   ├── ai_models.py         # Pydantic request/response schemas
│   │   └── feedback_model.py    # Feedback schemas
│   ├── crud/
│   │   ├── ai_results_crud.py   # Prediction history storage
│   │   └── feedback_crud.py     # Feedback storage
│   ├── data/
│   │   ├── dataset_generator.py # Synthetic data generation
│   │   └── sample_dataset.csv   # 1500-row training dataset
│   ├── ml/
│   │   ├── trained_model.pkl    # Serialized GradientBoosting model
│   │   └── scaler.pkl           # Fitted StandardScaler
│   └── utils/
│       ├── preprocessing.py     # Feature engineering + scaling
│       └── metrics.py           # Evaluation functions
├── requirements.txt
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/predict` | ML risk prediction from financial data |
| POST | `/ai/anomalies` | Anomaly detection (Z-Score + Isolation Forest) |
| POST | `/ai/explain` | Explain why the model gave a score |
| POST | `/ai/decision` | Full business decision package |
| POST | `/ai/forecast` | Cash flow forecast (30d/60d) |
| POST | `/ai/trends` | Period-over-period trend analysis |
| POST | `/ai/feedback` | Submit feedback on a prediction |
| GET | `/ai/feedback` | List all feedback |
| GET | `/ai/feedback/stats` | Feedback statistics |
| GET | `/ai/history` | Past prediction results |
| POST | `/ai/train` | Retrain the model |

---

## Step-by-Step Training Guide

### 1. Dataset Creation

The dataset generator (`app/data/dataset_generator.py`) creates 1500 rows of
realistic synthetic financial data:

- **Revenue**: log-normal distribution (median ~$500K, range $50K-$5M)
- **Expenses**: 45-125% of revenue (some companies are unprofitable)
- **Invoices overdue**: Beta distribution (skewed — most companies ~20%)
- **Debt ratio**: Exponential distribution (0-3.0)
- **Growth rate**: Normal distribution (mean 5%, std 15%)
- **Loan burden**: Beta distribution (most <30%)

**Ground-truth risk score** is computed from a weighted formula:
- 30% expense pressure + 20% collection risk + 20% leverage + 15% loan burden + 15% stagnation

**5% of rows** are injected as anomalies (extreme expenses/debt) so the model
learns edge cases. Gaussian noise is added to the target to prevent overfitting.

```bash
python -m app.data.dataset_generator
```

### 2. Model Training

The training pipeline (`app/services/training_pipeline.py`):

1. Loads the CSV dataset
2. Engineers 10 features from raw financial data
3. Splits 80/20 (train/test)
4. Fits a StandardScaler on training data
5. Trains a GradientBoostingRegressor (200 trees, depth 12)
6. Evaluates regression (MAE, RMSE, R2) and classification (accuracy per risk level)
7. Saves `trained_model.pkl` and `scaler.pkl`

```bash
python -m app.services.training_pipeline
```

### 3. Retraining

Retrain anytime via API:
```bash
curl -X POST http://localhost:8000/ai/train
```

Or modify `app/data/sample_dataset.csv` with real data and retrain.

---

## AI Logic Explanation

### Why GradientBoosting?

| Criterion | GradientBoosting | RandomForest | Neural Network |
|-----------|-----------------|--------------|----------------|
| Tabular data performance | Best | Good | Worse |
| Handles outliers | Good (robust) | Good | Poor |
| Feature importance | Built-in | Built-in | Requires SHAP |
| Small dataset (<10K) | Excellent | Good | Poor (overfits) |
| Training speed | Fast | Fast | Slow |
| Interpretability | High | High | Low |

GradientBoosting builds trees sequentially — each tree corrects errors from the
previous one. This gives better accuracy than RandomForest (which builds trees
independently) on structured financial data.

### How Predictions Work

```
Input (financial data)
    │
    ▼
Feature Engineering (10 features computed)
    │
    ▼
StandardScaler (normalize to mean=0, std=1)
    │
    ▼
GradientBoostingRegressor (200 trees)
    │
    ▼
risk_score (0-100) → category + confidence
```

### How Scoring Works

The model outputs a continuous score 0-100, mapped to categories:
- **0-24**: Low risk (OK)
- **25-49**: Moderate risk (Monitor)
- **50-74**: High risk (Action Required)
- **75-100**: Critical risk (Immediate Action)

**Confidence** is estimated from prediction stability across boosting stages.
Low variance in late stages = high confidence.

---

## Algorithms Used

### 1. GradientBoosting Regressor (Risk Prediction)
- **Type**: Supervised, ensemble, sequential boosting
- **How**: Builds decision trees one at a time; each tree fits the residual
  errors of all previous trees combined
- **Why**: Best performance on tabular financial data with outliers

### 2. Z-Score (Anomaly Detection - Per Feature)
- **Formula**: `z = |value - mean| / std_deviation`
- **Threshold**: z > 2.5 = anomalous
- **Strength**: Interpretable — tells you exactly WHICH feature is abnormal

### 3. Isolation Forest (Anomaly Detection - Multivariate)
- **How**: Randomly partitions data with decision trees; anomalies are isolated
  in fewer splits (shorter path = more anomalous)
- **Contamination**: 5% (matches the anomaly rate in our dataset)
- **Strength**: Detects complex multi-feature anomalies that Z-Score misses

### 4. Linear Regression (Cash Flow Forecasting)
- **How**: Fits a trend line through monthly revenue/expense data points
- **Projection**: Extrapolates 1-2 months forward
- **Adjustment**: Adds pending invoices, subtracts loan payments
- **Why not ARIMA/Prophet**: With <12 data points, simpler models are more reliable

---

## Data Flow

```
Client (MERN app or direct API call)
    │
    ▼ POST /ai/predict  {revenue, expenses, ...}
    │
    ▼ Pydantic Validation (ai_models.py)
    │
    ▼ Feature Engineering (preprocessing.py)
    │  - Compute: expense_ratio, net_margin, cash_flow, etc.
    │  - Fill missing values
    │
    ▼ StandardScaler Transform (scaler.pkl)
    │  - Normalize to mean=0, std=1
    │
    ▼ GradientBoosting Predict (trained_model.pkl)
    │  - 200 trees vote on the risk score
    │
    ▼ Post-processing
    │  - Clip score to 0-100
    │  - Map to category (low/moderate/high/critical)
    │  - Estimate confidence from tree agreement
    │  - Extract feature importance
    │
    ▼ Store Result (ai_results_crud.py)
    │
    ▼ Return JSON Response
```

---

## Sample API Responses

### POST /ai/predict
```json
{
  "risk_score": 41.31,
  "risk_category": "moderate",
  "confidence": 99.0,
  "feature_contributions": {
    "expense_ratio": 0.3366,
    "debt_ratio": 0.2146,
    "net_margin": 0.2135,
    "loan_burden": 0.1066,
    "invoices_overdue_ratio": 0.0573,
    "growth_rate": 0.0358
  },
  "result_id": "a1b2c3d4"
}
```

### POST /ai/decision
```json
{
  "decision": "Action Required",
  "decision_color": "orange",
  "risk_score": 70.61,
  "confidence": 98.5,
  "summary": "Elevated financial risk detected (score: 70.61/100)...",
  "priority_actions": [
    {"priority": 1, "action": "Cut non-essential expenses immediately", "urgency": "critical"},
    {"priority": 2, "action": "Restructure or consolidate debt", "urgency": "high"},
    {"priority": 3, "action": "Escalate invoice collection efforts", "urgency": "medium"}
  ],
  "business_impact": "Corrective action within 30 days is strongly recommended..."
}
```

### POST /ai/anomalies
```json
{
  "overall_anomaly": true,
  "anomaly_score": -0.2341,
  "method_isolation_forest": {"is_anomaly": true, "interpretation": "anomalous"},
  "method_zscore": {
    "threshold": 2.5,
    "count": 4,
    "anomalous_features": [
      {"feature": "expense_ratio", "value": 3.0, "z_score": 5.2, "direction": "above", "severity": "high"}
    ]
  }
}
```

---

## Model Performance (Actual Results)

| Metric | Value |
|--------|-------|
| R-squared | 0.9214 |
| MAE | 2.88 |
| RMSE | 3.65 |
| Classification Accuracy | 92% |
| Max Error | 11.22 |
| Top Feature | expense_ratio (34%) |

---

## Integration with MERN Backend

The AiModule runs independently on port 8000. To connect from the Node.js backend:

```javascript
// In your Node.js backend
const axios = require('axios');
const AI_URL = 'http://localhost:8000';

async function getAIRiskScore(financialData) {
  const { data } = await axios.post(`${AI_URL}/ai/predict`, financialData);
  return data;
}
```

---

## Tech Stack

- **FastAPI** — async Python web framework with auto-generated docs
- **scikit-learn** — GradientBoosting, IsolationForest, LinearRegression, StandardScaler
- **Pandas** — data manipulation and feature engineering
- **NumPy** — numerical operations
- **Joblib** — model serialization (.pkl files)
- **Pydantic** — request/response validation
