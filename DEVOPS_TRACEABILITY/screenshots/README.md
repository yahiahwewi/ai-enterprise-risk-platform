# Screenshots — capture guide

The DevOps evidence is primarily **terminal output** (in [`../logs/`](../logs/)) and
**vector figures** (in [`../diagrams/`](../diagrams/), embeddable directly in LaTeX/Word).

To capture live PNG screenshots for the report, run the commands below and screenshot
the terminal/browser. (Reproduces the exact evidence already recorded in `../logs/`.)

## 1. Tests passing (Jest)

```bash
cd backend && npx jest
```

→ Expect `Test Suites: 3 passed`, `Tests: 27 passed`. Screenshot the summary.
Filename suggestion: `screenshots/01_jest_27_passing.png`

## 2. Lint + format clean

```bash
npm run lint:backend
npm run format:check
```

→ Both exit 0, "All matched files use Prettier code style!".
`screenshots/02_lint_format_green.png`

## 3. Docker images built

```bash
docker compose build           # (start Docker Desktop first)
docker images --filter reference=project*
```

→ Shows `project-backend`, `project-frontend`, `project-aimodule`.
`screenshots/03_docker_images.png`

## 4. Running stack + health endpoint

```bash
docker compose up -d
curl http://localhost:5000/api/health
```

→ `{"status":"healthy","mongo":"connected","aiModule":"reachable", ...}`
`screenshots/04_health_endpoint.png`

> NOTE: a local MongoDB on port 27017 conflicts with the compose `mongo` service.
> Either stop the local Mongo first, or change the host port mapping.

## 5. CI pipeline (after pushing to GitHub)

Open the repo → **Actions** tab → screenshot the green `CI` workflow run
(lint / test / build / docker jobs).
`screenshots/05_github_actions_ci.png`

## Figures already provided (no capture needed)

- `../diagrams/devops_architecture.svg` — pipeline + runtime architecture
- `../diagrams/devops_maturity.svg` — before/after maturity chart
