# Pre-Redeployment Readiness Note
**Date:** 2026-05-18  
**Track:** codecamp_pre_redeploy_remediation_20260518

---

## Production Redeploy Update (2026-05-18)

**Redeployment status:** complete.  
**Cloud Build image deploy:** `6e53d3fe-4520-45bf-a6a1-292cfde07dfc` succeeded.  
**Cloud Run revision:** `codecamp-advantage-00008-mtb` at `https://codecamp-advantage-ztca52e74q-as.a.run.app`.  
**Create-intern hotfix deploy:** `1cbca5ca-92be-4d8a-a73e-1f8c4d0e506b` succeeded; latest revision is `codecamp-advantage-00009-xwv`.  
**Custom domain:** `https://codecamp.reading-advantage.com/th` returned `200`.

### Database Migration / Seed

- Built migration image `codecamp-migrate:20260518121743` (`82415c42-578d-4647-aabb-12158ddfa97f` succeeded).
- `drizzle-kit migrate` failed in Cloud Run without surfacing the underlying SQL error in logs.
- Verified production had no duplicate `codecamp_exercise_repos.repo_url` or `codecamp_pr_reviews.pr_url` rows.
- Applied the pending DB changes directly through the Cloud Run job:
  - `codecamp_exercise_repos_repo_url_unique`
  - `codecamp_pr_reviews_pr_url_unique`
  - `codecamp_webhook_events`
- Applied `0012_codecamp_intern_role.sql` after production admin QA exposed that the existing Postgres `role` enum did not include `INTERN`.
- Reconfigured `codecamp-db-migrate` as an idempotent reconcile job that applies the Codecamp enum/index/webhook-table migrations and then runs `pnpm --dir packages/db seed:codecamp`.
- Seed job completed successfully: all 18 existing modules had metadata updated.

### Production Smoke Tests

- `GET /th` on run.app: `200`
- `GET /th` on custom domain: `200`
- Unsigned GitHub webhook POST: `401 {"error":"Missing signature"}`
- Invalid login: `401 {"message":"Invalid username or password"}`
- Bootstrap admin login: `200`
- Authenticated dashboard tRPC query: `200`, includes `85` total lessons
- Authenticated webhook diagnostics tRPC query: `200`, returned `[]`
- `/th/admin`: `200`
- Authenticated `codecamp.listInterns` tRPC query after `INTERN` enum migration: `200`, returned `[]`
- Browser QA on `/th/admin/new-intern`: username entry auto-filled GitHub username with the same value until the GitHub field was edited.
- Cloud Run service error logs after revision `codecamp-advantage-00009-xwv`: none returned for the post-hotfix window.
- Recent Cloud Run service error logs: none returned for `codecamp-advantage`
- Signed unmatched PR webhook diagnostic: `200 {"received":true,"ignored":"No matching exercise repo"}` with delivery `codex-diagnostic-20260518`; authenticated `webhookEvents` query returned the inserted row with outcome `ignored`.

### GitHub App Verification

- Production GitHub App credentials are present in GCP Secret Manager.
- Required permissions verified: Contents read, Pull requests write, Issues read.
- Installed expected repos: 16/18.
- Missing repos: `codecamp-portfolio-website`, `codecamp-learning-dashboard`.
- Attempted install via `gh api`, but GitHub returned HTTP 403: the authenticated user cannot modify this app installation on `Reading-Advantage-Thailand`.

Remaining production QA blocker: a real fork→PR→review E2E still requires the GitHub App to be installed on the two portfolio repos, or the E2E should use one of the 16 already-installed repos.

## Summary of Resolved Issues

### Critical / P0 — All Resolved

| # | Issue | Resolution |
|---|-------|------------|
| 1 | Module progression deadlock: quizzes marked complete regardless of score | Fixed — `submitQuizAnswers` enforces 70% pass threshold (`QUIZ_PASS_THRESHOLD = 70`). Scores below 70 stay `in_progress`. |
| 2 | Theory lessons had no completion action | Fixed — `markTheoryComplete` domain fn + `markTheoryLessonComplete` tRPC procedure + `TheoryCompleteButton` on lesson page. |
| 3 | GitHub PR review unattributable (no GitHub username on intern accounts) | Fixed — `githubUsername` field wired into intern create/edit flows, normalized and stored. Admin can set/update via detail page. |
| 4 | PR URL not validated server-side against exercise repo | Fixed — `submitPrForReview` validates URL format, github.com hostname, PR path structure, and repo name match. |
| 5 | Seed skipped existing modules (not idempotent for updates) | Fixed — seed now upserts modules via `onConflictDoUpdate`. Stale placeholder slugs are unpublished. |
| 6 | `codecamp-portfolio-website` missing from GitHub | Created at `https://github.com/Reading-Advantage-Thailand/codecamp-portfolio-website` |
| 7 | `codecamp-learning-dashboard` missing from GitHub | Created at `https://github.com/Reading-Advantage-Thailand/codecamp-learning-dashboard` |

### P1 — Resolved

| # | Issue | Resolution |
|---|-------|------------|
| 8 | Assessment rubrics missing | Created `apps/codecamp-advantage/docs/assessment-rubric.md` |
| 9 | Pacing guidance missing | Created `apps/codecamp-advantage/docs/pacing-guide.md` |
| 10 | Lesson-page chrome had hardcoded English strings | 13 strings moved to `messages/en.json` + `messages/th.json` (`lesson.*` namespace) |

---

## Test Results (2026-05-18, refreshed before redeploy)

| Package | Tests | Status |
|---------|-------|--------|
| `@reading-advantage/db` | 150 passed | ✅ |
| `@reading-advantage/domain` | 202 passed | ✅ |
| `@reading-advantage/api` | 94 passed | ✅ |
| `@reading-advantage/webhooks` | 33 passed | ✅ |
| `codecamp-advantage` | 525 passed | ✅ |
| **Total** | **1004 passed** | ✅ |

- `pnpm turbo run check-types --filter=codecamp-advantage` — **0 errors**
- `pnpm turbo run lint --filter=codecamp-advantage` — **0 errors**
- `pnpm turbo run build --filter=codecamp-advantage` — **successful**

### Create-Intern Hotfix Validation

- `pnpm --filter @reading-advantage/domain test -- src/__tests__/codecamp-github-identity.test.ts` — **15 passed**
- `pnpm --filter @reading-advantage/domain check-types` — **0 errors**
- `pnpm --filter @reading-advantage/api check-types` — **0 errors**
- `pnpm --filter codecamp-advantage test -- lib/__tests__/i18n-admin-keys.test.ts lib/__tests__/i18n-key-parity.test.ts` — **372 passed**
- `pnpm turbo run check-types --filter=codecamp-advantage` — **0 errors**
- `pnpm turbo run lint --filter=codecamp-advantage` — **0 errors**
- `pnpm turbo run build --filter=codecamp-advantage` — **successful**

---

## Remaining Blockers (Post-Redeploy)

### Blocker 1: GitHub App Not Installed on New Portfolio Repos
**Impact:** PR review webhook will not fire on `codecamp-portfolio-website` or `codecamp-learning-dashboard`.  
**Action Required:** Org owner must install the GitHub App on both new repos via GitHub App settings → Install → select repos.  
**Docs:** `apps/codecamp-advantage/docs/github-app-setup.md`

### Blocker 2: Fork→PR→LLM Review E2E Not Yet Run
**Impact:** The live webhook/LLM review pipeline has not been validated with a real PR after redeploy.  
**Action Required:** Run one real fork-to-PR cycle on a test account. Prefer an already-installed exercise repo if the two portfolio repo installs remain blocked.

### Blocker 3: Portfolio Repo Starter Content
**Impact:** Interns landing on the portfolio repos see only a default README.  
**Action Required:** Add a starter scaffold (HTML template for portfolio-website, basic Next.js for learning-dashboard) and acceptance criteria to each repo's README.  
**Severity:** Medium — doesn't block redeployment itself but blocks intern use of those projects.

---

## Medium/Low Findings Remaining (Non-Blocking)

| Item | Severity | Decision |
|------|----------|----------|
| Webhook async retry/dead-letter queue | Medium | Deferred to infra track |
| Module 18 `WorkflowTracker` uses hardcoded issue data | Medium | Deferred — needs GitHub Issues API integration |
| Exercise repo README accuracy audit | Low | Deferred — manual per-repo audit needed |
| Admin unmatched-webhook diagnostic view | Low | Resolved — durable `codecamp_webhook_events` table plus `/th/admin` diagnostics panel |
| Duplicate `generateReview` LLM implementation | Medium | Deferred to package extraction track |
| `proxy.ts` admin guard checks cookie only | High | Pre-existing tech debt — not introduced by this track |

---

## Redeployment Status

**✅ REDEPLOYED**

The Codecamp app is live after the 2026-05-18 redeploy. Curriculum, auth, dashboard, admin page, and webhook-signature smoke tests passed. The remaining risk is live GitHub App coverage for the two new portfolio repos and the real fork→PR→review production QA pass.
