# Full Deployment Plan — Tac-Tic ERM (Azure for Students + Vercel)

From the current state (Phase 1–2 done, CI green, images build) to a **live, public,
HTTPS deployment** — using **Azure for Students** ($100 credit, no card) for the
backend + AI + database, and **Vercel** (free Hobby) for the React frontend.

---

## 0. Target architecture

```
                       ┌──────────────────────────┐
   users ──HTTPS──▶    │  Vercel (frontend)        │   React build, global CDN
                       │  app.vercel.app           │   auto-HTTPS, auto-deploy
                       └─────────────┬────────────┘
                                     │  REACT_APP_API_URL → calls backend
                                     ▼
            ┌────────────────────────────────────────────────┐
            │  Azure Container Apps  (environment: tactic-env) │   auto-HTTPS *.azurecontainerapps.io
            │  ┌─────────────────┐      ┌──────────────────┐  │   scale-to-zero, free monthly grant
            │  │ tactic-backend  │──────▶  tactic-aimodule │  │
            │  │ Node :5000 2GiB │      │ FastAPI :8001    │  │
            │  └────────┬────────┘      └──────────────────┘  │
            └───────────┼────────────────────────────────────┘
                        │  MONGO_URI
                        ▼
              ┌──────────────────────┐
              │  MongoDB Atlas  M0   │   free 512MB cluster
              └──────────────────────┘

   Images:  GHCR (ghcr.io/yahiahwewi/tactic-*)  — free, pushed by GitHub Actions
   Secrets: GitHub Actions secrets + Azure Container App secrets
```

**Why this split:** Vercel is purpose-built for React (free, instant HTTPS, CDN).
Azure Container Apps runs our existing Docker images, scales to zero (saves student
credit), and gives managed HTTPS — so **no nginx/certbot needed in the cloud** (the
`nginx.prod.conf` path stays as the self-hosted/VM alternative). Atlas M0 is free
forever and simpler than Cosmos DB.

**Estimated cost:** ~**$0–5/month** (Vercel free, Atlas free, Container Apps free
monthly grant covers a low-traffic demo, GHCR free). Comfortably inside the $100 credit.

---

## ⚠️ Required code changes BEFORE deploying (frontend can't reach a remote API yet)

1. **`frontend/src/services/api.js`** — currently hardcoded:
   ```js
   baseURL: 'http://localhost:5000/api',   // ❌ won't work from Vercel
   ```
   change to:
   ```js
   baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
   ```
2. **Hardcoded absolute URLs** — replace `http://localhost:5000` in:
   - `frontend/src/pages/InvestigationDetail.js` (PDF `window.open(...)`)
   - any other `http://localhost:5000` literal (grep for it)
     Build them from `process.env.REACT_APP_API_URL`.
3. **Backend CORS** — already env-driven; just set `CORS_ORIGINS` to the Vercel URL.
4. **Google OAuth** — add the Vercel domain to _Authorized JavaScript origins_ in
   Google Cloud Console (otherwise Google login breaks on the live site).

> ✅ Changes 1 & 2 are **DONE** (commit `88ce7ea`): `api.js` exports `API_BASE`
> from `REACT_APP_API_URL`, and the hardcoded PDF/export URLs in
> InvestigationDetail / Invoices / Transactions now use it. The frontend
> Dockerfile + compose pass `REACT_APP_API_URL` (default `/api`). Verified: the
> build succeeds and bakes the URL into the bundle.

---

## Phase A — Accounts & tooling (30 min)

- [ ] Activate **Azure for Students**: https://azure.microsoft.com/free/students (verify with academic email — no credit card).
- [ ] Create a **MongoDB Atlas** account (free).
- [ ] Create a **Vercel** account (sign in with GitHub).
- [ ] Install CLIs: `az` (Azure CLI), `vercel` (optional), `gh` (GitHub CLI).
- [ ] `az login` and `az account show` to confirm the student subscription.

## Phase B — Database: MongoDB Atlas (20 min)

- [ ] Create a free **M0** cluster (region close to your Azure region, e.g. West Europe).
- [ ] DB user + password; **Network Access → allow 0.0.0.0/0** for the demo (tighten later to Azure outbound IPs).
- [ ] Copy the `mongodb+srv://...` connection string → this is `MONGO_URI`.

## Phase C — Images: GHCR (already automated)

- [ ] `cd-staging.yml` already builds + pushes `ghcr.io/yahiahwewi/tactic-{backend,frontend,aimodule}`.
- [ ] Make the **backend** and **aimodule** packages **public** in GitHub (Packages → settings) so Azure can pull without registry creds — or pass a PAT in Phase D.
- [ ] Trigger it: push to `develop` or run the workflow manually (Actions → CD — Staging → Run).

## Phase D — Backend + AI on Azure Container Apps (45 min)

```bash
az extension add --name containerapp --upgrade
az group create --name tactic-rg --location westeurope
az containerapp env create --name tactic-env --resource-group tactic-rg --location westeurope

# --- AI module first (backend needs its URL) ---
az containerapp create \
  --name tactic-aimodule --resource-group tactic-rg --environment tactic-env \
  --image ghcr.io/yahiahwewi/tactic-aimodule:staging \
  --target-port 8001 --ingress external \
  --cpu 0.5 --memory 1.0Gi --min-replicas 1 --max-replicas 2
# note the returned FQDN, e.g. https://tactic-aimodule.<hash>.westeurope.azurecontainerapps.io

# --- Backend (needs 2GiB for Chromium/Tesseract) ---
az containerapp create \
  --name tactic-backend --resource-group tactic-rg --environment tactic-env \
  --image ghcr.io/yahiahwewi/tactic-backend:staging \
  --target-port 5000 --ingress external \
  --cpu 1.0 --memory 2.0Gi --min-replicas 1 --max-replicas 3 \
  --secrets mongo="<ATLAS_URI>" jwt="<JWT_SECRET>" groq="<GROQ_KEY>" smtp="<SMTP_PASS>" \
  --env-vars NODE_ENV=production PORT=5000 \
             MONGO_URI=secretref:mongo JWT_SECRET=secretref:jwt \
             GROQ_API_KEY=secretref:groq SMTP_PASS=secretref:smtp \
             AI_MODULE_URL="https://<aimodule-fqdn>" \
             CORS_ORIGINS="https://<your-vercel-domain>"
```

- [ ] If GHCR packages are private, add: `--registry-server ghcr.io --registry-username <gh-user> --registry-password <PAT-with-read:packages>`
- [ ] Verify: `curl https://<backend-fqdn>/api/health` → `{"status":"healthy","mongo":"connected"}`

## Phase E — Frontend on Vercel (20 min)

- [ ] Vercel → **New Project** → import `ai-enterprise-risk-platform`.
- [ ] **Root Directory = `frontend`**, Framework = Create React App (auto-detected).
- [ ] Environment Variables:
  - `REACT_APP_API_URL = https://<backend-fqdn>/api`
  - `REACT_APP_GOOGLE_CLIENT_ID = <your client id>`
- [ ] Deploy → get `https://<project>.vercel.app`.
- [ ] Go back and set the backend's `CORS_ORIGINS` to this exact Vercel URL
      (`az containerapp update --name tactic-backend -g tactic-rg --set-env-vars CORS_ORIGINS=https://<project>.vercel.app`).
- [ ] Add the Vercel URL to Google OAuth authorized origins.

## Phase F — CI/CD automation (production)

Add `.github/workflows/cd-production.yml`: on push to `main` (or a `v*` tag) →
build + push images to GHCR → deploy to Azure with `az containerapp update`.

```yaml
# auth to Azure via OIDC (recommended) or AZURE_CREDENTIALS secret
- uses: azure/login@v2
  with: { creds: ${{ secrets.AZURE_CREDENTIALS }} }
- run: |
    az containerapp update -n tactic-backend  -g tactic-rg --image ghcr.io/yahiahwewi/tactic-backend:${{ github.sha }}
    az containerapp update -n tactic-aimodule -g tactic-rg --image ghcr.io/yahiahwewi/tactic-aimodule:${{ github.sha }}
```

- Frontend needs no workflow — **Vercel auto-deploys** on every push to `main`.
- Create the Azure service principal: `az ad sp create-for-rbac --role contributor --scopes /subscriptions/<id>/resourceGroups/tactic-rg --sdk-auth` → paste JSON into the `AZURE_CREDENTIALS` GitHub secret.

## Phase G — Observability & hardening

- [ ] **Logs:** Container Apps stream to Azure Log Analytics automatically — `az containerapp logs show -n tactic-backend -g tactic-rg --follow`. Our Winston JSON logs are queryable there.
- [ ] **Metrics/alerts:** enable Azure Application Insights (or use the built-in Container Apps metrics) — alert on 5xx rate + replica restarts.
- [ ] **Health probes:** set the Container App liveness/readiness probe to `GET /api/health`.
- [ ] **Atlas:** restrict network access from 0.0.0.0/0 to the Container Apps environment's outbound IPs; enable Atlas backups.
- [ ] **Secrets:** rotate the keys currently in `backend/.env` once moved to Azure secrets; never commit real values.
- [ ] **Branch protection** on `main` (see `DEVOPS_TRACEABILITY/reports/BRANCH_PROTECTION.md`).

## Phase H — Cost control (student credit)

- [ ] Set `min-replicas 0` on the AI app after the demo (scale-to-zero) to stop paying when idle. Keep backend at `min 1` only during the defense to avoid cold starts.
- [ ] Azure Portal → **Cost Management → Budgets**: set a $20 alert.
- [ ] Stop everything when not needed: `az containerapp update --min-replicas 0` or delete the resource group `az group delete -n tactic-rg` (recreate from CI when needed).

---

## End-to-end status checklist

| Step                                                      | Status                              |
| --------------------------------------------------------- | ----------------------------------- |
| Code: env-driven API base URL (`api.js` + hardcoded URLs) | ✅ done (`88ce7ea`)                 |
| cd-production.yml (auto-deploy on main)                   | ✅ done (workflow added)            |
| Images on GHCR (cd-staging / cd-production)               | ✅ workflows ready — need first run |
| Atlas M0 cluster + MONGO_URI                              | ☐ (user — needs account)            |
| Backend + AI on Azure Container Apps                      | ☐ (user — `az` cmds, Phase D)       |
| Frontend on Vercel                                        | ☐ (user — import repo + env)        |
| Env + CORS + Google origins wired                         | ☐ (user)                            |
| Monitoring + health probe + budget alert                  | ☐ (user)                            |
| Branch protection + push branch/PR                        | ☐ (user)                            |

**Code blockers are cleared.** Next action is yours: create the Atlas cluster +
Azure/Vercel accounts, then run the `az` / Vercel steps (Phases B–E). Pushing the
branch triggers `cd-production` which populates GHCR automatically.
