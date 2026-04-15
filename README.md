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
- **Stratégie / Strategy Page** — 6 AI-driven scenarios with entity-level recommendations and in-place expandable suggestion cards
- **7-Lever Simulation Engine** — Scenario simulation with per-dimension breakdown table, bilingual narrative, and presets
- **Executive Dashboard** — Boardroom-grade read-only view with health gauges, sparklines, and priority action list
- **AI Copilot Chat** — Floating chat widget routing financial questions to live data services
- **Approval Workflows** — Multi-step approval chains for high-value invoices and transactions
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
│  REST endpoints · Activity Logging · Notification Service       │
│  Rule Engine · Approval Chains · Goal Advisor · Scenario Engine │
│  Port 5000                                                      │
└──────────┬─────────────────────────────────────┬────────────────┘
           │ Mongoose ODM                        │ HTTP
┌──────────▼──────────┐              ┌───────────▼────────────────┐
│   MongoDB Database  │              │   AiModule (FastAPI/Python) │
│                     │              │   GradientBoosting ML Model │
│  Collections:       │              │   Anomaly Detection         │
│  Users, Companies,  │              │   Cash Flow Forecasting     │
│  Transactions,      │              │   Decision Engine           │
│  Invoices, Loans,   │              │   Explanation Engine        │
│  Assets,            │              │   Feedback Loop             │
│  Notifications,     │              │   Port 8000                 │
│  ActivityLogs,      │              │                             │
│  ApprovalRequests,  │              └─────────────────────────────┘
│  Rules              │
└─────────────────────┘
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
├── backend/                         # Node.js Express API
│   ├── config/db.js                # MongoDB connection
│   ├── controllers/
│   │   ├── aiController.js         # Risk, decision, copilot, simulate, goals, health-index
│   │   ├── approvalController.js   # Approval chain management
│   │   ├── devController.js        # Dev seed endpoints (scenario-based test data)
│   │   └── ...                     # auth, transactions, invoices, loans, assets, etc.
│   ├── middleware/                  # auth, validators, rateLimiter, errorHandler, activityLogger
│   ├── models/
│   │   ├── ApprovalRequest.js      # Multi-step approval tracking
│   │   ├── Rule.js                 # Business rule definitions
│   │   └── ...                     # User, Company, Transaction, Invoice, Loan, Asset, Notification
│   ├── routes/
│   │   ├── aiRoutes.js             # /api/ai/* — risk, simulate, goals, copilot, health-index
│   │   ├── approvalRoutes.js       # /api/approvals/*
│   │   ├── devRoutes.js            # /api/dev/* (dev only)
│   │   └── ...
│   ├── services/
│   │   ├── aiService.js            # Risk analysis, root causes, forecasts
│   │   ├── copilotService.js       # AI copilot query router
│   │   ├── goalAdvisorService.js   # 6-scenario strategy advisor with entity-level suggestions
│   │   ├── healthIndex.js          # Financial Health Index (0-100, A-F grade)
│   │   ├── ruleEngine.js           # Rule evaluation engine
│   │   ├── scenarioEngine.js       # 7-param simulation engine with per-dimension breakdown
│   │   ├── notificationService.js  # Priority-scored notifications
│   │   └── report/scheduler.js     # Scheduled jobs (daily AI summary, weekly risk, monthly PDF)
│   ├── seed.js                     # Database seeder with realistic test data
│   └── server.js                   # Express entry point
│
├── frontend/                        # React 18 SPA
│   ├── public/
│   │   ├── index.html              # Tailwind CDN + Material Symbols + config
│   │   └── logo.png               # Tac-Tic logo
│   └── src/
│       ├── components/
│       │   ├── CopilotChat.js      # Floating AI chat widget (owner role)
│       │   ├── NotificationBell.js # Priority-grouped notification bell
│       │   ├── Sidebar.js          # Role-aware navigation
│       │   └── ...                 # Layout, TopNavbar, KPICard, ComboInput, Toast, Skeleton
│       ├── context/                # AuthContext, ThemeContext, ToastContext, LanguageContext
│       ├── i18n/                   # fr.js, en.js (300+ keys each)
│       ├── pages/
│       │   ├── Goals.js            # Stratégie page — 6 AI scenarios, expandable suggestion cards
│       │   ├── Simulate.js         # 7-lever simulation with presets, breakdown table, bar chart
│       │   ├── Executive.js        # Boardroom executive dashboard (read-only)
│       │   ├── Approvals.js        # Pending approval queue
│       │   └── dashboards/         # OwnerDashboard, AccountantDashboard, FinanceDashboard, AdminDashboard
│       └── services/api.js         # Axios instance with JWT interceptor
│
└── AiModule/                        # Python ML microservice
    ├── app/
    │   ├── core/config.py          # Centralized configuration
    │   ├── crud/                   # JSON-based result & feedback storage
    │   ├── data/                   # Dataset generator (1,500 synthetic rows)
    │   ├── ml/                     # Trained model & scaler (.pkl)
    │   ├── models/                 # Pydantic schemas
    │   ├── routes/                 # FastAPI endpoints
    │   ├── services/               # risk_model, anomaly_detector, forecasting, decision, explanation
    │   ├── utils/                  # preprocessing, metrics
    │   └── main.py                 # FastAPI app with auto-training on startup
    └── requirements.txt
```

---

## API Endpoints

### Backend (Express) — AI & Strategy

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/ai/risk-report` | Owner | AI risk analysis with trends, anomalies, forecasts, root causes |
| GET | `/api/ai/final-decision` | Owner | Business decision with priority actions |
| GET | `/api/ai/health-index` | Owner | Financial Health Index (0-100, grade A-F, 4 dimensions) |
| POST | `/api/ai/simulate` | Owner | 7-param scenario simulation with per-dimension breakdown |
| GET | `/api/ai/goals/:scenario` | Owner | Strategy advisor — entity-level AI suggestions for a scenario |
| POST | `/api/ai/copilot` | Owner | AI copilot — routes financial questions to live data services |

**Scenario values for `/api/ai/goals/:scenario`:**

| Scenario ID | Description |
|-------------|-------------|
| `recovery` | Financial Recovery |
| `growth` | Aggressive Growth |
| `cost_reduction` | Cost Reduction |
| `revenue_optimization` | Revenue Optimization |
| `debt_restructuring` | Debt Restructuring |
| `excellence` | Operational Excellence |

### Backend (Express) — Core

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
| GET | `/api/notifications` | JWT | User notifications |
| GET | `/api/notifications/unread-count` | JWT | Unread notification count |
| PATCH | `/api/notifications/:id/read` | JWT | Mark notification as read |
| POST | `/api/notifications/mark-all-read` | JWT | Mark all read |
| GET | `/api/activity` | Owner/Admin | Paginated activity log |
| GET | `/api/forecast/invoice-risk` | Owner/Accountant | Per-invoice risk scores |
| GET | `/api/forecast/loan-stress` | Owner/Finance | Loan stress test |
| GET | `/api/forecast/asset-depreciation` | Owner/Finance | Asset depreciation projection |
| POST | `/api/export/pdf/generate` | Owner/Admin | Generate PDF report |
| GET | `/api/export/pdf/history` | JWT | Report history |
| GET | `/api/export/pdf/:reportId` | JWT | Download PDF report |

### Backend (Express) — Approvals

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/approvals/pending` | JWT | My pending approval items |
| PATCH | `/api/approvals/:id/approve` | JWT | Approve current step |
| PATCH | `/api/approvals/:id/reject` | JWT | Reject with reason |

### Dev Utilities (development only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/dev/seed/:scenario` | JWT | Seed scenario-specific financial data for testing |

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

### Financial Health Index

Computed by `services/healthIndex.js` across 4 weighted dimensions:

| Dimension | Weight | Signals |
|-----------|--------|---------|
| Liquidity | 30% | Cash flow / monthly expenses, current ratio |
| Stability | 25% | Variance of monthly income, debt consistency |
| Growth | 25% | Revenue trend, client acquisition rate |
| Efficiency | 20% | Expense ratio, collection rate |

Returns: `{ score, grade: 'A'/'B'/'C'/'D'/'F', dimensions, trend }`

### Stratégie / Strategy Advisor

`services/goalAdvisorService.js` powers the **Stratégie** page. For each scenario it returns:

- **currentMetrics** — cash flow, expense ratio, debt-to-asset ratio, late payment rate, approximate risk score (null-safe display for undefined ratios)
- **suggestions** — 4 sections (Invoices, Loans, Transactions, Assets), each with targeted entity-level actions
- **scenarioWarning** — detects mismatch between chosen scenario and financial state; suggests a more appropriate scenario with one-click switch

**Approximate Risk Score Formula** (mirrors `scenarioEngine.js`):
```
score = cashFlowScore * 0.35 + invoiceScore * 0.25 + debtRiskScore * 0.25 + loanBurdenScore * 0.15
```

**Null-safe ratios:** When assets = 0 or revenue = 0, ratios display as "Sans actifs" / "No assets" instead of mathematical errors.

### Scenario Simulation Engine

`services/scenarioEngine.js` accepts 7 independent levers:

| Parameter | Description |
|-----------|-------------|
| `expenseChange` | Expense % change (-50 to +100) |
| `revenueChange` | Revenue % change (-50 to +100) |
| `lateInvoiceCount` | Additional late invoices |
| `collectionRate` | Invoice collection rate improvement % |
| `rateIncrease` | Interest rate increase % |
| `newLoanAmount` | Additional loan amount |
| `assetSale` | Asset liquidation amount |

Returns: `{ baseline, simulated, delta, impact }` with per-dimension `breakdown` field for detailed comparison.

---

## Features

### Stratégie Page (Goals)

Owner-only strategic planning workspace:
- **6 AI scenarios** — Recovery, Growth, Cost Reduction, Revenue Optimization, Debt Restructuring, Operational Excellence
- **Current metrics panel** — live financial indicators with null-safe ratio display and approximate risk score
- **Suggestion cards** — expandable in-place (CSS grid animation, no page navigation) with lazy-loaded entity data
- **Entity detail rows** — inline display of relevant invoices, loans, transactions, or assets per suggestion
- **Scenario alignment warning** — detects when chosen scenario conflicts with financial state; offers one-click switch
- **Bilingual** — all metrics, suggestions, actions, and narratives in FR/EN

### Simulation Page

7-lever scenario sandbox:
- **Sliders** grouped into 3 categories: Revenue & Costs, Invoices & Collections, Debt & Assets
- **6 presets** — Recession, Growth Sprint, Debt Crisis, Collection Drive, Austerity, Debt-Financed Growth
- **Recharts BarChart** — side-by-side baseline vs simulated with dynamic cell coloring (red = worse, green = better)
- **Dimension breakdown table** — per-dimension score deltas for all 4 risk dimensions
- **Bilingual narrative** — contextual interpretation of simulation results
- **6-level impact badge** — Very Positive / Positive / Stable / Caution / Negative / Critical

### Executive Dashboard

Boardroom-grade read-only view for the owner:
- Financial Health gauge (A-F grade)
- Risk Score ring gauge
- Decision badge
- Cash flow sparkline + forecast bars
- Top 3 priority actions
- Top 3 risky clients/invoices

### AI Copilot Chat

Floating chat widget (bottom-right, owner only):
- Smart query router — no external LLM; routes to live data services
- Handles: risk questions, cash flow queries, invoice analysis, root cause analysis, recommendations
- Context-aware suggestions after each answer
- Full FR/EN support

### Approval Workflows

Multi-step approval chains for high-value transactions:
- Invoice > 10,000 TND → require approval chain
- Per-role approval steps with comment support
- Pending approval queue page accessible by all roles
- Approval badges on transaction/invoice cards

### Role-Based Dashboards

- **Owner** — Strategic dashboard with AI risk score (SVG ring gauge), risk domain cards, trend KPIs, cash flow forecasts, AI alerts with action buttons, Health Index KPI
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
- **CSS grid-template-rows animation** — smooth expand/collapse without JS height measurement
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
- All AI-generated content (suggestions, narratives, warnings) available in both languages

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

### Dev Scenario Seeding

For testing specific financial scenarios on the Stratégie or Simulation pages:

```bash
# Seed a predefined scenario (replaces financial data for owner's company)
POST /api/dev/seed/:scenario

# Available scenarios:
# recovery         — negative cash flow, high late invoices, heavy debt
# growth           — positive cash flow, low debt, healthy invoices
# cost_reduction   — high expense ratio, excess spending categories
# debt_restructuring — multiple loans, high debt-to-asset ratio
```

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
