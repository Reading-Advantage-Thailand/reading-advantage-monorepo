# Specification: sales-advantage Go-Live (MVP Completion)

> **Track ID:** `sales_advantage_golive_20260701`
> **Type:** feature
> **Predecessor (feature):** `sales_advantage_mvp_20260622` (Phases 0–7 implemented on HEAD)
> **Predecessor (security, hard gate):** Wave 1 sales remediation (Sales T1/T2/T3/T7); see `audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md`

## Overview

`apps/sales-advantage` is **code-complete but not shippable**. The 2026-06-26
line review (110 files) and the 2026-06-24 MVP review both confirm the domain
layer (`packages/domain/src/sales`), the tRPC router
(`packages/api/src/routers/sales.ts`), the audio-upload route
(`app/api/roleplay-attempts/route.ts`), all rep/admin UI pages, the roleplay
recorder/result components, the chat tutor, the quiz component, and the
curriculum seed script (`scripts/sales-curriculum-seed.ts`) already exist on
HEAD. The MVP track's Phase 3–7 checkboxes were never flipped, but the code is
present.

Three things still stand between the app and a real MVP:

1. **Known security defects that make deploy irresponsible.** The review found a
   genuine IDOR (`saveAttemptEvaluation` writes by id with no ownership/tenant
   predicate — `F-SALES-B05-001`), cross-tenant admin reporting
   (`F-SALES-B05-002`), two ungated AI/write routes (`/api/roleplay-attempts`,
   `/api/lesson-complete` — `F-SALES-B00-027/-023`), a tRPC role-enum gap that
   may leave the sales tRPC surface unauthenticated (`F-SALES-B00-030`),
   unsanitized lesson markdown (XSS — `F-SALES-B00-011`), and audio-privacy /
   input-hardening / schema-drift gaps. These are owned by **Waves 1/2/4/6**
   (Sales T1–T11), not by this track.
2. **No production curriculum.** The seed script exists but real content has not
   been generated via OpenRouter, human-reviewed, and flipped to
   `reviewStatus: 'approved'`. Reps see nothing until this is done.
3. **No deployment.** No `Dockerfile`, no `cloudbuild.yaml`, not on Cloud Run,
   the `sales_advantage` database is not provisioned in Cloud SQL, and no
   end-to-end QA pass has run. Per `measure/deployment-status.md`,
   sales-advantage is "Not deployed at all."

This track owns items **2 and 3** and **consumes item 1 as a hard precondition**.

## Scope

- `apps/sales-advantage`: `Dockerfile`, `cloudbuild.yaml`, `.env.example`
  completeness, post-deploy smoke script.
- Cloud SQL: create the `sales_advantage` database and run migrations against it.
- Secret Manager: provision the app's runtime secrets.
- Curriculum: run the seed against real OpenRouter, spot-check, human-approve.
- QA: end-to-end pass covering the acceptance list in `sales_advantage_mvp_20260622/plan.md` Phase 8.
- Reconcile the stale `sales_advantage_mvp_20260622` plan/metadata to reflect that Phases 3–7 are implemented and Phase 8 is superseded by this track.

## Non-Goals

- **No security remediation in this track.** IDOR, route gating, tRPC role-enum,
  XSS, audio privacy/hardening, schema drift, adapter-boundary — all owned by the
  waves. This track verifies they merged before deploy; it does not implement them.
- No new features (live multi-turn roleplay, video, CRM, Mastery Advantage KST/SRS
  — all deferred per the MVP spec's Out-of-Scope).
- No CI/CD trigger wiring beyond a manual `gcloud builds submit` path (mirrors
  codecamp; an automatic trigger is a follow-up, consistent with the codecamp
  tech-debt row of 2026-05-18).

## Dependencies & Sequencing

- **Hard gate:** Wave 1 sales security (T1 authorization/tenant isolation incl.
  the IDOR and tRPC role-enum; T2 audio input hardening; T3 audio/AI privacy; T7
  schema/contract consistency) must be merged to `master` before Phase 2 (deploy
  infra) starts. Wave 2 (T4 adapter boundary, T6 seed safety) should also be in
  before the real seed run in Phase 1.
- Deploy infra mirrors `apps/codecamp-advantage/Dockerfile` +
  `cloudbuild.yaml` (both are standard Next.js standalone apps).
- DB deploy gate reuses the `@reading-advantage/db migrate` + `doctor --check`
  steps already present in codecamp's cloudbuild.

## Acceptance Criteria

- [ ] Wave 1 sales security tracks (T1/T2/T3/T7) are merged to `master`; the IDOR
      (`F-SALES-B05-001`), ungated routes (`-027`/`-023`), and tRPC role-enum
      (`F-SALES-B00-030`) are verified fixed against HEAD before any deploy step runs.
- [ ] `sales_advantage_mvp_20260622` plan/metadata reconciled: Phases 3–7 marked
      implemented with SHAs, Phase 8 annotated as superseded by this track.
- [ ] Curriculum generated via real OpenRouter, spot-checked for rubric quality and
      source traceability, and flipped to `reviewStatus: 'approved'` for the launch cohort.
- [ ] `apps/sales-advantage/Dockerfile` builds a production image from the monorepo root.
- [ ] `apps/sales-advantage/cloudbuild.yaml` builds, runs DB migrate + `doctor --check`,
      and deploys to Cloud Run with secrets from Secret Manager.
- [ ] Cloud SQL has a `sales_advantage` database and all sales migrations are applied
      (verified via `doctor --check`).
- [ ] `apps/sales-advantage/.env.example` documents the full runtime surface
      (`AI_PROVIDER`, `OPENROUTER_API_KEY`, `SALES_AUDIO_EVAL_*`, `STORAGE_*`,
      `DATABASE_URL`, `DIRECT_DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`).
- [ ] Service is live on Cloud Run; `scripts/sales-smoke.sh` passes against the prod URL.
- [ ] End-to-end QA pass completed (login, create rep, dashboard, theory complete,
      record→submit→evaluation, retry/best-attempt, quiz threshold, Thai chat streaming,
      admin cohort/per-rep/curriculum-approval, i18n toggle, rate-limit 429).
- [ ] `measure/deployment-status.md` updated to show sales-advantage deployed.
- [ ] `measure/tech-debt.md` records any go-live shortcuts (audio retention, no auto
      CI/CD trigger, free-tier model reliability).
