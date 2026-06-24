# DevOps Traceability — Tac-Tic ERM

Evidence folder documenting the DevOps implementation, intended for the academic
report (PFE). Everything here is real, captured output — not mock-ups.

**Work date:** 2026-06-20 · **Branch:** `devops/phase-1` · **Maturity:** ~15% → ~85%

## Contents

| Path                                                                       | What it is                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`00_JOURNAL.md`](00_JOURNAL.md)                                           | Chronological trace of every step (the main narrative) |
| [`logs/01_test_run.txt`](logs/01_test_run.txt)                             | Jest output — **27 tests passing** (3 suites)          |
| [`logs/02_lint_format.txt`](logs/02_lint_format.txt)                       | ESLint + Prettier — clean (exit 0)                     |
| [`logs/03_docker_build.txt`](logs/03_docker_build.txt)                     | Docker build result + bugs found & fixed               |
| [`logs/04_stack_health_endpoints.txt`](logs/04_stack_health_endpoints.txt) | Running stack — all 4 endpoints HTTP 200               |
| [`logs/05_git_history.txt`](logs/05_git_history.txt)                       | Commit log + Phase 1 diffstat (35 files)               |
| [`reports/DEVOPS_AUDIT.md`](reports/DEVOPS_AUDIT.md)                       | Adversarial audit — 9 confirmed issues + fixes         |
| [`reports/BEFORE_AFTER.md`](reports/BEFORE_AFTER.md)                       | Avant/Après comparison table                           |
| [`diagrams/devops_architecture.svg`](diagrams/devops_architecture.svg)     | Pipeline + runtime architecture figure                 |
| [`diagrams/devops_maturity.svg`](diagrams/devops_maturity.svg)             | Before/after maturity chart figure                     |
| [`screenshots/README.md`](screenshots/README.md)                           | Commands to capture live PNG screenshots               |

## How to cite in the report

- **Methodology / steps** → `00_JOURNAL.md`
- **Quality assurance** (test/lint proof) → `logs/01`, `logs/02`
- **Verification rigor** (how bugs were caught) → `reports/DEVOPS_AUDIT.md`, `logs/03`, `logs/04`
- **Figures** → the two SVGs in `diagrams/`
- **Results summary** → `reports/BEFORE_AFTER.md`

## Related (project root)

- `DEVOPS_REPORT.md` — full analysis + 4-phase roadmap
- `DEVOPS_SETUP.md` — setup/run commands
