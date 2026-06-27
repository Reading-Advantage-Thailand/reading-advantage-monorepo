# Line Review — cc-batch-07

- Track: `codecamp_advantage_review_20260626`
- Batch: `cc-batch-07` (20 files)
- Reviewer scope: curriculum/progression correctness, GitHub/webhook/AI integration risk, auth/role boundaries, production readiness, AGENTS.md compliance, test quality.
- Source code edited: none (read-only review).
- Finding ID prefix: `F-CC-B07-###`. Severity scale: Critical / High / Medium / Low / Info.

> This is a line-review report only. It makes **no** acceptance or closeout claim for the track or any phase.

---

## Files reviewed (20/20)

1. `apps/codecamp-advantage/package.json`
2. `apps/codecamp-advantage/playwright.config.ts`
3. `apps/codecamp-advantage/postcss.config.mjs`
4. `apps/codecamp-advantage/proxy.ts`
5. `apps/codecamp-advantage/scripts/smoke-local-image.sh`
6. `apps/codecamp-advantage/scripts/strip-nomodule-polyfill.mjs`
7. `apps/codecamp-advantage/tsconfig.json`
8. `apps/codecamp-advantage/vitest.config.ts`
9. `packages/api/src/__tests__/codecamp-review-router.test.ts`
10. `packages/api/src/__tests__/codecamp-router.test.ts`
11. `packages/api/src/routers/codecamp.ts`
12. `packages/db/drizzle/0005_codecamp_schema.sql`
13. `packages/db/drizzle/0006_codecamp_indexes.sql`
14. `packages/db/drizzle/0007_codecamp_repos_reviews.sql`
15. `packages/db/drizzle/0008_codecamp_phase.sql`
16. `packages/db/drizzle/0010_codecamp_uniqueness.sql`
17. `packages/db/drizzle/0011_codecamp_webhook_events.sql`
18. `packages/db/drizzle/0012_codecamp_intern_role.sql`
19. `packages/db/src/__tests__/codecamp-backfill-exercises.test.ts`
20. `packages/db/src/__tests__/codecamp-curriculum-data-combined.test.ts`

---

## Findings

### `apps/codecamp-advantage/package.json`

- **F-CC-B07-001 — Info — Dual AI provider SDKs declared as direct app dependencies.**
  Lines 17–18, 36: `@ai-sdk/google`, `@ai-sdk/openai`, and `ai` are listed as app dependencies. AGENTS.md requires AI access to flow through the internal adapter (`@reading-advantage/ai`), never provider SDKs directly. These deps may be transitively required by `@ai-sdk/react` (line 19) for client streaming UI, which is permissible, but their presence is a standing temptation/risk for direct-SDK usage in app code. Recommend confirming (in a UI-file batch) that no app code imports `@ai-sdk/openai` / `@ai-sdk/google` directly outside the adapter.

- **F-CC-B07-002 — Low — `test` script uses `--passWithNoTests`.**
  Line 11: `"test": "vitest run --passWithNoTests"`. This silently turns a zero-test run into a green CI signal. Combined with the narrow `include` globs in `vitest.config.ts` (see F-CC-B07-009), a future glob/path regression that excludes all tests would pass CI without notice. Acceptable as a convenience but worth flagging against the AGENTS.md "CI gate must exit 0 / write tests for all new backend code" posture.

- **F-CC-B07-003 — Info — Version pinning uses caret ranges.**
  Lines 16–67: most deps use `^` ranges (e.g. `next: 16.2.9` is pinned but `react: ^19.2.7`, `ai: ^5.0.95`, etc. are floating). The Version Policy in AGENTS.md asks for "current stable versions pinned in package.json and lockfiles." Exact pinning is enforced in practice by the lockfile; this is informational only.

### `apps/codecamp-advantage/playwright.config.ts`

- **F-CC-B07-004 — Medium — E2E default baseURL points at production.**
  Line 11: `baseURL: process.env.E2E_BASE_URL ?? "https://codecamp.reading-advantage.com"`. A local/CI run with `E2E_BASE_URL` unset will drive the live production site. If any e2e spec performs writes (intern creation, progress updates, PR review submission), an accidental local run pollutes production data. Recommend defaulting to `http://localhost:3000` and requiring an explicit opt-in env var to target production.

- **F-CC-B07-005 — Low — No `webServer` block.**
  The config never starts the app under test, so local `playwright test` relies entirely on the prod default (see F-CC-B07-004) or a manually-set env. This is a test-harness reliability gap, not a correctness bug.

### `apps/codecamp-advantage/postcss.config.mjs`

- No findings. Minimal, conventional Tailwind v4 PostCSS config.

### `apps/codecamp-advantage/proxy.ts`

- **F-CC-B07-006 — Medium — Admin authorization relies on a per-request DB session lookup inside the edge/proxy layer with broad failure-to-redirect handling.**
  Lines 56–88: `requireRole(db, sessionToken, "ADMIN")` runs in the proxy. On any non-`AuthError` failure (e.g. DB connectivity blip) the code logs and redirects to `/?error=session_check_failed` (lines 77–87) — fail-closed, which is correct. However, the admin gate here is the *only* enforcement visible in this file; the real authorization must still be re-checked at the tRPC `adminProcedure` layer (it is — see `trpc.ts` `isAdmin`). Confirm no admin server action/page trusts the proxy alone. Behavior is acceptable but defense-in-depth depends on downstream re-checks.

- **F-CC-B07-007 — Low — Admin-path regex hardcodes the locale set.**
  Line 30: `/^\/(th|en)\/admin(\/|$)/`. The locales `th`/`en` are duplicated from `i18n/routing.ts` (`locales: ["th","en"]`). If a locale is added/changed, this regex silently stops protecting localized admin paths — a latent auth-bypass surface. Recommend deriving from `routing.locales`.

- **F-CC-B07-008 — Low — `isAdminPath` checks both unprefixed `/admin` and locale-prefixed forms, but `config.matcher` excludes nothing locale-related.**
  Lines 26–32 + 103–105: the matcher excludes `api`, `webhooks`, `_next`, and dotted files. The dual handling (unprefixed `/admin` at line 28–29 plus localized at line 30) is defensive but indicates uncertainty about whether unprefixed admin paths can ever reach the proxy given `localePrefix: "always"`. Not a defect; flagged for clarity/intent. The cookie-clearing on UNAUTHORIZED (lines 69–73) sets `secure` implicitly absent — cookie is cleared with `sameSite: "lax"` but no `secure` flag; clearing (maxAge 0) is harmless, but inconsistent with secure-cookie auth requirements in AGENTS.md.

### `apps/codecamp-advantage/scripts/smoke-local-image.sh`

- **F-CC-B07-010 — Low — Smoke "success" gate accepts any non-empty container log.**
  Lines 33–37: success requires both an HTTP 200 from `/en/` **and** a non-empty `/tmp/codecamp-local-image-smoke.log`. The log-non-empty check is a weak signal (any startup noise satisfies it) and could mask a partially-broken container that still serves 200 on the home route. Low risk since it is an opt-in local smoke (`CODECAMP_LOCAL_IMAGE_SMOKE=1`).

- **F-CC-B07-011 — Info — Hits `/en/` only.**
  Line 18: smoke only exercises the `en` locale home; default locale is `th` (routing). A locale-redirect regression on `/` would not be caught. Informational given limited scope of a local smoke.

### `apps/codecamp-advantage/scripts/strip-nomodule-polyfill.mjs`

- **F-CC-B07-012 — Medium — Build step mutates Next.js build output to satisfy a performance probe.**
  Lines 51–61: the script rewrites every `build-manifest.json` to empty `polyfillFiles`. It is well-documented (lines 2–26), idempotent, and justified by `.browserslistrc` targeting modern browsers. The risk is production-readiness/maintainability: a Next.js major upgrade could change manifest shape/location, silently making this a no-op (the probe then regresses) or, worse, corrupting a manifest. The `build` script (`package.json` line 8) chains it after `next build`, so a thrown error fails the build (lines 99–102) — good. Recommend a guard test asserting the manifest still contains `polyfillFiles` as an array post-upgrade. Flag as deliberate tech-debt, not a defect.

- **F-CC-B07-013 — Low — Directory walk skips `node_modules` and `cache` only.**
  Lines 43: reasonable, but the walk traverses the entire `.next` tree on every build. Negligible cost; informational.

### `apps/codecamp-advantage/tsconfig.json`

- **F-CC-B07-014 — Low — `__tests__` excluded from typecheck.**
  Lines 38–41: `"exclude": ["node_modules", "**/__tests__/**"]`. App `check-types` (`tsc --noEmit`) therefore does not type-check test files. Type regressions in tests are only caught by Vitest at runtime. Tests in this batch live in `packages/api` / `packages/db` (checked by their own packages), so app-local test typing is the only gap. Minor.

- **F-CC-B07-015 — Info — `target: ES2017` with modern runtime.**
  Line 3: low ES target is the Next.js default and benign with `module: esnext`. Informational.

### `apps/codecamp-advantage/vitest.config.ts`

- **F-CC-B07-016 — Medium — Test `include` globs are narrow (`components/**`, `lib/**`).**
  Line 13: only `components/**` and `lib/**` are collected. Any tests under `app/**` (server actions, route handlers, page logic) or other dirs are silently not run by `vitest run`. Combined with `--passWithNoTests` (F-CC-B07-002), backend/route logic tests placed outside these two roots would be invisible to CI. Verify no intended tests live outside these globs.

### `packages/api/src/__tests__/codecamp-review-router.test.ts`

- **F-CC-B07-017 — Info — Strong AI-seam test coverage.**
  Lines 137–214: tests prove `reviewExercise` flows through the injected `AIClient` (not an inline OpenRouter/`createOpenAI` path), passes the canonical `reviewResultSchema` (lines 151–162), returns the model output, allows `SYSTEM` (lines 176–187), rejects `STUDENT` with `FORBIDDEN` before reaching the client (lines 189–199), and surfaces client errors as `INTERNAL_SERVER_ERROR` (lines 201–214). This is good adapter-boundary discipline and directly enforces the AGENTS.md "no direct provider SDK" rule.

- **F-CC-B07-018 — Low — Mock AIClient is hand-rolled rather than using the shipped `MockProvider`.**
  Lines 17–81: the test defines a bespoke `mockHolder` and also mocks `MockProvider` to return it (line 79). This duplicates the real mock provider's schema-validation behavior (lines 52–58) and can drift from production `AIClient` semantics (e.g. if the real client wraps/normalizes errors differently). Consider asserting against the real `MockProvider`. Test still meaningfully constrains the seam.

- **F-CC-B07-019 — Low — Schema-validation branch in the mock can mask a contract mismatch as a different failure mode.**
  Lines 53–58: if a fixture fails `safeParse` the mock throws a generic `Error`, which the `INTERNAL_SERVER_ERROR` test (line 208) would also accept. A future fixture typo could pass the "error maps to 500" test for the wrong reason. Minor test-precision concern.

### `packages/api/src/__tests__/codecamp-router.test.ts`

- **F-CC-B07-020 — Medium — Router tests fully mock the domain layer; they verify wiring + error mapping, not authorization or tenant scoping.**
  Lines 10–36: every `@reading-advantage/domain/codecamp` function is `vi.fn()`. The tests therefore confirm output-schema stripping (e.g. lines 106/116 `extraField` removed) and `mapDomainError` translation, but **do not** exercise the real `assertCan`/permission logic or `schoolId` scoping — those are simulated by asserting that a domain-thrown `AuthError` maps to `FORBIDDEN` (e.g. lines 437–449, 577–587). Real authorization correctness must be covered by domain-package tests (out of this batch). This is a coverage boundary to record, not a defect in these files.

- **F-CC-B07-021 — Low — `STUDENT` is used as the default `testUser` for admin-only procedures' FORBIDDEN tests, but the FORBIDDEN there comes from a *mocked* `AuthError`, not the `adminProcedure` middleware.**
  Lines 437–448, 731–741, 807–812, 857–862: because the domain fn is mocked to throw `AuthError`, these tests do not prove the tRPC `adminProcedure` guard fires. The real middleware enforcement is only genuinely tested in `codecamp-review-router.test.ts` (line 189–199) where the domain is *not* mocked for the guard path. Recommend at least one admin-procedure test in this file that relies on the actual middleware rejecting a STUDENT before the (mocked) handler runs. Currently the `reviewExercise` "rejects non-admin" test (lines 903–911) does exercise the middleware since no mock throws — that one is sound.

- **F-CC-B07-022 — Info — Output-shape stripping is well tested.**
  Lines 91–117, 313–335, etc.: assertions that `extraField` is stripped confirm Zod `.output()` contracts actually narrow responses — good defense against accidental data leakage through the API boundary.

### `packages/api/src/routers/codecamp.ts`

- **F-CC-B07-023 — High — `mapDomainError` matches domain errors by exact message string.**
  Lines 56–61: NOT_FOUND/BAD_REQUEST classification depends on brittle string equality/`startsWith` against ~15 hardcoded messages (e.g. `"Exercise repo not found"`, `"A review for this PR URL already exists"`). If any domain function reworded a message, it would silently downgrade to `INTERNAL_SERVER_ERROR` (500) for a user-input error that should be 400/404. There is no shared error-code enum / typed error class bridging domain → transport. Recommend domain errors carry a structured `code` (the codebase already has `AuthError` with a `code` field — extend that pattern to a `CodecampError`). This is a maintainability + correct-status risk that grows with every new message.

- **F-CC-B07-024 — Medium — `practiceIssues` is a `protectedProcedure` that hardcodes the org/repo and is the only procedure with no `try/catch`.**
  Lines 286–306: it calls `codecamp.getPracticeIssues("Reading-Advantage-Thailand", "codecamp-progress-tracker")` directly and returns. The domain fn swallows errors and returns `[]` (verified in `github-issues.ts` lines 23–26), so a hard 500 is unlikely, but the inconsistency (no error mapping) means any *synchronous* throw before the domain try/catch (e.g. import failure) would bypass `mapDomainError`. Also: the hardcoded repo string duplicates seed data (`MODULE_REPO_MAP` / curriculum) and is not tenant-scoped — acceptable since GitHub issues are global content, but the hardcoding should be a config/constant, not a literal in the router.

- **F-CC-B07-025 — Medium — `reviewExercise` constructs the AI generate callback inside the request path on every call.**
  Lines 465–475: `aiClientToGenerateReview(getAIClient(), reviewResultSchema)` is built per-invocation. Functionally fine and correctly behind the adapter (good AGENTS.md compliance), but `getAIClient()` per request assumes a cached singleton; confirm `getAIClient` memoizes (the review-router test mocks it, so production caching is unverified here). The `prDiff` input is bounded to 50000 chars (line 458) — good guard against unbounded LLM cost/prompt-injection size.

- **F-CC-B07-026 — Low — `updateInternGithubUsername` and `markTheoryLessonComplete` declare no `.output()` schema.**
  Lines 162–175, 499–515: unlike sibling procedures, these omit `.output(...)`, so whatever the domain returns is passed through unvalidated/unstripped. AGENTS.md requires every backend op to define an output schema. Potential data-leakage / contract-drift surface (e.g. returning a full user row from `updateInternGithubUsername`).

- **F-CC-B07-027 — Low — `markTheoryLessonComplete` accepts `lessonId: z.string()` (not `.uuid()`), inconsistent with sibling procedures.**
  Line 163 vs. e.g. line 115 (`lessonId: z.string().uuid()`). Loosened input validation; relies on the domain layer to reject malformed IDs. Minor input-contract inconsistency.

- **F-CC-B07-028 — Info — Admin/role boundaries are appropriately split.**
  Lines 456, 483, 499, 517, 531, 547: `reviewExercise`, intern management, `listInterns`, `getInternProgress`, and `webhookEvents` are all `adminProcedure`; learner-facing reads/writes are `protectedProcedure`. This matches the intended auth model. `adminProcedure` admits `ADMIN` and `SYSTEM` (confirmed in `trpc.ts` lines 94–95), which the tests document intentionally.

- **F-CC-B07-029 — Info — Dashboard caching is tenant+user keyed.**
  Lines 261–282: cache key carries `schoolId` + `user.id` (lines 270–271) preventing cross-tenant leakage. Comment documents bounded staleness. Reasonable; relies on `getCachedDashboard` correctness (out of batch).

### `packages/db/drizzle/0005_codecamp_schema.sql`

- **F-CC-B07-030 — Medium — Core curriculum/progress tables have no `school_id` column.**
  Lines 8–98: `codecamp_modules`, `codecamp_lessons`, `codecamp_exercises`, `codecamp_quiz_questions`, `codecamp_user_progress`, `codecamp_chat_conversations`, `codecamp_chat_messages` all lack a tenant column. These are registered `REFERENTIAL` in `packages/domain/src/tenant-registry.ts` (lines 184–193), so TenantDB throws unless `unscoped()` is used. Multi-tenant scoping therefore depends entirely on owner-FK joins (`user_id` → `users.school_id`) being correctly applied in every domain query. This is an architectural choice (codecamp appears single-tenant/global content), but it concentrates tenant-isolation risk in domain query code rather than the DB layer. Record as a scoping-model risk to verify against domain query batches.

- **F-CC-B07-031 — Low — `codecamp_user_progress.score` defaults to `0 NOT NULL`.**
  Line 71: a not-yet-attempted lesson row would carry `score = 0`, indistinguishable from a genuine 0% score. Progress/quiz-average aggregations (`listInterns.quizAverage`) must filter by `status`/`completed_at` to avoid skewing averages downward. Verify the aggregation logic in domain. Correctness depends on downstream handling.

- **F-CC-B07-032 — Info — FK cascade choices are sensible.**
  Lines 102–120: content FKs cascade-delete; `chat_conversations.module_id/lesson_id` use `SET NULL` (lines 116–118) so deleting a module doesn't destroy chat history — reasonable design.

### `packages/db/drizzle/0006_codecamp_indexes.sql`

- **F-CC-B07-033 — Low — No composite index for the `(user_id, lesson_id)` progress lookup or `(module_id, order)` ordering.**
  Lines 2–8: single-column FK indexes are present (good), but common access patterns — per-user progress within a module, ordered lessons within a module — would benefit from composite indexes. The unique constraint on `codecamp_user_progress(user_id, lesson_id)` (migration 0005 line 75) provides a usable composite index for that pair, so the gap is mainly ordered module/lesson scans. Performance-only, low severity at expected cohort sizes.

### `packages/db/drizzle/0007_codecamp_repos_reviews.sql`

- **F-CC-B07-034 — High — `repo_url` and `pr_url` uniqueness was omitted from the original table-creation migration and only added later in 0010.**
  Lines 7–26: neither `codecamp_exercise_repos.repo_url` nor `codecamp_pr_reviews.pr_url` has a UNIQUE constraint here; 0010 backfills it. Any environment that ran 0007 but stopped before 0010, or had duplicate rows inserted in between, will have a failing `CREATE UNIQUE INDEX` in 0010 (duplicates block the index). The domain code relies on app-level "already exists" checks (`pr-reviews.ts` lines 54–56), which are race-prone without the DB constraint. Migration-ordering correctness depends on 0010 having run cleanly everywhere — see F-CC-B07-038.

- **F-CC-B07-035 — Low — `codecamp_pr_reviews.user_id` cascade-deletes reviews when a user is removed.**
  Line 33: deleting a user erases their PR review audit trail. For an intern-progress/audit context this may be undesirable (AGENTS.md treats audit data as immutable). Consider `RESTRICT`/soft-delete if PR reviews are evidence of work. Design judgment, not a defect.

### `packages/db/drizzle/0008_codecamp_phase.sql`

- **F-CC-B07-036 — Medium — `phase` is a free-text column with default `'A'`, not constrained to the A–D enum used by the API.**
  Line 4: `ADD COLUMN "phase" text DEFAULT 'A' NOT NULL`. The router validates `phase` as `z.enum(["A","B","C","D"])` (codecamp.ts line 409) but the DB permits any string. A bad seed/manual update could insert e.g. `'E'` or `'a'`, which would silently fall outside `modulesByPhase` filters and dashboard phase grouping. Recommend a CHECK constraint or PG enum to match the application contract. Curriculum-correctness risk.

### `packages/db/drizzle/0010_codecamp_uniqueness.sql`

- **F-CC-B07-037 — Info — Correctly backfills the missing uniqueness constraints.**
  Lines 6–9: adds `CREATE UNIQUE INDEX IF NOT EXISTS` for `repo_url` and `pr_url`, with a clear comment explaining the schema/migration drift. This is the right remediation for F-CC-B07-034.

- **F-CC-B07-038 — Medium — `CREATE UNIQUE INDEX IF NOT EXISTS` will fail (not skip) if duplicate rows already exist.**
  Lines 6–9: `IF NOT EXISTS` guards against the index already existing, but does not guard against existing duplicate data — the statement errors on duplicates. The migration comment ("Run this migration before redeploying") acknowledges ordering sensitivity but provides no dedup/cleanup step. Production-readiness risk: a deploy could halt mid-migration on a DB that accumulated duplicates between 0007 and 0010. Recommend a pre-step that detects/removes duplicates or documents the manual remediation.

### `packages/db/drizzle/0011_codecamp_webhook_events.sql`

- **F-CC-B07-039 — High — No unique constraint on `delivery_id`; webhook deduplication is best-effort only.**
  Lines 2–14: `delivery_id` is a nullable plain `text` column with no unique index. The table is described as supporting "inbound GitHub webhook deduplication," but without a UNIQUE constraint on `delivery_id`, concurrent or retried deliveries can produce duplicate processing/rows (GitHub retries on non-2xx). The domain `recordWebhookEvent` path (`pr-reviews.ts` lines 140–146) writes `deliveryId ?? null` with no on-conflict handling. If dedup is a real requirement, add `UNIQUE(delivery_id)` (partial, `WHERE delivery_id IS NOT NULL`) and an `ON CONFLICT DO NOTHING` insert. Integration-risk / idempotency gap (AGENTS.md calls out idempotency for webhook processing).

- **F-CC-B07-040 — Low — `payload_json` stores raw webhook payloads with no retention/PII note.**
  Line 12: persisting full GitHub payloads indefinitely is a data-retention/PII consideration (usernames, repo metadata). No TTL or redaction. Worth a retention policy decision for production.

- **F-CC-B07-041 — Low — `outcome`/`reason` are free text, not enums.**
  Lines 10–11: `outcome` is `NOT NULL` text; the domain uses a `CodecampWebhookEventOutcome` type (pr-reviews.ts line 140) but the DB does not enforce it. Minor consistency gap; admin `webhookEvents` query output relies on these values.

### `packages/db/drizzle/0012_codecamp_intern_role.sql`

- **F-CC-B07-042 — Medium — `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block (older PG) and is irreversible.**
  Line 3: `ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'INTERN'`. On PostgreSQL < 12 this fails inside a transaction; even on ≥12 the new enum value cannot be used in the same transaction it is added. If the migration runner wraps statements in a transaction (drizzle-kit / the migration job), a subsequent migration referencing `'INTERN'` in the same txn could fail. Also, enum values cannot be removed, so this is non-reversible — acceptable but should be documented in the rollback plan. References ADR 0003 (good). Verify the migration job's transaction handling for `ALTER TYPE`.

### `packages/db/src/__tests__/codecamp-backfill-exercises.test.ts`

- **F-CC-B07-043 — Info — Good coverage of the backfill/exercise-mapping helpers.**
  Lines 5–75: tests assert `MODULE_REPO_MAP` membership, exclusions (`dev-environment`, `monorepo-packages`), suffix stripping, the fallback exercise for `real-world-practice`, the null path for unknown slugs, and that every mapped module yields ≥1 exercise. These are pure-data unit tests with no DB dependency — appropriate per AGENTS.md (mock the DB / pure unit tests).

- **F-CC-B07-044 — Low — Title assertions hardcode curriculum copy.**
  Lines 33, 41, 47, 54, 56: exact-string assertions (e.g. `"HTML & CSS Exercise"`, `"Real-World Practice Exercise"`) couple the test to curriculum wording, so legitimate copy edits will break tests. This is intentional pinning for curriculum correctness but raises maintenance cost; acceptable trade-off, flagged for awareness.

### `packages/db/src/__tests__/codecamp-curriculum-data-combined.test.ts`

- **F-CC-B07-045 — Info — Strong curriculum-integrity invariants.**
  Lines 29–160: asserts 18 modules, 85 lessons, unique slugs, contiguous orders 1–18, 16 repo rows, M1/M16 exclusions, repo↔module mapping with matching order, every quiz `correctAnswer ∈ optionsJson`, exactly 4 options per question, non-empty exercise instructions, repo-URL naming pattern, no placeholder URLs, and portfolio/exercise URL separation. This is exactly the curriculum/progression correctness coverage the audit targets and is high quality.

- **F-CC-B07-046 — Low — Magic-number invariants (18 modules / 85 lessons / 16 repos) will fail on any intentional curriculum expansion.**
  Lines 30, 38, 53: hardcoded counts are good regression guards but require test edits for every curriculum change. Acceptable; ensure curriculum changes update these in lockstep.

- **F-CC-B07-047 — Low — Quiz-answer test only validates `correctAnswer` is *present* in options, not that it is unique among them.**
  Lines 73–86: if `optionsJson` ever contained the correct answer twice (4 options with a duplicate), `toContain` still passes while the quiz UI could render two "correct" choices. Minor edge-case gap in an otherwise thorough check.

- **F-CC-B07-048 — Info — Cross-checks portfolio vs exercise repo overlap precisely.**
  Lines 135–148: explicitly documents and asserts that only the `codecamp-progress-tracker` repo is shared between M18 capstone and Phase C/D portfolio, and that Phase A/B portfolios are not exercise repos. Good intent-encoding.

---

## Cross-cutting observations

- **Error-mapping fragility (F-CC-B07-023)** is the single most impactful maintainability/correctness risk in the batch: HTTP status correctness for the entire codecamp API depends on string-equality against domain messages. A typed error contract would eliminate a whole class of silent 500-instead-of-400/404 regressions.
- **Migration drift + uniqueness/dedup gaps (F-CC-B07-034, -038, -039)** form a coherent theme: several integrity constraints (repo/pr uniqueness, webhook delivery dedup) are enforced at the application layer or in follow-up migrations rather than at table creation, leaving race conditions and deploy-ordering hazards. These are the highest production-readiness concerns.
- **Tenant scoping for codecamp is entirely `REFERENTIAL`/owner-FK based (F-CC-B07-030)** — no `school_id` columns on codecamp tables. Isolation correctness must be verified in the domain query batches; it is not enforceable by these schema files alone.
- **AI adapter compliance is good** in the router (`reviewExercise` goes through `getAIClient()` + `aiClientToGenerateReview`) and is well tested. The lingering risk is the direct `@ai-sdk/*` app deps (F-CC-B07-001), which a later UI-file batch should confirm are not imported outside the adapter.

## Limitations

- **Read-only review.** No source was modified; no tests were executed and no build/typecheck was run as part of this review. Severity reflects static reading plus targeted cross-file grep, not runtime verification.
- **Mocked-layer tests.** The two API test files mock the entire domain layer, so this review can attest only to transport wiring, output-schema stripping, and error mapping — **not** to the correctness of `assertCan` authorization, `school_id` scoping, or domain business logic. Those live in domain/webhooks/db source files outside `cc-batch-07` and must be assessed in their own batches.
- **Out-of-batch dependencies referenced for context only:** `packages/api/src/trpc.ts` (`adminProcedure`/`isAdmin`), `packages/domain/src/codecamp/*` (`github-issues.ts`, `pr-reviews.ts`), `packages/domain/src/tenant-registry.ts`, `apps/codecamp-advantage/i18n/routing.ts`, and the drizzle journal/seed data. Findings that depend on those files (e.g. F-CC-B07-006, -020, -030, -039) are scoped to what is observable from the batch files plus those references; full confirmation requires reviewing the referenced files in their assigned batches.
- **No assessment of runtime/Docker/Cloud Run behavior**, actual webhook payloads, or live AI provider responses was performed.
- This report makes **no acceptance or closeout determination** for any phase or for the track.
