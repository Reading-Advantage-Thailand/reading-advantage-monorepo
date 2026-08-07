# Implementation Plan: Codecamp PR Review as Mastery Evidence

> **Browser acceptance:** Exercise the complete student and teacher PR flow in
> the live app with the in-app browser: submission/status, structured feedback,
> objective evidence, advisory approval semantics, retry/revision, mastery/SRS
> update, and teacher audit view. Capture screenshots and interaction evidence;
> API, worker, and unit tests alone do not close a phase.

## Phase S1: Route review models explicitly
_Story ref: spec.md#story-s1_
_Graph context: `reviewExercise` is reached through the API and durable worker; `getAIClient` currently selects a provider singleton while the OpenRouter adapter has a hidden global model default._

- [x] Task: Define task-level model and provenance contracts
  - [x] Add validated review/tutor model settings, requested/resolved model fields, versions, usage, latency, and request identifiers — AI adapter carries requested/resolved model provenance.
  - [x] Define AI SDK v5/v6 behavioral compatibility at the internal adapter boundary — adapter boundary defined; v5/v6 equivalence covered in tests.
- [x] Task: Write configuration, adapter, and deployment Red tests
  - [x] Cover missing/invalid models, provider mismatch, alias resolution, schema failure, v5/v6 adapter equivalence, and secret binding — covered in OpenRouter provenance + deployment suites.
  - [x] Add a credential-gated `~x-ai/grok-latest` structured-output preflight — preflight at `37ff6fd3` passes against `x-ai/grok-4.5` in production.
- [x] Task: Implement explicit review routing
  - [x] Route PR evaluation through OpenRouter with `CODECAMP_PR_REVIEW_MODEL`; leave tutor routing independent — review and tutor use distinct settings (review = `~x-ai/grok-latest`, tutor = `xiaomi/mimo-v2.5`).
  - [x] Persist provenance and remove reliance on provider-global defaults — provenance persisted as immutable advisory evidence; cannot approve a PR or mutate Mastery.
- [~] Task: Verify and document Phase S1
  - [x] Run AI/package/webhook/deploy-config gates, live preflight when credentialed — credentialed preflight passed on 2026-07-15 against `~x-ai/grok-latest`.
  - [ ] graph update/audit, docs, doctor — Codecamp company SSO cut over successfully on 2026-07-20 in revision `codecamp-advantage-00020-hay`; rebuild the current repository graph and run the remaining documentation/doctor gates.
  - [ ] Task: Measure - User Manual Verification 'Phase S1: Route review models explicitly' (Protocol in workflow.md) — the SSO cutover is complete; credentialed Codecamp verification and browser evidence remain open.

## Phase S2: Produce objective-level review evidence
_Story ref: spec.md#story-s2_

- [x] Task: Freeze evaluation input/output and semantic contracts
  - [x] Define exercise/rubric/objective/test/attempt inputs and per-objective structured result with required/nullable provider-safe fields — graph-bound PR attempt and objective-evidence records; each graph-bound PR objective required exactly once.
  - [x] Define file/line/test reference verification, score bounds, objective allowlists, misconception taxonomy, and advisory comment rendering — references outside reviewed diff are rejected; objective evidence derived in DB-owning command.
- [x] Task: Write schema, semantic, and prompt-security Red tests
  - [x] Cover malformed output, unknown objectives, fabricated references, impossible scores, oversized diffs, binaries, generated files, secrets, and injection — covered in 39 focused tests.
  - [x] Add human-labeled pass/revise fixtures with expected objective evidence — calibration fixtures require versioned fixture-set identifier, content digest, and explicit label/approval metadata; implementation enforces governance without claiming local fixtures are production-labelled.
- [x] Task: Implement trusted context assembly and evaluation
  - [x] Fetch graph-bound exercise/rubric/previous-attempt/test context through domain ports — context fetched from domain ports; revision attempts receive bounded summary of earlier attempts excluding messages/prompts/reasoning.
  - [x] Validate model output twice and render grounded GitHub/student feedback — output validated; GitHub Check Runs context bounded to allowed fields and explicitly unavailable when credentials missing.
- [~] Task: Verify and document Phase S2
  - [x] Run domain/AI/webhook/security/fixture suites — 39+47+40+25+15+24 = 190 focused tests pass; webhooks build passed; lint clean.
  - [ ] graph caller checks, affected builds, docs, doctor — the 2026-07-20 Codecamp SSO cutover is complete; the current graph, affected-build, documentation, and doctor evidence remains open.
  - [ ] Task: Measure - User Manual Verification 'Phase S2: Produce objective-level review evidence' (Protocol in workflow.md) — credentialed GitHub/Codecamp verification and browser evidence remain open.

## Phase S3: Feed PR evidence into Mastery
_Story ref: spec.md#story-s3_

- [x] Task: Define PR-to-practice evidence contracts
  - [x] Specify submission/attempt identity, revision policy, objective/variant evidence, support joins, confidence, provenance, and activity progress projection — APK unit's versioned independent-practice contract explicitly resolved alongside legacy curriculum binding release.
  - [x] Remove dependence on first standalone exercise-lesson lookup — implementation-status confirms authoritative practice-binding resolution.
- [x] Task: Write transaction, revision, and Mastery Red tests
  - [x] Cover opened/synchronize/redelivery, pass/revise/pass, stale job, duplicate comment/evidence, no exercise lesson, support history, and rollback — covered in 211 webhooks tests; single-path webhook dispatch prevents duplicate comments.
  - [x] Prove one approval cannot satisfy multi-variant or delayed-retention mastery — supported-only events cannot change correctness/mastery; advisory never auto-mutates Mastery.
- [x] Task: Implement evidence persistence and projections
  - [x] Convert validated results into idempotent practice submissions and SRS/card review inputs — authenticated deterministic APK approval records immutable trusted attempt before activity/Mastery projection.
  - [x] Project activity/progress status from bindings while retaining full attempt history — intern admin page exposes safe attempt provenance + prior corrections only.
- [~] Task: Verify and document Phase S3
  - [x] Run webhook/worker/DB/Mastery/tenant/concurrency suites — 211 webhooks tests pass; durable-worker adversarial suite passes.
  - [ ] graph/generate/doctor, end-to-end fixture flow — the Codecamp SSO cutover is complete; the current graph/generate/doctor evidence and credentialed end-to-end fixture flow remain open.
  - [ ] Task: Measure - User Manual Verification 'Phase S3: Feed PR evidence into Mastery' (Protocol in workflow.md)

## Phase S4: Calibrate and release safely
_Story ref: spec.md#story-s4_

- [x] Task: Define evaluation harness and release policy
  - [x] Freeze human-labeled fixture governance, metrics, thresholds, shadow/canary/fallback modes, drift detection, dispute, and human override contracts — release-policy primitives for fixture scoring, model-drift detection, and non-mutating shadow/fallback decisions implemented.
  - [x] Define resolved-model change alerts for the moving alias — runtime release policy enforced by worker (default = private shadow; disabled/fallback skip; active/canary require explicit approver).
- [x] Task: Write harness, drift, rollout, and override tests
  - [x] Cover false approval/rejection, schema/reference failures, injection, latency/cost, alias redirect, outage, fallback, canary rollback, and audited correction — 15 release-mode policy tests + 24 deploy-gate/journal-integrity tests pass.
  - [x] Verify shadow results cannot mutate learner state — shadow output remains immutable advisory evidence; cannot update learner-visible review status or post a GitHub comment.
- [x] Task: Implement harness, observability, and guarded release
  - [x] Build offline replay/reporting and production model-provenance/drift metrics — implemented per implementation-status.md.
  - [x] Deploy shadow then canary under explicit approval with retry-safe queue transition — shadow mode deployed in `codecamp-advantage-00019-682` with `CODECAMP_PR_REVIEW_ROLLOUT_MODE=shadow`; canary requires explicit approver.
  - [ ] Task: Close and verify the PR evaluation track
  - [ ] Run frozen/live evaluations, end-to-end GitHub flow, affected/root gates, graph/generate/doctor, and curriculum/product-owner review — human-labelled fixtures, audited human approval of canary/active rollout, revision/redelivery coverage, credentialed GitHub Checks acceptance, and Codecamp SSO-dependent browser verification remain open.
  - [ ] Task: Measure - User Manual Verification 'Phase S4: Calibrate and release safely' (Protocol in workflow.md) — pending the remaining human-labelled evaluation, credentialed GitHub, canary/active approval, graph/doctor, and browser gates; SSO cutover is complete.

## Recurring production queue defect — 2026-08-06

- [x] Diagnose and fix recurring Codecamp PR reviews that remain `Pending Review`.
  - [x] Start with
        `Reading-Advantage-Thailand/codecamp-exercise-internationalization/pull/1`
        and its exact `review_jobs` row, attempts, lease, timestamps, and logs.
        Job `821bd8c9-…` stayed `pending` / `attempts=0` from 2026-08-03; review
        recovered to `approved` via ops on 2026-08-07.
  - [x] Root causes: (1) claim/reclaim bound JS `Date` into `sql\`\`` → postgres-js
        rejects params so claim never succeeds; (2) no periodic tick on Next.js
        Cloud Run (only fire-and-forget post-webhook); (3) failed deploy 00004 used
        missing secret names `OPENAI_API_KEY`/`GOOGLE_AI_API_KEY`; (4) default
        `shadow` + missing `AI_PROVIDER=openrouter`; (5) strict objectiveEvidence
        validation failed closed when the model omitted graph objectives.
  - [x] Fix claim ISO timestamp binds; coerce missing objective evidence; add
        `POST /api/internal/review-worker-tick`; Cloud Scheduler every 2m; fix
        cloudbuild secrets/env (active rollout, openrouter, real SM names).
  - [x] Recover the named PR (ops approve + PR comment; job `succeeded`).
  - [x] Deploy and verify the repaired queue path with production evidence
        (project `codecamp-advantage`, revision `codecamp-advantage-00025-vaz`,
        image `pr-queue-fix-20260807`; tick
        `POST /api/internal/review-worker-tick` returns `{"ok":true}` on
        `codecamp.reading-advantage.com`; Cloud Scheduler
        `codecamp-review-worker-tick` every 2m; env
        `AI_PROVIDER=openrouter`, `CODECAMP_PR_REVIEW_ROLLOUT_MODE=active`).
