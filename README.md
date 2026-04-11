<p align="center">
  <img src="frontend/public/logo.png" alt="Tac-Tic" height="48" />
</p>

<h1 align="center">Tac-Tic ERM — AI Enterprise Risk Management Platform</h1>

<p align="center">
  <strong>Plateforme intelligente de gestion des risques d'entreprise propulsée par l'intelligence artificielle</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-FastAPI-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/scikit--learn-ML-F7931E?logo=scikit-learn&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white" />
</p>

---

## Overview

Tac-Tic ERM is a full-stack enterprise risk management platform that combines financial data management with machine learning-powered risk analysis. The system enables companies to track transactions, invoices, loans, and assets while an AI engine continuously evaluates financial health, detects anomalies, forecasts cash flow, and generates executive-level business decisions.

### Key Capabilities

- **ML Risk Scoring** — GradientBoosting model trained on 1,500 samples (R² = 0.92) scores financial risk 0-100
- **Anomaly Detection** — Dual-method detection using Z-Score analysis and Isolation Forest
- **Cash Flow Forecasting** — 30/60-day projections using linear regression with invoice and loan adjustments
- **Decision Engine** — Converts risk scores into actionable business decisions (OK → Immediate Action)
- **Role-Based Dashboards** — Tailored views for Business Owner, Accountant, Finance Manager, and Admin
- **Real-Time Notifications** — Automated alerts for high risk, overdue invoices, and negative cash flow
- **Bilingual Interface** — Full French/English support with runtime language switching

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React 18)                      │
│  Tailwind CSS · Recharts · React Router · i18n (FR/EN)          │
│  Port 3000                                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ Axios (REST API)
┌────────────────────────────▼────────────────────────────────────┐
│                    Backend API (Express.js)                      │
│  JWT Auth · RBAC · Helmet · Rate Limiting · express-validator   │
│  24 REST endpoints · Activity Logging · Notification Service    │
│  Port 5000                                                      │
└──────────┬─────────────────────────────────────┬────────────────┘
           │ Mongoose ODM                        │ HTTP
┌──────────▼──────────┐              ┌───────────▼────────────────┐
│   MongoDB Database  │              │   AiModule (FastAPI/Python) │
│                     │              │   GradientBoosting ML Model │
│  8 Collections:     │              │   Anomaly Detection         │
│  Users, Companies,  │              │   Cash Flow Forecasting     │
│  Transactions,      │              │   Decision Engine           │
│  Invoices, Loans,   │              │   Explanation Engine        │
│  Assets,            │              │   Feedback Loop             │
│  Notifications,     │              │   Port 8000                 │
│  ActivityLogs       │              │                             │
└─────────────────────┘              └─────────────────────────────┘
```

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Tailwind CSS (CDN), Recharts, React Router v6, Context API |
| **Backend** | Node.js, Express.js 4, Mongoose 8, JWT, bcryptjs |
| **Database** | MongoDB |
| **AI/ML** | Python 3.12, FastAPI, scikit-learn, pandas, NumPy, joblib |
| **Security** | Helmet, express-validator, express-rate-limit, bcrypt (salt 12) |
| **Design** | Material Symbols, Manrope + Inter fonts, Stitch design tokens |

---

## Project Structure

```
├── backend/                    # Node.js Express API
│   ├── config/db.js           # MongoDB connection
│   ├── controllers/           # 10 route controllers
│   ├── middleware/            # auth, validators, rateLimiter, errorHandler, activityLogger
│   ├── models/                # 8 Mongoose schemas
│   ├── routes/                # 10 route modules
│   ├── services/              # aiService, decisionEngine, forecastService, notificationService
│   ├── seed.js                # Database seeder with realistic test data
│   └── server.js              # Express entry point
│
├── frontend/                   # React 18 SPA
│   ├── public/
│   │   ├── index.html         # Tailwind CDN + Material Symbols + config
│   │   └── logo.png           # Tac-Tic logo
│   └── src/
│       ├── components/        # Sidebar, TopNavbar, KPICard, ComboInput, Toast, Skeleton, etc.
│       ├── context/           # AuthContext, ThemeContext, ToastContext, LanguageContext
│       ├── i18n/              # fr.js, en.js (300+ keys each)
│       ├── pages/             # Login, Register, About, Dashboard, RiskReport, FinalDecision, etc.
│       │   └── dashboards/    # OwnerDashboard, AccountantDashboard, FinanceDashboard, AdminDashboard
│       └── services/api.js    # Axios instance with JWT interceptor
│
└── AiModule/                   # Python ML microservice
    ├── app/
    │   ├── core/config.py     # Centralized configuration
    │   ├── crud/              # JSON-based result & feedback storage
    │   ├── data/              # Dataset generator (1,500 synthetic rows)
    │   ├── ml/                # Trained model & scaler (.pkl)
    │   ├── models/            # Pydantic schemas
    │   ├── routes/            # FastAPI endpoints
    │   ├── services/          # risk_model, anomaly_detector, forecasting, decision, explanation
    │   ├── utils/             # preprocessing, metrics
    │   └── main.py            # FastAPI app with auto-training on startup
    └── requirements.txt
```

---

## API Endpoints

### Backend (Express) — 24 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register + auto-create company |
| POST | `/api/auth/login` | Public | Authenticate, return JWT |
| GET | `/api/auth/me` | JWT | Current user profile |
| GET | `/api/users` | Admin/Owner | List users or team |
| POST | `/api/users/invite` | Owner | Invite accountant or finance role |
| POST | `/api/transactions` | Accountant/Owner | Create transaction |
| GET | `/api/transactions` | JWT | List company transactions |
| POST | `/api/invoices` | Accountant/Owner | Create invoice |
| GET | `/api/invoices` | JWT | List company invoices |
| PATCH | `/api/invoices/:id` | Accountant/Owner | Update invoice status |
| POST | `/api/loans` | Finance/Owner | Create loan |
| GET | `/api/loans` | JWT | List company loans |
| POST | `/api/assets` | Finance/Owner | Create asset |
| GET | `/api/assets` | JWT | List company assets |
| GET | `/api/ai/risk-report` | Owner | AI risk analysis with trends, anomalies, forecasts |
| GET | `/api/ai/final-decision` | Owner | Business decision with priority actions |
| GET | `/api/notifications` | JWT | User notifications |
| GET | `/api/notifications/unread-count` | JWT | Unread notification count |
| PATCH | `/api/notifications/:id/read` | JWT | Mark notification as read |
| POST | `/api/notifications/mark-all-read` | JWT | Mark all read |
| GET | `/api/activity` | Owner/Admin | Paginated activity log |
| GET | `/api/forecast/invoice-risk` | Owner/Accountant | Per-invoice risk scores |
| GET | `/api/forecast/loan-stress` | Owner/Finance | Loan stress test |
| GET | `/api/forecast/asset-depreciation` | Owner/Finance | Asset depreciation projection |

### AiModule (FastAPI) — 11 endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/predict` | ML risk prediction |
| POST | `/ai/anomalies` | Z-Score + Isolation Forest detection |
| POST | `/ai/explain` | Feature importance explanations |
| POST | `/ai/decision` | Full business decision package |
| POST | `/ai/forecast` | Cash flow forecast (30d/60d) |
| POST | `/ai/trends` | Period comparison analysis |
| POST | `/ai/feedback` | Submit prediction feedback |
| GET | `/ai/feedback` | List feedback |
| GET | `/ai/feedback/stats` | Feedback statistics |
| GET | `/ai/history` | Past prediction results |
| POST | `/ai/train` | Retrain model on demand |

---

## AI Engine

### Risk Scoring Model

The platform uses a **GradientBoostingRegressor** (200 trees, depth 12) trained on 1,500 synthetic financial samples. The model analyzes 10 engineered features:

| Feature | Importance | Description |
|---------|-----------|-------------|
| `expense_ratio` | 33.7% | Expenses as percentage of revenue |
| `debt_ratio` | 21.5% | Debt-to-asset ratio |
| `net_margin` | 21.4% | Net profit margin |
| `loan_burden` | 10.7% | Monthly loan payments vs income |
| `invoices_overdue_ratio` | 5.7% | Overdue invoice percentage |
| `growth_rate` | 3.6% | Revenue growth rate |
| Other features | 3.4% | cash_flow, invoices_overdue, revenue, expenses |

**Performance:** R² = 0.92, MAE = 2.88, Classification Accuracy = 92%

### Decision Tiers

| Score | Decision | Action |
|-------|----------|--------|
| 0-24 | OK | Continue current strategy |
| 25-49 | Monitor | Review within 30 days |
| 50-74 | Action Required | Corrective measures in 2-4 weeks |
| 75-100 | Immediate Action | Urgent executive intervention |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Python 3.10+ (for AiModule)

### Installation

```bash
# Clone the repository
git clone https://github.com/yahiahwewi/ai-enterprise-risk-platform.git
cd ai-enterprise-risk-platform

# Backend
cd backend
npm install
cp .env.example .env  # Configure MONGO_URI and JWT_SECRET
npm run dev            # Starts on port 5000

# Frontend (new terminal)
cd frontend
npm install
npm start              # Starts on port 3000

# AiModule (new terminal, optional)
cd AiModule
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000  # Auto-trains on first launch
```

### Seed Database

```bash
cd backend
node seed.js
```

Creates test accounts with realistic financial data:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@erm.com | admin123 |
| Business Owner | owner@erm.com | owner123 |
| Accountant | accountant@erm.com | accountant123 |
| Finance Manager | finance@erm.com | finance123 |

Seeded data: 23 transactions (90 days), 8 invoices, 3 loans, 5 assets, 4 notifications, 10 activity logs.

---

## Features

### Role-Based Dashboards

- **Owner** — Strategic dashboard with AI risk score (SVG ring gauge), risk domain cards, trend KPIs, cash flow forecasts, AI alerts with action buttons
- **Accountant** — Transaction & invoice management with inline forms, category charts, status tracking
- **Finance Manager** — Loan & asset management with valuation charts, debt-to-asset ratio, depreciation tracking
- **Admin** — Platform user management with role distribution KPIs

### UI/UX

- **Tailwind CSS** with Stitch material design tokens (deep blue primary, editorial aesthetic)
- **Material Symbols** icons throughout
- **Dark mode** with class-based Tailwind switching
- **Skeleton loaders** for all data-fetching states
- **Toast notifications** for all CRUD operations
- **ComboInput** — Odoo-style select-or-create inline (categories, clients, assets)
- **Responsive** — mobile-first with sidebar collapse

### Security

- JWT authentication with 7-day expiry
- Password hashing (bcrypt, 12 salt rounds)
- Input validation on all endpoints (express-validator)
- Rate limiting (20 req/15min auth, 100 req/15min API)
- HTTP security headers (Helmet)
- Company-scoped data isolation (companyId filtering)

### Internationalization

- French (default) and English
- 300+ translation keys per language
- Language picker on auth pages and sidebar
- Persisted to localStorage

---

## Environment Variables

Create `backend/.env`:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/erm_platform
JWT_SECRET=your_secret_key_here
```

---

## License

This project was developed as part of an end-of-studies internship (PFE) at **Tac-Tic**.
