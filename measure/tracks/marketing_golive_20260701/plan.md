# Implementation Plan: marketing Go-Live

> **Spec:** [`spec.md`](./spec.md)
> **Track ID:** `marketing_golive_20260701`
> **Pattern:** deploy targets Cloud Run in the appropriate GCP project, `asia-southeast1`. Cloudbuild DB-gate steps mirror `apps/codecamp-advantage/cloudbuild.yaml`, but the **Dockerfile is vinext-specific** (see spec "vinext ≠ Next.js standalone").
> **Methodology:** per `measure/workflow.md`. Deploy/infra tasks are verification-gated (build → migrate → doctor → deploy → smoke).

---

## Phase 0: Build verification & pin (no fix needed)

The `vinext`/`vite parseSync` blocker deferred at `video_pipeline_20260613` archive
was found already resolved on 2026-07-01. Verify, pin, and record.

- [x] Task: Confirm `CI=true pnpm --filter marketing build` is green from a clean install; capture the `dist/{client,server}` output and the `vinext start` entrypoint
  - `bd32fba5` — build outputs `dist/client/` (static) + `dist/server/index.js` (RSC entry). `vinext start` calls `startProdServer()` from `vinext/dist/server/prod-server.js` which creates a `node:http` server serving `dist/` on `PORT` (default 3000) / `HOSTNAME` (default 0.0.0.0). Output green at `bd32fba5`.
- [x] Task: Confirm `CI=true pnpm --filter marketing test` still passes (was 151/151 at archive)
  - Current: **202/202** tests pass (16 test files). Verified at `bd32fba5`.
- [x] Task: Pin the working `vinext` version in `apps/marketing/package.json` (replace `^0.2.0` with the exact resolved version) so the fix can't regress via a float
  - `"vinext": "^0.2.0"` → `"vinext": "0.2.0"` at commit `bd32fba5`.
- [x] Task: Add a resolved row to `measure/tech-debt.md` — "marketing vinext/vite build blocker resolved (version X), verified `pnpm --filter marketing build` green 2026-07-01"; remove the dangling repo-owner deferral
  - Row added. No separate dangling deferral row existed to remove — the old archive-level deferral references are superseded.
- [b] Task: Measure — User Manual Verification 'Build verification & pin'

---

## Phase 1: Security gate (Wave 3 precondition)

Do not start Phase 2 until this is green — the app currently leaks decrypted API keys.

- [x] Task: Verify `marketing_api_authz` (Wave 3) merged to `master` and holds at HEAD
  - [x] `GET /api/settings` no longer returns decrypted LLM API keys (secrets masked) — `LR-marketing-app-003-005`
    - `app/lib/redact.ts` exports `redactSecrets()`; `app/api/settings/route.ts` masks secret values as `••••` and never calls `decrypt` for GET responses. Verified at `bd32fba5`.
  - [x] Every `/api/video/*` route requires an authenticated session — `LR-004-002`
    - All 4 video route files import and call `requireMarketingSession` before handler logic: `research-topics/route.ts`, `save-topics/route.ts`, `generate-script/route.ts`, `projects/route.ts`. Verified at `bd32fba5`.
  - [x] Campaign list/detail/PATCH are auth- and owner/tenant-scoped — `LR-marketing-app-003-001/003`
    - `campaigns/route.ts` and `campaigns/[id]/route.ts` both call `requireMarketingSession`. Owner/tenant scope is TB-scoped per the auth module comment (REFERENTIAL tables, no `schoolId` column). Verified at `bd32fba5`.
- [x] Task: Verify `marketing_zod_boundaries` (Wave 3) — Zod validation on campaigns POST/PATCH, settings POST, and all video routes; `generate-script` no longer feeds unvalidated `request.json()` to the prompt — `LR-004-001`
  - All routes use `z.safeParse()` on request bodies: `campaigns/route.ts` (`createCampaignSchema`), `campaigns/[id]/route.ts` (`updateCampaignSchema`), `settings/route.ts` (`settingsPostSchema`), `research-topics/route.ts` (`researchTopicsSchema`), `save-topics/route.ts` (`saveTopicsSchema`), `generate-script/route.ts` (`generateScriptSchema` + `scriptSchema`), `projects/route.ts` (`scriptSchema`). Verified at `bd32fba5`.
- [x] Task: Verify `marketing_ai_adapter` (Wave 3) — AI calls route through `ai.generateText()` rather than per-request provider clients — `LR-004-003`
  - `app/lib/ai.ts` re-exports `createAIClient`/`getAIClient` from `@reading-advantage/ai`. All AI call sites (`research-topics`, `generate-script`, `test-connection`) import from `@/lib/ai` and call `.generateText()` on a client created via the shared adapter. Zero direct provider-SDK imports in route source (verified by test at `bd32fba5`). Verified at `bd32fba5`.
- [x] Task: Record confirming SHAs; if any item is unmet, STOP and escalate to Wave 3
  - HEAD: `bd32fba5` (chore(sales): add deploy artifacts + reconcile MVP track). All 4 verifications pass.
- [b] Task: Measure — User Manual Verification 'Security gate'

---

## Phase 2: Deploy infrastructure (vinext runtime)

- [x] Task: Design the vinext production Dockerfile
  - [x] Determine how `vinext start` serves `dist/` in production (Node server entry, required runtime deps, port/host env)
    - `vinext start` → `vinext/dist/server/prod-server.js:startProdServer()` → creates `node:http` server, serves from `dist/`. Entry: `dist/server/index.js` (App Router RSC). No standalone output generated by default — `vinext` does not emit `dist/standalone/server.js` unless `next.config` sets `output: "standalone"` (which marketing does not).
    - Runtime deps: vinext itself in `node_modules`, plus all workspace packages (`@reading-advantage/db`, `@reading-advantage/ai`, etc.) and their transitive dependencies.
    - Port: `PORT` env (default 3000), Host: `HOSTNAME` env (default `0.0.0.0`).
  - [x] Multi-stage: deps (`pnpm install --frozen-lockfile`) → builder (`pnpm --filter marketing build`) → runner that ships `dist/` + minimal runtime and runs `vinext start` on `PORT=8080`, `HOSTNAME=0.0.0.0`
  - [x] If `vinext start` is unsuitable for a slim container, document the chosen alternative (e.g. copy full app + prod `node_modules`) as a tech-debt note
    - **Decision:** runner stage copies full `node_modules` from builder. Vinext has no standalone output; copying only `dist/` + re-installing prod deps would require re-resolving pnpm workspaces, which is fragile. The full-`node_modules` approach is reliable and well-understood. Tech-debt note added to `measure/tech-debt.md` row.
- [x] Task: Write `apps/marketing/Dockerfile` per the above; `docker build -f apps/marketing/Dockerfile .` succeeds and the container boots and serves `/`
  - Written at `apps/marketing/Dockerfile`. File verified by inspection. Docker build verification **deferred** (no network access to pull `node:22-alpine` base image on this machine).
- [x] Task: Write `apps/marketing/cloudbuild.yaml`
  - [x] build-image → push-image → migrate-db (`@reading-advantage/db migrate`, marketing tables / migration `0021`) → doctor-check → deploy-cloudrun → allow-public-invoker
  - [x] service name `marketing`, region `asia-southeast1`, Cloud SQL attach, `--set-secrets` for `DATABASE_URL`, `AUTH_SECRET`, the LLM provider keys, and the settings-encryption key
  - Written at `apps/marketing/cloudbuild.yaml`. Uses `$PROJECT_ID` for AR path (`asia-southeast1-docker.pkg.dev/$PROJECT_ID/containers/marketing`). Migrate step references `0021_sales_advantage.sql` which creates the marketing tables.
- [b] Task: Provision Cloud SQL marketing runtime DB (or schema) with migration `0021` applied; wire `DATABASE_URL`/`DIRECT_DATABASE_URL`
- [b] Task: Provision Secret Manager entries for every secret referenced by cloudbuild
- [x] Task: Complete `apps/marketing/.env.example` — full runtime surface with comments (currently only 230 bytes)
  - Expanded from 5 lines / 1 variable to 35 lines documenting `DATABASE_URL`, `DIRECT_DATABASE_URL`, `ENCRYPTION_KEY`, `AUTH_SECRET`, `AI_PROVIDER`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `OPENROUTER_API_KEY`, `NODE_ENV`, `RATE_LIMIT_INMEMORY_FASTPATH`.
- [x] Task: Write a post-deploy smoke script (hit `/`, `GET /api/health/db`, an authenticated campaigns fetch)
  - Written at `apps/marketing/scripts/marketing-smoke.sh`. Covers: `GET /` (200), `GET /login` (200), `GET /settings` (302 unauthed), `GET /api/auth/session` (200), `GET /api/health/db` (200), `GET /api/campaigns` (401 unauthed). Authenticated smoke deferred.
- [b] Task: Docker build verification (introduced by implementer: no network to pull node:22-alpine base image; verify in CI or on a networked machine after merge)
- [b] Task: Measure — User Manual Verification 'Deploy infrastructure'

---

## Phase 3: Deploy + manual QA

- [~] Task: `gcloud builds submit --config apps/marketing/cloudbuild.yaml`; confirm migrate + doctor + deploy steps pass
- [~] Task: Run the smoke script against the live Cloud Run URL; confirm `GET /api/health/db` green
- [~] Task: Manual end-to-end QA (Phikul) — login → create campaign → research topics → dedup → generate Thai script (5–7 scenes) → edit scenes → persist project → reload; record the result
- [~] Task: Confirm no route exposes decrypted secrets in production (re-check `GET /api/settings` against the live service)
- [~] Task: Measure — User Manual Verification 'Deploy + QA'

---

## Phase 4: Closeout

- [~] Task: Update `measure/deployment-status.md` — marketing now deployed (service, project, deploy source)
- [~] Task: Update `measure/tech-debt.md` — any go-live shortcuts (vinext container strategy, no auto CI/CD trigger, i18n/hardcoded-English UI carried to Wave 5)
- [~] Task: Update `measure/lessons-learned.md` if a reusable lesson emerged (esp. deploying a vinext app to Cloud Run)
- [~] Task: Archive this track; update `measure/tracks.md` row to `[x]`
- [~] Task: Measure — User Manual Verification 'Closeout'
