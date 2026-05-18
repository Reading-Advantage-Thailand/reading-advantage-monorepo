# Pre-Redeployment Readiness Note
**Date:** 2026-05-18  
**Track:** codecamp_pre_redeploy_remediation_20260518

---

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

## Test Results (2026-05-18)

| Package | Tests | Status |
|---------|-------|--------|
| `@reading-advantage/db` | 84 passed | ✅ |
| `@reading-advantage/domain` | 199 passed | ✅ |
| `@reading-advantage/api` | 94 passed | ✅ |
| `@reading-advantage/webhooks` | 33 passed | ✅ |
| `codecamp-advantage` | 509 passed | ✅ |
| **Total** | **919 passed** | ✅ |

- `pnpm turbo run check-types --filter=codecamp-advantage` — **0 errors**
- `pnpm turbo run build --filter=codecamp-advantage` — **successful**

---

## Remaining Blockers (Redeployment NOT Cleared Until These Are Resolved)

### Blocker 1: GitHub App Not Installed on New Portfolio Repos
**Impact:** PR review webhook will not fire on `codecamp-portfolio-website` or `codecamp-learning-dashboard`.  
**Action Required:** Org owner must install the GitHub App on both new repos via GitHub App settings → Install → select repos.  
**Docs:** `apps/codecamp-advantage/docs/github-app-setup.md`

### Blocker 2: GitHub App Installation Not Verified End-to-End
**Impact:** The fork→PR→LLM review pipeline has not been validated since repos were added.  
**Action Required:**
1. Confirm `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`, `GITHUB_WEBHOOK_SECRET` are set in Cloud Run environment.
2. Run one real fork-to-PR cycle on a test account to verify webhook delivery and LLM review.
3. See `measure/tracks/codecamp_qa_prod_20260517/` for the production QA checklist.

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
| Admin unmatched-webhook diagnostic view | Low | Deferred — server logs sufficient for MVP |
| Duplicate `generateReview` LLM implementation | Medium | Deferred to package extraction track |
| `proxy.ts` admin guard checks cookie only | High | Pre-existing tech debt — not introduced by this track |

---

## Redeployment Status

**⚠️ CONDITIONALLY CLEARED**

All code-level blockers are resolved. The app is safe to redeploy for intern use **IF**:
1. GitHub App is installed on the two new portfolio repos, AND
2. GitHub App env vars are confirmed in the Cloud Run deployment config.

**If GitHub App installation is blocked**, redeployment is still safe for curriculum-only use (theory + quiz lessons work without GitHub App). Exercise PR review will be degraded but non-blocking for early modules.

**Deployment sequence:** Follow `docs/deployment/gcp-cloud-run-monorepo-deployment.md`.
