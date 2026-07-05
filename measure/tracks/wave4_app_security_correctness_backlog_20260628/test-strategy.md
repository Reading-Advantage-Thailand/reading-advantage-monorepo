# Test Strategy — Wave 4 App Security & Correctness Backlog

> **Track:** `wave4_app_security_correctness_backlog_20260628`
> **Owner:** measure-strategy subagent
> **Method:** Contract-first TDD. Red behavior test → Green implementation → propagate to every same-class site → closeout gate.
> **Baseline SHA:** `2f58fed2161d88e12c9faffbdc60f3d3e6ddb75b`
> **Anti-pattern catalog:** `measure/anti-patterns.md` (A1–A13). Every phase below names the A-class defenses it must carry.

## 0. Strategy invariants (apply to every phase)

- **Closure model:** Representative Red → Green is necessary but NOT sufficient for closeout. Each owned migration track has a `site-closures/<track>.md` checklist enumerating every affected same-class site from the source review artifacts. Phase 9 rejects closeout if any site is untriaged. (Spec §"Closure Model"; defends A4 vacuous-pass and A5 false-claim.)
- **Falsifiability per test:** every test in this strategy must state a falsification condition — the exact mutation/removal that turns it red. A test that cannot be made red by removing the fix is a vacuous test (A4) and must be rewritten.
- **Live-behavior vs artifact tests:** tests that exercise real domain functions against a mock DB (asserting tenant scoping, permission throws, contract shapes) are **live-behavior tests** and are the primary closeout evidence. Tests that assert file presence, lint output, or doc text are **artifact tests** and are supporting evidence only — they may never close a track alone. Each phase labels which kind its tests are.
- **Intentionally-red aggregate handling:** the baseline aggregate `test` and `check-types` commands are RED at baseline because of a pre-existing `packages/api/src/routers/progress.ts:54` TS2322 error (see `baseline-results.md` §3). Phase-level Green gates run **targeted** package/app test commands (not the full aggregate) so a phase is not blocked by unrelated pre-existing red. The full aggregate is only required green (or formally deferred) at Phase 9 closeout.
- **No source edits outside the track dir by this role.** This strategy file is the only artifact Phase 0 produces besides `baseline-results.md` and `site-closures/`.

## Phase 0 — Baseline and Coverage Lock (this phase)

- **Red command:** n/a (Phase 0 is measurement, not TDD). The "red" is the baseline aggregate result recorded in `baseline-results.md`: lint PASS, check-types FAIL (pre-existing `progress.ts:54`), test FAIL (same blocker; domain green standalone).
- **Green gate:** all four Phase 0 plan tasks marked `[x]` with evidence; `baseline-results.md`, `test-strategy.md`, and 26 `site-closures/*.md` checklists committed.
- **Closeout gate for Phase 0:** coverage matrix ownership confirmed (no drift), primitives confirmed available, baseline recorded with exact exit codes and reproduction recipe, every owned track has a site-closure checklist.
- **Anti-pattern defenses:**
  - **A3 (digit-only "labeled count"):** baseline exit codes are recorded as labeled integers (`Exit code: 2`) with the failing task name, not bare digits.
  - **A5 (false-claim text vs test reality):** baseline-results.md states check-types/test are FAIL; no "all green" claim is made. The reproduction recipe lets a reviewer re-run.
  - **A11 (executed review track left fully blocked):** Phase 0 converts the review-derived proposals into executable `[~]`/`[x]` plan tasks rather than leaving them `[b] deferred:review-execution`.
  - **A13 (stale track dir):** this track is active (not archived), so no stale-dir risk yet; closeout (Phase 9) owns the archive move.

## Phase 1 — Science Security and Tenant Scoping (ST-1, ST-2, SP-3)

- **Red commands:**
  - `cd apps/science-advantage && CI=true pnpm test -- gamification` (new cross-tenant Red tests for `awardXp`/`updateStreakForProfile`/badge writes leaking across `schoolId`).
  - New Red tests for `lib/services/classes/get-class-detail.ts`, `get-student-classes.ts`, `lib/services/mastery/mastery-worker.ts` (+ `getClassDetailWithCurriculum`) asserting they throw / return empty when called without a user context or against a foreign tenant.
  - New Red guard test (SP-3): a test that imports every non-test `.ts` under `apps/science-advantage/{lib,app}` and fails if any imports `db` directly from `@reading-advantage/db` instead of `createTenantDB`.
- **Green gate (targeted):** `cd apps/science-advantage && CI=true pnpm test -- gamification services` exits 0; the SP-3 guard exits 0.
- **Closeout gate:** `site-closures/ST-1.md`, `ST-2.md`, `SP-3.md` mark every enumerated site fixed/NA/deferred; cross-tenant tests turn red when `createTenantDB` wrapping is removed (falsifiability).
- **Fixtures / mocks:** use `buildTenantIsolationHarness()` (Wave 2) for two-school fixtures; mock the Drizzle query builder via the existing `packages/domain/src/__tests__/mock-db.ts` pattern. No real Postgres for unit tests (AGENTS testing rule).
- **Live-behavior proof:** a test that calls `awardXp({ db, user: schoolAUser, tenant: schoolA, input })` and then asserts `schoolB`'s xp table is unchanged — must fail if `createTenantDB` is swapped for raw `db`.
- **Architecture guardrails:** gamification/services may import `createTenantDB` from `@reading-advantage/domain` and `assertCan` from `@reading-advantage/auth` (both are `workspace:*` deps of science-advantage). No business logic in route handlers. SP-3 guard must be a CI-runnable test (not a comment).
- **Changed-contract risks:** routing `awardXp` through `assertCan` may reject previously-anonymous callers (e.g. quiz route calling on behalf of a student). Contract: the caller must supply an authenticated `UserContext`. Document any legitimate system-caller path with an explicit override.
- **Artifact vs live:** SP-3 is an artifact/guard test (asserts import shape). ST-1/ST-2 are live-behavior tests. ST-1/ST-2 cannot close on SP-3 alone.
- **Anti-pattern defenses:**
  - **A4 (vacuous-pass):** each cross-tenant test asserts `schoolBRows.length === 0` with a labeled count message AND a positive assertion that `schoolARows` grew — prevents the "0 == 0" vacuous pass.
  - **A7 (over-broad filter):** the SP-3 guard must exclude test files and `lib/test/` by path, not by bare English words; a real violation containing "test" in a comment must not be swallowed.
  - **A12 (dangling guard ref):** the SP-3 guard test file must actually exist and run in CI; if it is named in `site-closures/SP-3.md` it must be creatable, not a dangling reference.

## Phase 2 — Science Route/Contract Correctness (ST-4)

- **Red commands:** new Red tests for: JSON-401 auth helper shape (`{ status: 401, json: {...} }` not a thrown string); `"me"` alias resolving to the caller's userId; `limit` query param clamped to `[1, MAX]` and rejecting NaN/non-numeric; `update-mastery` error mapping (typed error, not raw string throw); lesson∈curriculum verification (rejects lessonId not belonging to the curriculum).
- **Green gate (targeted):** `cd apps/science-advantage && CI=true pnpm test -- api/ai/update-mastery api/lessons` exits 0.
- **Closeout gate:** `site-closures/ST-4.md` marks each CR-03/CR-05/CR-06/ME-01..04 site fixed/NA/deferred.
- **Fixtures / mocks:** mock the auth session via `vi.mock('@reading-advantage/auth')`; use schema fixtures for curriculum↔lesson relationships.
- **Live-behavior proof:** the `limit` clamp test passes `?limit=99999` and `?limit=abc` and asserts the resolved value is the clamp ceiling / default — must fail if the clamp is removed.
- **Architecture guardrails:** auth helper must live in `lib/auth/` (transport-thin), not inlined in each route. Error mapping uses typed errors (aligns with CodeCamp MT-8 pattern).
- **Changed-contract risks:** `"me"` alias previously may have returned the raw JWT sub; contract is now "me" → authenticated userId. Clients relying on passing a literal foreign userId via `?userId=me` must break.
- **Artifact vs live:** all ST-4 tests are live-behavior (route contract tests). No artifact-only closure.
- **Anti-pattern defenses:**
  - **A3 (digit-only count):** the `limit` clamp test parses the integer and asserts `=== MAX`, not `>/0`.
  - **A5 (false-claim):** if `update-mastery` still throws raw strings, the test must stay red; do not claim ME-04 fixed while the throw is a `string`.
  - **A4 (vacuous-pass):** the lesson∈curriculum test must assert the valid case returns 200 AND the invalid case returns 4xx — both directions.

## Phase 3 — Reading Authorization, Validation, Endpoint Hardening (SEC-6/7/8/9/10)

- **Red commands:**
  - SEC-6: Red test — a SYSTEM user requesting `/api/v1/admin/segments?licenseId=<other>` is denied or audited; currently returns data.
  - SEC-7: Red tests — route handlers that accept unvalidated `req.query`/`req.body` throw on bad shapes via `parseQuery`/`parseBody` Zod helpers; raw `process.env.X` reads are replaced by `lib/env.ts` parsed with a Zod schema.
  - SEC-9: Red test — `generator-controller.ts` no longer dynamically requires `firebase-admin/storage`; `cleanupAudioFiles`/`cleanupStorageFiles` route through `@reading-advantage/storage`.
  - SEC-10: Red tests — `/api/v1/metrics/health`, `/metrics/cache`, `/metrics/stream` return 401 without an access key / ADMIN role; the public health endpoint exposes no DB detail.
  - SEC-8: Red tests — controller business logic migrated into `@reading-advantage/domain` modules; controllers become thin delegators; domain functions call `assertCan`.
- **Green gate (targeted):** `cd apps/reading-advantage && CI=true pnpm test -- server/controllers app/api/v1/metrics app/api/v1/admin` exits 0. **Also:** `cd packages/api && pnpm check-types` must exit 0 (this is where the baseline `progress.ts:54` error lives — Phase 3 should fix or formally defer it; see "intentionally-red aggregate handling" below).
- **Closeout gate:** `site-closures/M-RA-SEC-6.md` … `SEC-10.md` each mark enumerated sites; the baseline `progress.ts:54` TS2322 is either fixed (preferred, overlaps PB-4 status enum) or explicitly deferred to a named follow-up track with the track ID recorded in `baseline-results.md` and here.
- **Fixtures / mocks:** mock `restrictAccessKey`/`restrictTo`; mock the storage adapter `storage.delete`; use the existing reading-advantage test DB mock pattern.
- **Live-behavior proof:** SEC-6 test logs in as SYSTEM, hits the license-scoped endpoint with a foreign `licenseId`, and asserts a 403 or an audit-event row — must fail (return 200 + data) if the scope check is removed.
- **Architecture guardrails:** no `firebase-admin` import in app source. No raw `process.env` outside `lib/env.ts`. Controllers must not contain DB queries after SEC-8 (they delegate to domain).
- **Changed-contract risks:** SEC-10 hardening will break any external monitor scraping `/metrics/health` unauthenticated — that is intended; document the access-key requirement. SEC-8 thin-controller refactor changes internal call signatures; update callers in the same phase.
- **Intentionally-red aggregate handling:** the baseline aggregate `check-types`/`test` is red because of `progress.ts:54`. Phase 3's Green gate runs targeted commands, so Phase 3 can be accepted even if the full aggregate is still red — BUT the `progress.ts:54` fix must land in Phase 3 or Phase 4 (PB-4 owns the status enum) so Phase 9 can show a green aggregate. If deferred, name the follow-up track here: `deferred:wave4_app_security_correctness_backlog_20260628/PB-4` (same track) — i.e. it MUST close inside this wave.
- **Artifact vs live:** "no `firebase-admin` import" is an artifact test (grep/guard). SEC-6/7/10 endpoint behavior is live-behavior. SEC-8 is live-behavior (domain function called, controller thin).
- **Anti-pattern defenses:**
  - **A2 (consent-blind publish gate):** N/A here (no publish gate), but SEC-6 audit logging mirrors the consent-gate discipline — the audit event must carry `licenseId` + `userId` + timestamp.
  - **A5 (false-claim):** do not claim SEC-10 "hardened" while any metrics endpoint still returns 200 unauthenticated.
  - **A6 (registry-note overstatement):** `measure/tracks.md` note for Reading security may say "resolved" only after the SEC-6/10 adversarial tests pass.
  - **A7 (over-broad filter):** the `firebase-admin` artifact test must match the import statement, not the word "firebase" in comments.

## Phase 4 — Reading Product-Behavior Correctness & Learning-Loop Tests (PB-4/5/6/7/8)

- **Red commands:**
  - PB-4: Red tests — assignment status is a shared enum in `@reading-advantage/types`; `statusToInt` removed; lifecycle `created → assigned → in-progress → completed → overdue` enforced (illegal transitions rejected). **Includes the `progress.ts:54` status-union fix** (the baseline type error is exactly a `status: string` vs union mismatch).
  - PB-5: Red tests — MCQ accuracy and open-ended accuracy reported separately; combined metric (if any) weighted by question type; scoring rubric enum used in grading + feedback + reports.
  - PB-6: Red tests — `postActivityLog` requires validated `targetId` (no fallback chain); missing license data resolves to `LicenseType.BASIC`.
  - PB-7: Red tests — report controllers receive typed context objects; `(req as any).session` / `(req as any).params` casts and `requireRole([...])` removed; `as any` count drops.
  - PB-8: Red integration suite — article completion after required question types; XP idempotency + level progression; FSRS scheduling after ratings; assignment lifecycle + overdue detection; level-test assessment contract; AI content level validation (mocked provider).
- **Green gate (targeted):** `cd apps/reading-advantage && CI=true pnpm test -- server/controllers/assignment server/controllers/report server/controllers/user` exits 0; `cd packages/api && pnpm check-types` exits 0 (proves the `progress.ts:54` fix).
- **Closeout gate:** `site-closures/M-RA-PB-4.md` … `PB-8.md` complete; the baseline aggregate `check-types` command now exits 0 for `@reading-advantage/api` (the pre-existing blocker is resolved here).
- **Fixtures / mocks:** mock AI provider for PB-8 content-level test; use the domain mock-db for PB-4/5/6/7. PB-8 may use a real test DB if the existing `2-school-acceptance.test.ts` pattern permits — but only behind a `DATABASE_URL` guard.
- **Live-behavior proof:** PB-4 lifecycle test asserts `completed → in-progress` is rejected (4xx or throw) — must fail if the enum guard is removed. PB-8 XP idempotency test fires two concurrent `postActivityLog` calls and asserts total XP increased by exactly one award.
- **Architecture guardrails:** status enum lives in `@reading-advantage/types` (single source). No `as any` in report controllers after PB-7. PB-8 tests are behavior-focused (AGENTS: "Avoid relying exclusively on Playwright").
- **Changed-contract risks:** PB-4 enum may change numeric status codes stored in DB — require a migration if so; coordinate with `packages/db`. PB-6 removing the fallback chain will break callers that omit `targetId`; they must be updated in-phase.
- **Artifact vs live:** PB-7 has an artifact component (`as any` count via grep) but the closeout evidence is the live typed-context test. PB-4/5/6/8 are live-behavior.
- **Anti-pattern defenses:**
  - **A3 (digit-only count):** PB-8 XP idempotency asserts `xpDelta === ONE_AWARD` (labeled integer), not `> 0`.
  - **A4 (vacuous-pass):** PB-4 lifecycle test asserts BOTH a legal transition succeeds AND an illegal transition fails.
  - **A5 (false-claim):** do not claim PB-4 closed while `progress.ts:54` still type-errors (it is the same status-union defect).
  - **A9 (archived-path test refs):** PB-8 backfill tests must reference current reading-advantage paths, not archived track fixtures.

## Phase 5 — CodeCamp Reliability and Least-Privilege (MT-8/9/10/11/13/14)

- **Red commands:**
  - MT-8: Red tests — `mapDomainError` switches on `instanceof CodecampError`/`code`, not message substring; missing `.output()` schemas added.
  - MT-9: Red tests — PR-review queries are tenant-scoped; per-user vs global PR-URL uniqueness reconciled; repo/PR URLs normalized on write.
  - MT-10: Red tests — prod-smoke tests opt-in via `RUN_PROD_SMOKE` (default skip); phase-4 `trpcPost` body fixed; phase-7 `!notFound.status === 404` precedence fixed; playwright baseURL defaults to localhost.
  - MT-11: Red tests — module `order` invariant enforced; score-preservation policy defined; quiz 70-vs-80 threshold reconciled.
  - MT-13: Red tests — single source of truth for permission map; cross-product grants confirmed; codecamp-scoped admin key.
  - MT-14: Red tests — github auth/transport errors distinguished from empty results with structured logs; webhook "processed" outcome recorded; payload retention/PII policy enforced.
- **Green gate (targeted):** `cd apps/codecamp-advantage && CI=true pnpm test` exits 0; `cd packages/api && pnpm test -- codecamp` exits 0; `cd packages/domain && pnpm test -- codecamp` exits 0.
- **Closeout gate:** `site-closures/MT-8.md` … `MT-14.md` complete; MT-10 prod-smoke no longer runs by default in CI (no environment-dependent flake).
- **Fixtures / mocks:** mock `@reading-advantage/integrations-github` for MT-8/MT-14; use `buildTenantIsolationHarness()` for MT-9 tenant scoping; mock `RUN_PROD_SMOKE` env in MT-10.
- **Live-behavior proof:** MT-9 test inserts a PR-review row for schoolA and queries as schoolB's user — asserts empty result; must fail if tenant scoping is removed. MT-10 test asserts prod-smoke is SKIPPED when `RUN_PROD_SMOKE` is unset.
- **Architecture guardrails:** `CodecampError` in `packages/domain/src/codecamp/errors.ts` (single source). Permission map in one module. Observability via shared adapter (no direct `@sentry` in app code — SP-1 discipline).
- **Changed-contract risks:** MT-8 typed errors change the error-response shape for codecamp routes; update the frontend error display. MT-11 quiz threshold change affects existing student records — document migration.
- **Artifact vs live:** MT-10 has artifact facets (env flag, config). MT-8/9/11/13/14 are live-behavior.
- **Anti-pattern defenses:**
  - **A1 (substring-as-structured-signal):** MT-8 `mapDomainError` must NOT branch on `err.message.includes("...")`; the Red test feeds two errors with identical messages but different `code` and asserts different mapping.
  - **A4 (vacuous-pass):** MT-10 prod-smoke test asserts the skip reason is logged AND the test count is 0 — not just `exit 0`.
  - **A7 (over-broad filter):** MT-9 repo-URL normalization test must not exclude real malformed URLs by accident.
  - **A11 (executed review track left blocked):** these MT tasks are converted from `[b]` review proposals to executable `[~]`/`[x]`; none remain blocked.

## Phase 6 — Sales Reliability, Curriculum, Observability (T5/T8/T9)

- **Red commands:**
  - T5: Red tests — lesson markdown sanitized (DOMPurify + real markdown lib); sequential progression enforced server-side (not CSS); draft lessons filtered; quiz gated on approval; `correctAnswer` stripped from client lesson payload.
  - T8: Red tests — `submitRoleplayAttempt` transactional (rubric validated before insert); `attemptNumber` unique constraint; durable Postgres-backed rate limiter; `instanceof` error mapping in router.
  - T9: Red tests — structured logger in evaluator fallback; audit + rate-limit on `admin.createRep`/`approveContent`; login/session logging with fail-open distinction; plaintext password sanitized from domain return value.
- **Green gate (targeted):** `cd apps/sales-advantage && CI=true pnpm test` exits 0; `cd packages/domain && pnpm test -- sales` exits 0; `cd packages/api && pnpm test -- sales` exits 0.
- **Closeout gate:** `site-closures/T5.md`, `T8.md`, `T9.md` complete.
- **Fixtures / mocks:** mock AI evaluator for T8 transactional test (reuse `sales-roleplay-evaluator.test.ts` pattern); mock rate-limiter store; mock audit sink.
- **Live-behavior proof:** T8 test starts a roleplay submit, forces an insert failure mid-transaction, and asserts no partial attempt row exists — must fail if the transaction wrapper is removed. T9 test asserts the audit row exists after `approveContent`.
- **Architecture guardrails:** rate limiter must be the shared Wave 0 limiter (no app-local in-memory store for multi-instance). Audit via `@reading-advantage/auth` `recordAuditEvent`. No plaintext password in any domain return.
- **Changed-contract risks:** T5 stripping `correctAnswer` from client payload changes the lesson API shape — update the lesson page. T8 `attemptNumber` unique constraint may require a migration + data cleanup.
- **Artifact vs live:** T5 sanitization has an artifact facet (no `dangerouslySetInnerHTML` without sanitize). T8/T9 are live-behavior.
- **Anti-pattern defenses:**
  - **A2 (consent-blind publish gate):** T9 `approveContent` audit event must carry contentId + approverId + timestamp (same discipline as A2 consent artifact).
  - **A5 (false-claim):** do not claim T8 "transactional" while partial rows survive a mid-transaction failure.
  - **A6 (registry-note overstatement):** tracks.md Sales note may say "rate-limited + transactional" only after T8 adversarial test passes.

## Phase 7 — Primary Prisma Removal & Secret Eradication (M7/M9)

- **Red commands:**
  - M7: Red guard test — no `prisma:generate` step in `apps/primary-advantage/Dockerfile`; no `prisma/` copy step; no `@prisma/*` runtime import in primary source; Dockerfile uses pnpm workspace install (not `npm`).
  - M9: Red guard test — no hardcoded secret/credential literals in committed primary source (API keys, passwords, project IDs, service-account emails); seed/test credentials env-guarded with a production guard (`if (NODE_ENV === 'production' && !process.env.X) throw`).
- **Green gate (targeted):** `cd apps/primary-advantage && CI=true pnpm test` exits 0; `cd apps/primary-advantage && CI=true pnpm check-types` exits 0 (note: blocked by baseline `progress.ts:54` until Phase 4 fixes it — Phase 7 runs after Phase 4, so this should be unblocked); the M7/M9 guard tests exit 0.
- **Closeout gate:** `site-closures/M7.md`, `M9.md` complete; `git grep -i prisma apps/primary-advantage/Dockerfile` returns nothing; secret-scan returns only env-var reads.
- **Fixtures / mocks:** the M9 guard test uses a regex allowlist of known-safe literals (i18n strings, etc.) — allowlist must be reviewed, not bare-English filtered.
- **Live-behavior proof:** M9 production-guard test: set `NODE_ENV=production`, unset the seed credential env var, run the seed path — asserts it throws. Must fail (seed proceeds) if the guard is removed.
- **Architecture guardrails:** M7 removes the Prisma build command entirely (Drizzle is the source of truth per AGENTS). M9 moves all secrets to env reads; no `process.env` raw reads outside a Zod-validated `lib/env.ts` (aligns with Reading SEC-7).
- **Changed-contract risks:** removing `prisma:generate` from Dockerfile requires the build to succeed without it — verify the Drizzle client is generated at build time. M9 may break local dev if devs relied on hardcoded fallbacks — document the required env vars.
- **Artifact vs live:** M7 is almost entirely artifact (Dockerfile/source grep guards). M9 is artifact (secret scan) + live (production guard behavior). M9 cannot close on the grep alone — the production-guard behavior test is required.
- **Anti-pattern defenses:**
  - **A3 (digit-only count):** the M9 secret-scan reports `Hardcoded-credential hits: <N>` as a labeled integer parsed from the guard output, and asserts `=== 0`, not `< some-number`.
  - **A5 (false-claim):** do not claim M9 "resolved" while the secret-scan guard is still red.
  - **A7 (over-broad filter):** the M9 allowlist must exclude by file path / known-safe marker, not by bare English words ("password" as a filter token would swallow a real `password = "hunter2"`).
  - **A12 (dangling guard ref):** the M7/M9 guard test files must exist and run in CI — name them in the site-closure checklists.

## Phase 8 — Public Blog Security (www T9)

- **Red commands:** Red tests — blog HTML is sanitized (script tags / event handlers stripped); frontmatter parsed with a Zod schema (rejects malformed frontmatter); `dangerouslySetInnerHTML` only receives sanitized output.
- **Green gate (targeted):** `cd apps/www-reading-advantage && CI=true pnpm test` exits 0 (or the blog-lib unit test if no app test runner).
- **Closeout gate:** `site-closures/www-T9.md` complete; a Red test proving `<script>alert(1)</script>` in blog body is stripped.
- **Fixtures / mocks:** fixture blog posts with malicious HTML / malformed frontmatter.
- **Live-behavior proof:** the sanitize test feeds `<img src=x onerror=alert(1)>` and asserts the rendered output has no `onerror` — must fail if sanitization is removed.
- **Architecture guardrails:** sanitization in `src/lib/blog.ts` (single source). Zod frontmatter schema in `src/types/blog.ts`. No raw `dangerouslySetInnerHTML` without passing through `sanitize()`.
- **Changed-contract risks:** sanitization may strip legitimate embeds — document the allowlist.
- **Artifact vs live:** both — the sanitize behavior is live; "no raw dangerouslySetInnerHTML" is an artifact guard.
- **Anti-pattern defenses:**
  - **A4 (vacuous-pass):** the sanitize test asserts the malicious payload is stripped AND a known-safe HTML fragment survives (both directions).
  - **A7 (over-broad filter):** the artifact guard for "no raw dangerouslySetInnerHTML" must allow the single sanitized call site, not blanket-ban the string.

## Phase 9 — Quality Gates and Closeout

- **Red command (the closeout aggregate):** re-run all three required verification commands from `spec.md`:
  ```bash
  CI=true pnpm turbo run test --filter=science-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=primary-advantage --filter=@reading-advantage/domain
  CI=true pnpm turbo run check-types --filter=science-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage --filter=primary-advantage
  CI=true pnpm turbo run lint --filter=science-advantage --filter=reading-advantage --filter=codecamp-advantage --filter=sales-advantage
  ```
- **Green gate (closeout):** lint exit 0; check-types exit 0; test exit 0 — OR each remaining failure is explicitly linked to a named follow-up track with the exact failing task/symbol. The pre-existing `progress.ts:54` failure MUST be green by this point (fixed in Phase 4 PB-4).
- **Closeout gate:** every `site-closures/*.md` marks every site fixed/NA/deferred-with-named-follow-up; `medium-plus-coverage-matrix.md` updated marking owned tracks resolved only where behavior tests prove it; lessons-learned appended; track archived (Phase 9 owns the A13 archive-move cleanliness).
- **Live-behavior proof at closeout:** the closeout report quotes, per owned track, the one live-behavior test that proves the fix and the exact removal that turns it red.
- **Architecture guardrails:** no new provider-SDK imports in app code (adapter discipline). No business logic in route handlers. Tenant scoping via `createTenantDB` everywhere a FLAT table is touched.
- **Intentionally-red aggregate handling (final):** if any command is still red at closeout, the closeout is `partial` (not `complete`) and every red task is listed with a follow-up track ID. No silent red.
- **Anti-pattern defenses (closeout-specific):**
  - **A5 (false-claim text vs test reality):** the closeout report must not say "all checks pass" unless the three commands actually exit 0.
  - **A6 (registry-note overstatement):** `measure/tracks.md` Wave 4 note may say "resolved" only per-track, each backed by a green adversarial test.
  - **A8 (`[ ]` marker ambiguity):** Phase 9 converts every `[~]`/`[ ]` to `[x]` or a `[b] deferred:<follow-up-track>` before archive; the supervisor-fixed marker vocabulary is `[~]`/`[x]`/`[b]` only.
  - **A10 (generated-facts drift):** if Wave 4 changed exported symbols/signatures, run `build-graph update ./graph.db <files>` so `measure/generated/` stays fresh; note it in the closeout report.
  - **A11 (executed review track left fully blocked):** no task remains `[b] deferred:review-execution` — all are `[x]` or `[b] deferred:<named-follow-up>`.
  - **A13 (stale track dir):** after archive move to `measure/archive/wave4_app_security_correctness_backlog_20260628/`, remove `measure/tracks/wave4_app_security_correctness_backlog_20260628/` so the active list and registry agree.

## Anti-pattern coverage summary (A1–A13 → phase that defends)

| ID | Defense | Owning phase(es) |
|---|---|---|
| A1 | MT-8 `mapDomainError` instanceof/code test (identical messages, different codes) | P5 |
| A2 | T9 `approveContent` audit event carries contentId+approver+timestamp | P6 |
| A3 | labeled-integer parses (limit clamp, XP delta, secret-scan count, baseline exit codes) | P0, P2, P4, P7 |
| A4 | every cross-tenant / lifecycle / sanitize test asserts BOTH directions (legal+illegal) | P1, P2, P4, P8 |
| A5 | no "all green"/"resolved" claim while a cited test/command is red; reproduction recipe | P0, P2, P3, P4, P7, P9 |
| A6 | tracks.md "resolved" notes gated on green adversarial tests | P3, P6, P9 |
| A7 | filter exclusions by path/marker, not bare English words (SP-3, firebase, secret allowlist, dangerouslySetInnerHTML) | P1, P3, P7, P8 |
| A8 | closeout converts all markers to `[x]`/`[b] deferred:<follow-up>`; no `[ ]` | P9 |
| A9 | PB-8 backfill tests reference current (non-archived) paths | P4 |
| A10 | `build-graph update` if exported symbols/signatures changed; note in closeout | P9 |
| A11 | review proposals converted from `[b] deferred:review-execution` to executable `[~]`/`[x]` | P0, P5 |
| A12 | every named guard test file exists and runs in CI (SP-3, M7, M9 guards) | P1, P7 |
| A13 | archive move removes the `measure/tracks/<id>/` dir | P9 |

## Intentionally-red aggregate handling (consolidated)

The baseline aggregate `check-types` and `test` commands are RED because of one pre-existing
defect: `packages/api/src/routers/progress.ts:54` (`status: z.string()` vs the
`"completed" | "not_started" | "in_progress"` union). This defect overlaps Reading PB-4 (assignment
status enum lifecycle) and MUST be fixed in Phase 4. Until then:

- Phase Green gates run **targeted** package/app commands (listed per phase), so a phase is not
  blocked by the unrelated baseline red.
- No phase may claim the aggregate is green.
- Phase 9 closeout requires the aggregate green OR a named follow-up per remaining failure. Because
  the blocker is owned by this wave (PB-4), the expected closeout state is **aggregate green**.

## Artifact vs live-behavior test ledger (quick reference)

| Track | Artifact tests | Live-behavior tests (closeout evidence) |
|---|---|---|
| ST-1 | — | cross-tenant xp/streak/badge isolation |
| ST-2 | — | services throw/empty without user context + foreign tenant |
| ST-4 | — | JSON-401, "me" alias, limit clamp, update-mastery mapping, lesson∈curriculum |
| SP-3 | raw-db import guard | — |
| SEC-6 | — | SYSTEM license-scope denial/audit |
| SEC-7 | `process.env` grep guard | Zod parseQuery/parseBody rejection |
| SEC-8 | — | thin-controller + domain `assertCan` |
| SEC-9 | no-`firebase-admin` import guard | storage-adapter cleanup call |
| SEC-10 | — | metrics/health 401 without key |
| PB-4 | — | status enum lifecycle + `progress.ts:54` type fix |
| PB-5 | — | MCQ vs open-ended accuracy separation |
| PB-6 | — | targetId required + BASIC license fallback |
| PB-7 | `as any` count | typed context objects |
| PB-8 | — | XP idempotency, FSRS, lifecycle, level-test, AI level |
| MT-8 | — | instanceof/code error mapping |
| MT-9 | — | tenant-scoped PR-review query |
| MT-10 | env-flag/config | prod-smoke default-skip |
| MT-11 | — | module order invariant + threshold |
| MT-13 | — | permission-map single source |
| MT-14 | — | structured-log distinction + webhook outcome |
| T5 | no-raw-dangerouslySetInnerHTML guard | markdown sanitize + progression gate |
| T8 | — | transactional submit + rate limit |
| T9 | — | audit event + password sanitization |
| M7 | Dockerfile/source prisma guard | — |
| M9 | secret-scan guard | production-guard throw |
| www-T9 | no-raw-HTML guard | sanitize + Zod frontmatter |
