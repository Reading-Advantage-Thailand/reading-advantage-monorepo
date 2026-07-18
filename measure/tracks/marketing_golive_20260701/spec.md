# Specification: marketing Go-Live (MVP Completion)

> **Track ID:** `marketing_golive_20260701`
> **Type:** feature
> **Predecessor (feature):** `video_pipeline_20260613` (archived; FR-1..FR-6 met, 151 tests green)
> **Predecessor (security, hard gate):** Wave 3 marketing remediation (`marketing_api_authz`, `marketing_zod_boundaries`, `marketing_ai_adapter`); see `audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md`

## Overview

`apps/marketing` **is** the marketing video-production pipeline — topic research +
Thai-aware dedup, LLM-generated Thai marketing scripts (5–7 scenes), an immutable
scene editor, and campaign/project persistence. The archived
`video_pipeline_20260613` track met FR-1 through FR-6 with **151/151 tests green**.

At archive time two things were deferred and left with **no owning track**:

1. **The build.** `vinext build` was blocked by a `vinext`/`vite parseSync`
   incompatibility, deferred to "repo-owner." **As of 2026-07-01 this is
   resolved:** `pnpm --filter marketing build` completes cleanly, producing
   `dist/client` and `dist/server`; the app runs via `vinext start`. This track
   verifies and pins that state rather than fixing it.
2. **Deployment + manual QA.** No `Dockerfile`, no `cloudbuild.yaml`, not on Cloud
   Run (`measure/deployment-status.md`: "Not deployed at all"), and the live QA
   pass was deferred to Phikul.

Independently, the 2026-06-27 line review found **Critical** security defects that
make deploying the current code irresponsible: `GET /api/settings` returns
**decrypted LLM API keys to anyone** (`LR-marketing-app-003-005`); all
`/api/video/*` routes are public and spend LLM tokens unauthenticated
(`LR-004-002`); campaign list/detail/PATCH have no auth or documented
application-role boundary. These are owned by **Wave 3**
(`marketing_api_authz`, `marketing_zod_boundaries`,
`marketing_ai_adapter`), not by this track.

This track owns **build verification + deployment + QA** and **consumes Wave 3 as
a hard precondition**.

## Scope

- `apps/marketing`: verify/pin the `vinext` build; add a **vinext-runtime**
  `Dockerfile` and `cloudbuild.yaml`; complete `.env.example`; post-deploy smoke script.
- Cloud SQL / Secret Manager: provision the marketing runtime DB (marketing tables
  from migration `0021`) and secrets.
- QA: the manual end-to-end video-pipeline pass deferred to Phikul.
- `measure/tech-debt.md`: record the `vinext` build blocker as resolved (with the
  pinned version) so the deferral is not left dangling.

## Non-Goals

- **No security remediation in this track.** Route auth, secret masking in
  `GET /api/settings`, Zod input boundaries, and AI-adapter routing are Wave 3
  (schema/UX/i18n → Wave 5, test-truth backfill → Wave 6). This track verifies
  Wave 3 merged before deploy; it does not implement it.
- No new pipeline features (media render/export boundary remains future work).
- No CI/CD trigger wiring beyond a manual `gcloud builds submit` path.

## Key technical note: vinext ≠ Next.js standalone

`apps/marketing` is a **vinext** (Vite-based) app, not a Next.js app. It builds to
`dist/{client,server}` and serves with `vinext start`, so the Dockerfile CANNOT
copy the codecamp/sales Next.js-standalone `server.js`. The image must ship the
built `dist/` + the runtime needed by `vinext start` (or an equivalent Node
server the vinext build emits). This is the single biggest deploy-infra unknown
and is called out as its own task.

## Dependencies & Sequencing

- **Hard gate:** Wave 3 marketing security (`marketing_api_authz` — auth on all
  campaign/video/settings routes + secret masking; `marketing_zod_boundaries` —
  Zod at every external boundary; `marketing_ai_adapter` — route AI through
  `ai.generateText()`) merged to `master` before Phase 2 (deploy infra) starts.
- Build verification (Phase 0) can run immediately and in parallel with the wave.

## Acceptance Criteria

- [ ] `pnpm --filter marketing build` is green in CI; the installed `vinext`
      version is pinned in `apps/marketing/package.json`; `measure/tech-debt.md`
      records the blocker as resolved with that version.
- [ ] Wave 3 marketing security merged to `master`; `GET /api/settings` no longer
      returns decrypted secrets and every `/api/video/*` and campaign route is
      authenticated. Marketing `MEMBER` users share campaign/project production
      access, while only Marketing `ADMIN` users manage settings — verified
      against HEAD before any deploy step runs.
- [ ] `apps/marketing/Dockerfile` builds a production image that serves the app via
      the vinext runtime and boots locally.
- [ ] `apps/marketing/cloudbuild.yaml` builds, runs marketing DB migrate + doctor,
      and deploys to Cloud Run with secrets from Secret Manager.
- [ ] Cloud SQL has the marketing runtime DB with migration `0021` applied.
- [ ] `apps/marketing/.env.example` documents the full runtime surface.
- [ ] Service is live on Cloud Run; a smoke script confirms it responds and
      `GET /api/health/db` is green.
- [ ] Manual end-to-end QA pass (Phikul): login, create campaign, research topics,
      generate Thai script, edit scenes, persist project — recorded as done.
- [ ] `measure/deployment-status.md` updated to show marketing deployed.
