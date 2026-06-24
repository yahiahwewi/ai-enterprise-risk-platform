# Branch Protection — setup guide

Branch protection is a **GitHub repository setting** (it changes access controls
on `main`), so it must be applied by a repo admin — it is documented here rather
than applied automatically. Repo: `github.com/yahiahwewi/ai-enterprise-risk-platform`.

## Goal
Make `main` un-pushable directly; require a PR that passes CI before merge.

## Option A — GitHub UI
Settings → Branches → Add branch ruleset (or "Add rule") for `main`:
- ☑ Require a pull request before merging
- ☑ Require status checks to pass before merging →
  add: **Lint & Format**, **Backend Tests**, **Frontend Build**, **Docker Build**
- ☑ Require branches to be up to date before merging
- ☑ Do not allow bypassing the above settings

## Option B — `gh` CLI (one command)
```bash
gh api -X PUT repos/yahiahwewi/ai-enterprise-risk-platform/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f "required_pull_request_reviews[required_approving_review_count]=0" \
  -F "enforce_admins=true" \
  -F "restrictions=null" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=Lint & Format" \
  -f "required_status_checks[contexts][]=Backend Tests" \
  -f "required_status_checks[contexts][]=Frontend Build" \
  -f "required_status_checks[contexts][]=Docker Build"
```
> The status-check names must match the `name:` of each job in `.github/workflows/ci.yml`.
> They only become selectable after the CI workflow has run at least once on the repo
> (i.e. after the first push of this branch + a PR).

## Prerequisite
Push the work and open a PR first:
```bash
git push -u origin devops/phase-1
gh pr create --base main --head devops/phase-1 --title "DevOps: containerization, CI/CD, logging, tests" --fill
```
(Push is an outward-facing action — run it yourself when ready.)
