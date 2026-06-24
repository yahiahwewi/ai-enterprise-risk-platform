# DevOps Traceability — Tac-Tic ERM

Evidence folder documenting the DevOps implementation, intended for the academic
report (PFE). Everything here is real, captured output — not mock-ups.

**Dates:** 20–24 June 2026 · **Branch:** `devops/phase-1` · **Maturity:** ~15% → ~85%

## Contents

| Path                                                                       | What it is                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`00_JOURNAL.md`](00_JOURNAL.md)                                           | Chronological trace of every step (the main narrative) |
| [`logs/01_test_run.txt`](logs/01_test_run.txt)                             | Jest output — **36 tests passing** (4 suites)          |
| [`logs/02_lint_format.txt`](logs/02_lint_format.txt)                       | ESLint + Prettier — clean (exit 0)                     |
| [`logs/03_docker_build.txt`](logs/03_docker_build.txt)                     | Docker build result + bugs found & fixed               |
| [`logs/04_stack_health_endpoints.txt`](logs/04_stack_health_endpoints.txt) | Running stack — all 4 endpoints HTTP 200               |
| [`logs/05_git_history.txt`](logs/05_git_history.txt)                       | Commit log + Phase 1 diffstat (35 files)               |
| [`reports/DEVOPS_AUDIT.md`](reports/DEVOPS_AUDIT.md)                       | Adversarial audit — 9 confirmed issues + fixes         |
| [`reports/BEFORE_AFTER.md`](reports/BEFORE_AFTER.md)                       | Avant/Après comparison table                           |
| [`reports/ROADMAP.md`](reports/ROADMAP.md)                                 | 4-phase roadmap with current status per item           |
| [`reports/BRANCH_PROTECTION.md`](reports/BRANCH_PROTECTION.md)             | How to enable branch protection (gh + UI)              |
| [`diagrams/devops_architecture.svg`](diagrams/devops_architecture.svg)     | Pipeline + runtime architecture figure                 |
| [`diagrams/devops_maturity.svg`](diagrams/devops_maturity.svg)             | Before/after maturity chart figure                     |
| [`diagrams/devops_roadmap.svg`](diagrams/devops_roadmap.svg)               | 4-phase roadmap status figure                          |
| [`screenshots/README.md`](screenshots/README.md)                           | Commands to capture live PNG screenshots               |

## How to cite in the report

- **Methodology / steps** → `00_JOURNAL.md`
- **Quality assurance** (test/lint proof) → `logs/01`, `logs/02`
- **Verification rigor** (how bugs were caught) → `reports/DEVOPS_AUDIT.md`, `logs/03`, `logs/04`
- **Figures** → the three SVGs in `diagrams/`
- **Results summary** → `reports/BEFORE_AFTER.md`
- **Roadmap / current status** → `reports/ROADMAP.md` + `diagrams/devops_roadmap.svg`

## Related (project root)

- `DEVOPS_REPORT.md` — full analysis + 4-phase roadmap
- `DEVOPS_SETUP.md` — setup/run commands
