# DevOps Setup Guide — Tac-Tic ERM

This guide covers the Phase 1 DevOps infrastructure that was added to the project.
See [DEVOPS_REPORT.md](DEVOPS_REPORT.md) for the full analysis and roadmap.

---

## What was added

| File                                                                          | Purpose                                        |
| ----------------------------------------------------------------------------- | ---------------------------------------------- |
| `backend/Dockerfile`, `frontend/Dockerfile`, `AiModule/Dockerfile`            | Containerize each service                      |
| `*/.dockerignore`                                                             | Keep images small & secret-free                |
| `docker-compose.yml`                                                          | Run the full stack (Mongo + 3 services)        |
| `docker-compose.dev.yml`                                                      | Dev override with hot-reload                   |
| `docker-compose.prod.yml`                                                     | Prod override with SSL edge proxy              |
| `frontend/nginx.conf`                                                         | Serve React + proxy `/api` and `/ai`           |
| `nginx/nginx.prod.conf`                                                       | Production edge proxy + SSL + security headers |
| `backend/ecosystem.config.js`                                                 | PM2 cluster mode for non-Docker deploys        |
| `backend/utils/logger.js` + `redact.js`                                       | Winston structured logging (secret-redacting)  |
| `backend/jest.config.js` + `__tests__/`                                       | Jest test harness                              |
| `backend/.eslintrc.json`, `frontend/.eslintrc.json`, `.prettierrc`, `.husky/` | Code quality + pre-commit hooks                |
| `.github/workflows/ci.yml`                                                    | Lint → test → build → docker on every push     |
| `.github/workflows/security.yml`                                              | npm audit + Trivy + Gitleaks                   |
| `.github/dependabot.yml`                                                      | Automated weekly dependency PRs                |
| `/api/health` endpoint                                                        | Liveness + Mongo + AI-module status            |

---

## 1. First-time setup

```bash
# From the project root
npm install                 # installs husky, eslint, prettier, lint-staged
cd backend && npm install   # installs winston, morgan, jest, supertest, eslint
cd ../frontend && npm install
```

`npm install` at the root runs the `prepare` script, which activates Husky git hooks.

---

## 2. Run with Docker (recommended)

```bash
# FIRST: create the backend secrets file (compose mounts it via env_file).
# Without it, `docker compose up` fails — the backend needs JWT_SECRET etc.
cp backend/.env.example backend/.env   # then fill in the real secrets

# Production-like (Nginx serves frontend, all services networked)
docker compose up --build
# → frontend at http://localhost  (port 80)
# → backend  at http://localhost:5000
# → AI       at http://localhost:8001

# Development (hot-reload for backend + frontend)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# → frontend dev server at http://localhost:3000

# Stop
docker compose down
```

Set `REACT_APP_GOOGLE_CLIENT_ID` in a root `.env` (see `.env.example`) before building the frontend.
Backend secrets stay in `backend/.env`.

---

## 3. Run without Docker

```bash
npm run dev          # runs backend + frontend + AI concurrently
# or individually:
npm run dev:backend
npm run dev:frontend
npm run dev:ai
```

---

## 4. Code quality

```bash
npm run lint           # eslint backend + frontend
npm run format         # prettier --write across the repo
npm run format:check   # CI-style check (no writes)
```

On every `git commit`, Husky runs `lint-staged` — Prettier + ESLint auto-fix on staged files only.

---

## 5. Testing

```bash
cd backend
npm test               # jest
npm run test:coverage  # jest with coverage report
```

A starter test exists at `backend/__tests__/redact.test.js` (validates secret redaction).
Expand coverage per Phase 2 of the roadmap (auth flow, signing, RBAC).

---

## 6. Production deployment

### Option A — Docker + SSL edge proxy

```bash
# 1. Point your domain's DNS at the server
# 2. Edit nginx/nginx.prod.conf — replace every "your-domain.com" with your domain
# 3. Bootstrap the TLS cert (chicken-and-egg: nginx's 443 block won't load
#    until the cert exists, so issue it with a standalone certbot run first):
docker run --rm -p 80:80 \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --standalone -d your-domain.com --agree-tos -m you@example.com
# 4. Now bring the full stack up (edge nginx can load the cert):
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# 5. Renewal (cron): certbot renew + `docker compose exec edge nginx -s reload`
```

> The `certbot/conf` and `certbot/www` directories are committed (with `.gitkeep`)
> so the bind-mounts resolve to real dirs. Certs land in `certbot/conf/live/<domain>/`.

### Option B — PM2 (bare metal / VM)

```bash
cd backend
npm ci --omit=dev
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

---

## 7. Secrets — IMPORTANT

The keys currently in `backend/.env` (Groq API key, Gmail app password, Google OAuth ID)
should be **rotated** and moved to:

- **CI:** GitHub repository secrets (Settings → Secrets and variables → Actions)
- **Prod:** Docker secrets or the host's environment, never baked into images

The Gitleaks workflow will flag any secret accidentally committed to git history.

---

## Health check

```bash
curl http://localhost:5000/api/health
# { "status": "healthy", "uptime": 42, "mongo": "connected",
#   "aiModule": "reachable", "version": "1.0.0", ... }
```
