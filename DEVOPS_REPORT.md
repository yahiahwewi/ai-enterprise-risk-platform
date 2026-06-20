# DevOps Implementation Report — Tac-Tic ERM

**Date:** 20 June 2026  
**Project:** Tac-Tic ERM — Enterprise Risk Management Platform  
**Stack:** MERN (MongoDB, Express, React 18, Node.js) + Python FastAPI AI Module  
**Author:** DevOps Audit

---

## 1. Current State Analysis

### 1.1 What Exists (Strengths)

| Area                 | Status     | Details                                                                                                                                                   |
| -------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App Security**     | ✅ Strong  | Helmet, CORS, rate-limiting (200 req/15min auth, 1000 req/15min API), JWT, bcrypt salt-12, RSA-2048 signing, X.509 certs, SHA-256 integrity, RFC 3161 TSA |
| **RBAC**             | ✅ Strong  | 6 roles, 48 dynamic permissions, middleware-enforced `protect()` + `authorize()`                                                                          |
| **Crypto/PKI**       | ✅ Strong  | Node-Forge RSA, X.509 self-signed certs, RFC 3161 timestamping (4 TSA fallbacks), OpenTimestamps Bitcoin anchoring, QR verification                       |
| **Scheduled Jobs**   | ✅ Good    | node-cron: monthly PDF report, daily AI summary, weekly risk digest                                                                                       |
| **Activity Logging** | ⚠️ Partial | Custom `logActivity()` middleware → MongoDB. Fire-and-forget, only logs 2xx responses                                                                     |
| **Code Structure**   | ✅ Good    | Clear MVC separation: routes/ controllers/ services/ models/ middleware/                                                                                  |
| **Git**              | ✅ Good    | .gitignore covers node_modules, .env, certs, uploads, trained models                                                                                      |

### 1.2 What's Missing (Critical Gaps)

| Area                    | Score | Impact                                                                                                   |
| ----------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| **CI/CD Pipeline**      | 0%    | No automated build, test, or deploy — everything is manual                                               |
| **Testing**             | 0%    | Zero test files, no Jest/Mocha/Cypress in dependencies                                                   |
| **Containerization**    | 0%    | No Dockerfile, no docker-compose.yml, no .dockerignore                                                   |
| **Code Quality**        | 0%    | No ESLint, no Prettier, no pre-commit hooks                                                              |
| **Monitoring / APM**    | 5%    | No Prometheus, no Grafana, no health check on backend                                                    |
| **Structured Logging**  | 20%   | Raw `console.log()` everywhere — no Winston, no Pino, no request correlation                             |
| **Secrets Management**  | 15%   | API keys and passwords hardcoded in `.env` file (Groq key, Gmail SMTP password, Google OAuth ID exposed) |
| **Production Deploy**   | 0%    | No PM2 config, no Nginx, no systemd, no Procfile                                                         |
| **Database Migrations** | 0%    | No migration tooling — schema changes are manual                                                         |
| **CORS Policy**         | ⚠️    | Origin set to `*` (allows any domain)                                                                    |

**Overall DevOps Maturity: ~15%**

---

## 2. Recommended DevOps Stack

### 2.1 Containerization — Docker + Docker Compose

**Tool:** Docker 24+ / Docker Compose v2  
**Why:** Your project has 3 services (backend:5000, frontend:3000, AiModule:8001) + MongoDB. Without containers, every developer must manually install Node.js, Python, MongoDB, and configure ports. Docker makes it one command: `docker compose up`.

**Implementation:**

```
Project/
├── docker-compose.yml          # Orchestrates all services
├── docker-compose.prod.yml     # Production overrides
├── backend/
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile
│   └── .dockerignore
│   └── nginx.conf              # Serves React build
└── AiModule/
    ├── Dockerfile
    └── .dockerignore
```

**docker-compose.yml** will define:

- `mongo` — MongoDB 7 with persistent volume
- `backend` — Node.js API, depends on mongo, env_file for secrets
- `aimodule` — Python FastAPI, isolated network
- `frontend` — Nginx serving React build, proxy `/api` to backend
- `nginx` — Reverse proxy with SSL termination (production)

**Added Value:**

- One-command local setup (`docker compose up`)
- Identical dev/staging/prod environments
- Easy onboarding for new developers
- Isolates Python + Node.js dependencies
- Enables horizontal scaling per service

---

### 2.2 CI/CD — GitHub Actions

**Tool:** GitHub Actions (free for public repos, 2000 min/month for private)  
**Why:** Your project is on Git. GitHub Actions integrates natively — no extra service to manage.

**Pipeline Design:**

```
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  LINT   │───▶│  TEST   │───▶│  BUILD   │───▶│  SCAN    │───▶│  DEPLOY  │
│ ESLint  │    │ Jest    │    │ Docker   │    │ Trivy    │    │ SSH/ECS  │
│ Prettier│    │ Cypress │    │ Build    │    │ Snyk     │    │ K8s      │
└─────────┘    └─────────┘    └──────────┘    └──────────┘    └──────────┘
```

**Workflows to create:**

| Workflow            | Trigger                     | Steps                                                      |
| ------------------- | --------------------------- | ---------------------------------------------------------- |
| `ci.yml`            | Push to any branch          | Lint → Unit tests → Build check                            |
| `cd-staging.yml`    | PR merged to `develop`      | Build Docker images → Push to registry → Deploy to staging |
| `cd-production.yml` | Tag `v*` or merge to `main` | Build → Scan → Push → Deploy to production                 |
| `security.yml`      | Weekly + PR                 | Dependency audit (`npm audit`), Trivy container scan       |

**Added Value:**

- Catch bugs before they reach production
- Automated deployments — no manual SSH
- Security scanning on every change
- Build status badges on README
- Enforce code quality gates (no merge if lint fails)

---

### 2.3 Testing Suite

**Tools:**

- **Jest** — Unit + integration tests for backend controllers/services
- **Supertest** — HTTP endpoint testing (API routes)
- **React Testing Library** — Frontend component tests
- **Cypress** — End-to-end browser tests

**Test Strategy:**

| Layer       | Tool                  | Coverage Target | What to Test                                                                   |
| ----------- | --------------------- | --------------- | ------------------------------------------------------------------------------ |
| Unit        | Jest                  | 70%+ backend    | Controllers, services, validators, risk scoring, crypto signing                |
| Integration | Jest + Supertest      | Key flows       | Auth flow (register → OTP → verify → login), CRUD operations, RBAC enforcement |
| Component   | React Testing Library | Critical UI     | Dashboard rendering, form validation, role-based component visibility          |
| E2E         | Cypress               | Happy paths     | Login → Dashboard → Create Transaction → Generate Report → Verify Signature    |

**Priority test targets (highest risk):**

1. `authController.js` — Registration, OTP verification, login, OAuth
2. `signAndHash.js` — RSA signing must never silently fail
3. `riskMemoController.js` — Risk scoring logic
4. `invoiceController.js` — SHA-256 integrity checks
5. RBAC middleware — permission enforcement per role

**Added Value:**

- Confidence to refactor without breaking things
- Catch regressions in crypto/signing (critical for ERM compliance)
- Required for any enterprise deployment
- CI blocks broken code from merging

---

### 2.4 Code Quality — ESLint + Prettier + Husky

**Tools:**

- **ESLint** — Static analysis (catches bugs, enforces patterns)
- **Prettier** — Consistent formatting
- **Husky + lint-staged** — Pre-commit hooks

**Configuration:**

- Backend: `eslint-config-airbnb-base` + `eslint-plugin-security`
- Frontend: `eslint-config-react-app` (extends CRA defaults)
- Shared `.prettierrc`: single quotes, no semicolons (or your preference)

**Added Value:**

- Consistent codebase across all contributors
- Catches common bugs (unused vars, missing awaits, == vs ===)
- `eslint-plugin-security` flags dangerous patterns (eval, exec, SQL injection)
- Pre-commit hooks prevent bad code from entering Git

---

### 2.5 Structured Logging — Winston + Morgan

**Tools:**

- **Winston** — JSON-structured logging with levels (error, warn, info, debug)
- **Morgan** — HTTP request/response logging middleware

**Implementation:**

```
logger.info('Invoice created', {
  invoiceId: invoice._id,
  userId: req.user._id,
  amount: invoice.amount,
  requestId: req.headers['x-request-id'],
  duration: Date.now() - start
});
```

**Log levels by environment:**

- Development: `debug` (verbose, console transport)
- Staging: `info` (file + console)
- Production: `warn` (file + external transport to ELK/CloudWatch)

**Added Value:**

- Replace 100+ scattered `console.log()` calls with structured, queryable logs
- Request correlation via `x-request-id` header
- Log aggregation ready (ELK, CloudWatch, Datadog)
- Performance tracking (response times per endpoint)
- Audit trail for compliance (who did what, when)

---

### 2.6 Monitoring & Alerting

**Tools:**

- **Prometheus** — Metrics collection (request count, latency, error rate)
- **Grafana** — Dashboards and alerting
- **prom-client** — Node.js Prometheus client library
- Alternative: **UptimeRobot** (free) for basic health checks

**Key Metrics to Track:**

| Metric                          | Why                                         |
| ------------------------------- | ------------------------------------------- |
| Request latency (p50, p95, p99) | Detect slow endpoints before users complain |
| Error rate by endpoint          | Catch spikes in 4xx/5xx                     |
| Active MongoDB connections      | Prevent connection pool exhaustion          |
| AI module response time         | Gemini/ML predictions can be slow           |
| Cron job success/failure        | Ensure scheduled reports actually run       |
| JWT token generation rate       | Detect brute-force login attempts           |
| Memory/CPU per container        | Right-size resources                        |

**Health Check Endpoint (backend):**

```
GET /api/health → {
  status: "healthy",
  uptime: 86400,
  mongo: "connected",
  aiModule: "reachable",
  version: "1.0.0",
  timestamp: "2026-06-20T12:00:00Z"
}
```

**Added Value:**

- Know when things break before users report it
- Dashboards for stakeholders (uptime %, response times)
- Alerting: Slack/email when error rate > 5%
- Capacity planning (when to scale)

---

### 2.7 Secrets Management

**Current Problem:** API keys, SMTP passwords, and OAuth credentials are in plaintext `.env` files.

**Solution (by deployment target):**

| Target       | Tool                      | How                                                   |
| ------------ | ------------------------- | ----------------------------------------------------- |
| Local dev    | `.env` + `.env.example`   | Keep `.env` in .gitignore, template in `.env.example` |
| CI/CD        | GitHub Secrets            | Injected as env vars during workflow runs             |
| Staging/Prod | Docker Secrets or AWS SSM | Mounted at runtime, never in images                   |
| Enterprise   | HashiCorp Vault           | Centralized, audited, auto-rotating secrets           |

**Minimum actions:**

1. Rotate all currently exposed keys (Groq API key, Gmail password)
2. Add `MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY` to GitHub Secrets
3. Use Docker secrets in `docker-compose.prod.yml`
4. Never log secrets (Winston filter for sensitive fields)

---

### 2.8 Production Deployment — Nginx + PM2

**Architecture:**

```
Internet → Nginx (SSL/443) → ┬─ /           → Frontend (React static)
                              ├─ /api/*      → Backend (Node:5000)
                              └─ /ai/*       → AiModule (Python:8001)
```

**Tools:**

- **Nginx** — Reverse proxy, SSL termination, static file serving, gzip
- **PM2** — Node.js process manager (cluster mode, auto-restart, log rotation)
- **Let's Encrypt / Certbot** — Free SSL certificates
- **Fail2Ban** — Block brute-force attempts at OS level

**PM2 Ecosystem File:**

- Backend: cluster mode (CPU count instances), max memory restart 512MB
- Watch mode disabled in production
- Log rotation: 10MB max, 30 days retention

---

## 3. DevOps Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        DEVELOPER                             │
│  git push → pre-commit (Husky: lint + format + test)         │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                   GITHUB ACTIONS CI/CD                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────┐ ┌──────────┐ │
│  │  Lint   │→│  Test   │→│  Build  │→│ Scan │→│  Deploy  │ │
│  │ ESLint  │ │  Jest   │ │ Docker  │ │Trivy │ │ SSH/K8s  │ │
│  └─────────┘ └─────────┘ └─────────┘ └──────┘ └──────────┘ │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    PRODUCTION SERVER                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Nginx (SSL + Reverse Proxy + Rate Limit)           │     │
│  └────────┬──────────────┬──────────────┬──────────────┘     │
│           │              │              │                    │
│  ┌────────▼───┐  ┌───────▼──────┐  ┌───▼──────────┐        │
│  │  Frontend  │  │   Backend    │  │  AI Module   │        │
│  │ React/Nginx│  │ PM2 Cluster  │  │  Uvicorn     │        │
│  │  :80       │  │  :5000       │  │  :8001       │        │
│  └────────────┘  └──────┬───────┘  └──────────────┘        │
│                         │                                    │
│                  ┌──────▼───────┐                            │
│                  │  MongoDB 7   │                            │
│                  │  (Replica)   │                            │
│                  └──────────────┘                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Observability: Prometheus + Grafana + Winston logs  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Added Value Summary

| DevOps Feature    | Business Value                                                     |
| ----------------- | ------------------------------------------------------------------ |
| **Docker**        | New developer onboarding: 2 hours → 5 minutes                      |
| **CI/CD**         | Deployment time: manual 30 min → automated 3 min                   |
| **Testing**       | Bug detection: production → development (10x cheaper to fix)       |
| **Monitoring**    | Incident response: hours → minutes (proactive alerts)              |
| **Logging**       | Debugging: guesswork → precise log queries                         |
| **Code Quality**  | Code review time: -40% (linter catches trivial issues)             |
| **Secrets Mgmt**  | Security: eliminate credential exposure risk                       |
| **Health Checks** | Uptime: reactive → proactive (auto-restart on failure)             |
| **SSL/Nginx**     | Trust: HTTPS required for any ERM platform handling financial data |
| **PM2 Cluster**   | Performance: utilize all CPU cores, zero-downtime deploys          |

**For a PFE context specifically:**

- Demonstrates production-readiness awareness
- Shows understanding of real-world software lifecycle
- Adds "DevOps" as a keyword to your project presentation
- Differentiates from typical student projects that stop at "it works on my machine"

---

## 5. Implementation Roadmap

### Phase 1 — Foundation (Week 1-2) 🔴 Critical

| Task                                                         | Time  | Priority |
| ------------------------------------------------------------ | ----- | -------- |
| Create `Dockerfile` for backend, frontend, AiModule          | 4h    | P0       |
| Create `docker-compose.yml` with all services + MongoDB      | 2h    | P0       |
| Add `.dockerignore` files                                    | 30min | P0       |
| Install & configure ESLint + Prettier                        | 2h    | P0       |
| Setup Husky + lint-staged pre-commit hooks                   | 1h    | P0       |
| Replace `console.log` with Winston logger (backend)          | 3h    | P1       |
| Add Morgan HTTP request logging middleware                   | 30min | P1       |
| Add `/api/health` endpoint to backend                        | 1h    | P1       |
| Move secrets to `.env.example` template, rotate exposed keys | 1h    | P0       |
| Fix CORS: restrict to specific origins                       | 30min | P1       |

**Deliverable:** `docker compose up` runs the entire stack. Code quality enforced on commit.

---

### Phase 2 — Automation (Week 3-4) 🟡 High

| Task                                             | Time  | Priority |
| ------------------------------------------------ | ----- | -------- |
| Create GitHub Actions `ci.yml` (lint + build)    | 2h    | P0       |
| Write Jest unit tests for `authController`       | 4h    | P0       |
| Write Jest unit tests for `signAndHash.js`       | 2h    | P0       |
| Write Jest unit tests for `invoiceController`    | 3h    | P1       |
| Write Supertest integration tests for auth flow  | 3h    | P1       |
| Add test coverage reporting (Istanbul/nyc)       | 1h    | P1       |
| Setup GitHub branch protection (require CI pass) | 30min | P1       |
| Create `cd-staging.yml` workflow                 | 2h    | P2       |

**Deliverable:** Every push runs lint + tests. PRs cannot merge if CI fails.

---

### Phase 3 — Production Readiness (Week 5-6) 🟢 Medium

| Task                                                      | Time  | Priority |
| --------------------------------------------------------- | ----- | -------- |
| Write Cypress E2E tests (login → dashboard → report)      | 6h    | P1       |
| Configure Nginx reverse proxy + SSL                       | 3h    | P1       |
| Create PM2 ecosystem config                               | 1h    | P1       |
| Setup `docker-compose.prod.yml` with production overrides | 2h    | P1       |
| Add Prometheus metrics with `prom-client`                 | 3h    | P2       |
| Create Grafana dashboard (request rate, errors, latency)  | 2h    | P2       |
| Setup UptimeRobot for external health monitoring          | 30min | P2       |
| Security scan: `npm audit`, Trivy on Docker images        | 1h    | P1       |

**Deliverable:** Production-deployable with monitoring, SSL, and E2E test coverage.

---

### Phase 4 — Scale & Optimize (Week 7+) 🔵 Future

| Task                                              | Time | Priority |
| ------------------------------------------------- | ---- | -------- |
| MongoDB replica set for high availability         | 4h   | P2       |
| Kubernetes manifests (if scaling beyond 1 server) | 8h   | P3       |
| Redis caching for dashboard queries               | 3h   | P2       |
| CDN for frontend static assets                    | 1h   | P3       |
| Load testing with Artillery or k6                 | 3h   | P2       |
| Database backup automation (mongodump cron)       | 2h   | P1       |
| Log aggregation (ELK stack or CloudWatch)         | 4h   | P3       |
| SonarQube for continuous code quality analysis    | 3h   | P3       |

**Deliverable:** Scalable, resilient infrastructure ready for multi-tenant SaaS.

---

## 6. Quick-Win Checklist (Do Today)

These take under 30 minutes each and have immediate impact:

- [ ] Add `/api/health` endpoint returning `{ status, uptime, mongo, version }`
- [ ] Create `.dockerignore` in backend/ and frontend/
- [ ] Fix CORS: change `origin: '*'` to `origin: ['http://localhost:3000']`
- [ ] Add `npm test` script to `package.json` (even if empty — CI needs it)
- [ ] Create `.env.example` with all keys documented (no real values)
- [ ] Add `engines` field to `package.json`: `"node": ">=18"`

---

## 7. Tool Comparison Matrix

| Tool                     | Free Tier          | Complexity | Fit for Tac-Tic                  |
| ------------------------ | ------------------ | ---------- | -------------------------------- |
| **GitHub Actions**       | 2000 min/mo        | Low        | ✅ Best — native Git integration |
| **GitLab CI**            | 400 min/mo         | Medium     | Good alternative                 |
| **Jenkins**              | Self-hosted        | High       | Overkill for this project        |
| **Docker Compose**       | Free               | Low        | ✅ Perfect for 3-service stack   |
| **Kubernetes**           | Complex            | High       | Phase 4 only (SaaS scale)        |
| **Jest**                 | Free               | Low        | ✅ Standard for Node.js          |
| **Cypress**              | Free               | Medium     | ✅ Best E2E for React apps       |
| **Winston**              | Free               | Low        | ✅ Standard Node.js logger       |
| **Prometheus + Grafana** | Free               | Medium     | ✅ Industry standard monitoring  |
| **UptimeRobot**          | Free (50 monitors) | Very Low   | ✅ Quick external health check   |
| **SonarQube**            | Community free     | Medium     | Nice-to-have for code quality    |

---

_This report was generated based on a full analysis of the Tac-Tic ERM codebase structure, dependencies, middleware, and architecture._
