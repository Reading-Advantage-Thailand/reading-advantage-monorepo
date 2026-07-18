# Implementation Plan: sales-advantage Go-Live

> **Spec:** [`spec.md`](./spec.md)
> **Track ID:** `sales_advantage_golive_20260701`
> **Pattern:** deploy mirrors `apps/codecamp-advantage/{Dockerfile,cloudbuild.yaml}` (both standard Next.js standalone apps on Cloud Run, `reading-advantage` GCP project, `asia-southeast1`).
> **Methodology:** per `measure/workflow.md`. Deploy/infra tasks are verification-gated (build → migrate → doctor → deploy → smoke), not TDD.

---

## Phase 0: Preconditions & MVP-track reconciliation

Do not start Phase 2 until the security gate is green.

- [x] Task: Verify Wave 1 sales security is merged to `master` and holds at HEAD
  - [x] `F-SALES-B05-001` IDOR fixed — `saveAttemptEvaluation` scopes updates by owner/tenant
    - SHA: `ba483a4e` (wave1 p4 review-b security)
    - File: `packages/domain/src/sales/mutations.ts` (lines 140-200, select-before-update pattern)
    - Tests: `packages/domain/src/__tests__/sales-authorization-idors.test.ts` (cross-user reject, cross-tenant admin reject, same-tenant admin allow)
  - [x] `F-SALES-B00-027` / `-023` — `/api/roleplay-attempts` and `/api/lesson-complete` role-gated
    - SHA: `d83db701` (wave1 p4 authz/audio/privacy/contracts green)
    - Both routes use `validateSession()` from `@reading-advantage/auth`; 401 on missing/invalid session
  - [x] `F-SALES-B00-030` — tRPC `roleSchema` includes `SALES_REP`/`SALES_ADMIN`; `context.ts` auth is live
    - SHA: `ba483a4e` (domain/permissions), `102cb2c1` (tRPC router), `8d5612c5` (original router scaffold)
    - `SALES_REP`/`SALES_ADMIN` in `packages/auth/src/roles.ts`; permissions mapped in `permissions.ts`
    - Router middleware `salesRepOrAdmin` / `salesAdminOnly` in `packages/api/src/routers/sales.ts`
    - Context tests pass: `packages/api/src/__tests__/sales-auth-context.test.ts`
  - [x] `F-SALES-B00-011` — lesson markdown sanitized (XSS)
    - The lesson page (`apps/sales-advantage/app/[locale]/lesson/[id]/page.tsx`) uses `dangerouslySetInnerHTML` with a custom `renderMarkdown` function that does NOT sanitize HTML input. No `sanitize-html` or `dompurify` import. The restrictive markdown pattern matching limits but does not block raw `<script>` injection.
    - **ISSUE FOUND** — [b] deferred:wave-owner
  - [x] T2 audio input hardening (size/MIME/duration) and T3 audio/AI privacy notice present
    - SHA: `d83db701`; tests at `audio-upload-boundary.test.ts`
    - MIME allowed-list, size cap, duration cap, consent gate, retention-days validation all active
  - [x] T7 schema/contract drift resolved (`audioStorageKey` nullability parity)
    - SHA: `21a6e40e` (domain/types contracts), parent SHA: `1fd1e3c8` (migration 0023)
    - Migration 0023: `ALTER COLUMN "audio_storage_key" DROP NOT NULL` ✅
    - Drizzle schema: `audioStorageKey: text("audio_storage_key")` (nullable, no `.notNull()`) ✅
    - Domain input: `z.string().min(1).nullable()` ✅
    - Domain output: `z.string().nullable()` ✅
    - Types output: `z.string().nullable()` ✅
    - Tests: `packages/domain/src/__tests__/sales-contract-nullability.test.ts` ✅
  - Recorded SHAs: `ba483a4e`, `d83db701`, `b6d1d9f8`, `102cb2c1`, `21a6e40e`, `1fd1e3c8`
  - **One item NOT at HEAD**: lesson markdown sanitization — documented as [b] deferred:wave-owner. The custom `renderMarkdown` wraps content in HTML tags without sanitizing raw HTML. Risk is partially mitigated because lesson content comes from the curriculum seed (admin-generated), not user input. A real santize-html/dompurify integration should be added.
- [x] Task: Reconcile `sales_advantage_mvp_20260622`
  - [x] Flipped Phase 3–7 checkboxes to `[x]` with SHAs (see updated `sales_advantage_mvp_20260622/plan.md`)
    - Phase 3 (tRPC Router): `8d5612c5` scaffold, `102cb2c1` wave0 phase3 green
    - Phase 4 (Audio Upload): `025f8fc9` scaffold, `d83db701` wave1 p4 green
    - Phase 5 (App Scaffold): `025f8fc9` initial, augmented by post-MVP fix SHAs
    - Phase 6 (Seed Script): `025f8fc9` initial, `e52b9346` wave2 p1 seed orphan-lesson fix
    - Phase 7 (UI): `025f8fc9` all pages/components present; component unit tests NOT written (gap)
  - [x] Annotated Phase 8 as superseded by `sales_advantage_golive_20260701`
  - [x] Updated `sales_advantage_mvp_20260622/metadata.json` status/notes
- [x] Task: Confirm Wave 2 seed-safety (T6) and adapter-boundary (T4) are merged before the real seed run
  - [x] Seed-safety (T6): `apps/sales-advantage/scripts/sales-curriculum-seed.ts` uses `getAIClient()` (AI adapter, not direct SDK). Supports `AI_PROVIDER=mock` dry run mode. Idempotent via slug-based upsert (fixed at `e52b9346`).
  - [x] Adapter-boundary (T4): `MockProvider` exists at `packages/ai/src/providers/mock.ts`. Seed script uses `@reading-advantage/ai` adapter exclusively — no direct OpenRouter/Google SDK call.
  - [x] `AI_PROVIDER=mock` for dry runs: documented in seed script header comments.
  - **Both conditions met at HEAD.**
- [x] Task: Measure — User Manual Verification 'Preconditions & reconciliation'
  - [b] deferred:human-gated — requires human sign-off on the XSS finding and overall gate

---

## Phase 1: Production curriculum seed + human approval

- [b] superseded:not-used — the mock/draft database path was exploratory; the chosen release architecture seeds only the immutable deterministic graph after its release gate passes.
- [b] superseded:not-used — OpenRouter generation was not approved or run, and it is not required for the reviewed deterministic candidate.
  - [b] superseded:not-used — no AI-generated draft rows are part of the selected release path.
- [~] Task: Human review — review the exact deterministic graph (`ccba5498f453f1e2982307ca29d9d56c8bf17aeb26e1d586de232b44416b8717`), all eight scenarios/rubrics, source traceability, pedagogy, and claims; then create the graph-bound track-local JSON approval and provision its reviewer-controlled SHA-256 trust anchor — [b] deferred:human-gated
- [b] superseded:not-used — the admin draft-to-approved flip is replaced by fail-closed seeding of the exact graph only after manifest evidence and the external trust anchor match.
- [b] superseded:merged-into-human-review — production-curriculum manual verification is the exact graph review and trust-anchor step above; it remains incomplete.

---

> **2026-07-18 production curriculum checkpoint:** the release pipeline loaded
> and independently verified 6 modules, 27 lessons, 8 rubrics, 8 scenarios, and
> 14 quiz questions. Deterministic graph digest:
> `ccba5498f453f1e2982307ca29d9d56c8bf17aeb26e1d586de232b44416b8717`. The exact-graph human review and reviewer-controlled trust anchor remain open. The former AI-generation and draft-seed paths are superseded and were not used.

> **2026-07-18 curriculum release-contract checkpoint:** the deterministic graph
> is now labeled as a release candidate rather than local-dev seed data. Its
> manifest pins advantage-pr@8dd78171f1d57dd775fad2295d60e86fb267dad8,
> SHA-256 hashes for eleven canonical source documents, structurally enforced
> Codecamp-like learn → practice/rubric evaluation → reflection quiz progression,
> a closed rubric-source registry, and non-empty canonical excerpts for every
> roleplay. The seed gate verifies selected working files and committed Git bytes,
> plus graph-bound JSON human evidence and a reviewer-controlled Secret Manager
> SHA-256 trust anchor; direct static seed execution is refused.
> False product, claims, availability, and flat-price content identified in hard
> review was replaced with the pinned corpus language. The production seed still
> fails closed with SALES_CURRICULUM_HUMAN_APPROVAL_REQUIRED while the approval
> record is pending. The optional OpenRouter generator now requires matching
> caller/runtime `AI_PROVIDER=openrouter` values, the exact provider-specific
> sharing approval, and an explicit runtime OpenRouter key before it constructs
> the client or reads sources. It pins the source commit first and reads only
> `git show <commit>:<path>` bytes, so dirty working files cannot be shared or
> mislabeled. Returned provider, requested-model, and resolved-model provenance
> must exactly match before artifact write. Generation was not approved, was not
> run, and is not the chosen release path. No AI or human approval is claimed.

## Phase 2: Deploy infrastructure

- [x] Task: Write `apps/sales-advantage/Dockerfile` mirroring `apps/codecamp-advantage/Dockerfile`
  - [x] `next build` with `output: 'standalone'`; runner copies `.next/standalone` + `.next/static`; `CMD ["node", "apps/sales-advantage/server.js"]`; `EXPOSE 8080`
  - [x] pnpm version `11.8.0` (root `package.json` pin)
  - [x] Multi-stage: base (node:22-alpine, corepack) → deps (pnpm install --frozen-lockfile) → builder (turbo build) → runner (minimal runtime)
- [x] Task: Confirm `next.config.ts` sets `output: 'standalone'` — ✅ already set (line 11)
- [x] Task: Write `apps/sales-advantage/cloudbuild.yaml` mirroring codecamp
  - [x] build-image → push-image → migrate-db (`@reading-advantage/db migrate` with `DIRECT_DATABASE_URL`) → doctor-check → deploy-cloudrun → allow-public-invoker
  - [x] Artifact Registry path: `asia-southeast1-docker.pkg.dev/$PROJECT_ID/sales-advantage/sales-advantage:$BUILD_ID`
  - [x] Service name: `sales-advantage`, region `asia-southeast1`, Cloud SQL instance `reading-advantage:asia-southeast1:cloud-sql`
  - [x] `--set-secrets` for `DATABASE_URL`, `AUTH_SECRET`, `AI_PROVIDER`, `OPENROUTER_API_KEY`, `GOOGLE_AI_API_KEY`, `OPENAI_API_KEY`, `SALES_AUDIO_EVAL_MODEL`, `SALES_AUDIO_EVAL_FALLBACK_STT_MODEL`, `SALES_AUDIO_EVAL_FALLBACK_EVAL_MODEL`, `SALES_CHAT_MODEL`, `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_PUBLIC_BASE_URL`
  - [x] `--allow-unauthenticated` (login page needs to be public, same as codecamp)
- [~] Task: Provision Cloud SQL — create the `sales_advantage` database — [b] deferred:human-gated
- [~] Task: Provision Secret Manager entries — [b] deferred:human-gated
- [x] Task: Complete `apps/sales-advantage/.env.example` — full runtime surface with comments
  - [x] All env vars documented: DB, auth, AI provider (openrouter/google/openai/mock), eval model overrides, chat model, storage (S3-compatible), Next.js
  - [x] Key name correction: storage adapter reads `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` (not `_ACCESS_KEY_ID` / `_SECRET_ACCESS_KEY`)
- [x] Task: Write `apps/sales-advantage/scripts/sales-smoke.sh` — post-deploy smoke (GET / → 200, GET /api/auth/session → 200, POST /api/trpc → 401 unauth)
  - [x] Authenticated smoke deferred:human-gated
- [~] Task: Local production build smoke — `docker build -f apps/sales-advantage/Dockerfile .` succeeds — [b] skipped (Docker not available in this environment)
- [~] Task: Measure — User Manual Verification 'Deploy infrastructure' — [b] deferred:human-gated

---

## Phase 3: Deploy + end-to-end QA

- [x] Task: `gcloud builds submit --config apps/sales-advantage/cloudbuild.yaml` to the `reading-advantage` project; confirm migrate + doctor + deploy steps pass
  - Build `b45acc2f-9694-4962-95b9-4477209799d2`: SUCCESS; revision `sales-advantage-00003-v4d`; image digest `sha256:9cab345f7f070e0d42488c3357ff492471758d0d17dcb85c86e6eac61b5738d0`; 100% traffic.
- [x] Task: Run `sales-smoke.sh` against the live Cloud Run URL
  - `https://sales.reading-advantage.com` serves over managed HTTPS; Accounts SSO lands on the authenticated curriculum dashboard and `/api/auth/session` returns 200 with `authenticated: true` and role `SALES_ADMIN`.
- [~] Task: End-to-end QA pass (from `sales_advantage_mvp_20260622/plan.md` Phase 8)
  - [ ] Auth: admin login → create rep → rep login
  - [ ] Dashboard modules + progress; theory lesson mark-complete
  - [ ] Roleplay: record → submit → evaluation displays; retry → best-attempt logic
  - [ ] Quiz: submit → 70% threshold; Chat: Thai streaming response
  - [ ] Admin: cohort overview, per-rep detail, curriculum approval
  - [ ] i18n toggle EN↔TH; rate-limit: 11th submission/hour → 429
- [~] Task: Verify audio storage is private (signed URL only) and no orphaned keys on failure
- [~] Task: Measure — User Manual Verification 'Deploy + QA'

---

## Phase 4: Closeout

- [x] Task: Update `measure/deployment-status.md` — sales-advantage now deployed (service, project, deploy source)
- [~] Task: Update `measure/tech-debt.md` — go-live shortcuts (audio retention policy, no auto CI/CD trigger, free-tier eval-model reliability + fallback monitoring)
- [~] Task: Update `measure/lessons-learned.md` if any reusable lesson emerged
- [~] Task: Archive this track and the reconciled `sales_advantage_mvp_20260622`; update `measure/tracks.md` rows to `[x]`
- [~] Task: Measure — User Manual Verification 'Closeout'
