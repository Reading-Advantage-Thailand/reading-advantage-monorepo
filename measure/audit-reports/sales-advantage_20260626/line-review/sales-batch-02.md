# Line Review — sales-batch-02

- Track: `sales_advantage_review_20260626`
- Batch: `sales-batch-02` (20 files)
- Baseline SHA: `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
- Reviewer scope: sales curriculum/progression, browser audio recording/upload, storage adapter use, AI evaluation/fallback/privacy, auth/role/tenant boundaries, admin reporting, AGENTS compliance, test quality
- Source code edited during review: **none**
- Finding ID prefix: `F-SALES-B02-###`
- Severity scale: Critical / High / Medium / Low / Info

This is a line-by-line review only. It makes **no acceptance or closeout claims**; those are the Measure reviewer/orchestrator's responsibility.

---

## Files reviewed (20/20)

| # | File | Verdict |
|---|------|---------|
| 1 | `apps/sales-advantage/next.config.ts` | OK + 1 Info |
| 2 | `apps/sales-advantage/package.json` | 1 Medium |
| 3 | `apps/sales-advantage/postcss.config.mjs` | Clean |
| 4 | `apps/sales-advantage/proxy.ts` | 2 Low |
| 5 | `apps/sales-advantage/scripts/sales-curriculum-seed.ts` | 1 High, 2 Low |
| 6 | `apps/sales-advantage/scripts/static-seed.ts` | 2 Medium, 2 Low/Info |
| 7 | `apps/sales-advantage/tsconfig.json` | 1 Low |
| 8 | `apps/sales-advantage/vitest.config.ts` | 1 Low |
| 9 | `packages/ai/README.md` | 1 Low |
| 10 | `packages/ai/eslint.config.mjs` | Clean |
| 11 | `packages/ai/package.json` | OK (adapter pkg; correct SDK home) |
| 12 | `packages/ai/src/__tests__/__snapshots__/phase-2-mock-provider.test.ts.snap` | OK + note |
| 13 | `packages/ai/src/__tests__/contract-suite.ts` | Clean (good) |
| 14 | `packages/ai/src/__tests__/diagram.fixture.ts` | 1 Low |
| 15 | `packages/ai/src/__tests__/phase-0-setup.test.ts` | 1 Medium |
| 16 | `packages/ai/src/__tests__/phase-1-interface.test-d.ts` | Clean (good) |
| 17 | `packages/ai/src/__tests__/phase-10-closeout.test.ts` | 1 Medium (shared) |
| 18 | `packages/ai/src/__tests__/phase-11-sdk-v2-call-shape.test.ts` | OK (good) |
| 19 | `packages/ai/src/__tests__/phase-11-sdk-version-contract.test.ts` | 1 Medium (shared) |
| 20 | `packages/ai/src/__tests__/phase-12-closeout-artifacts.test.ts` | 1 Medium (shared) |

---

## Findings

### F-SALES-B02-001 — Medium — App declares provider SDKs directly (adapter-bypass risk)
**File:** `apps/sales-advantage/package.json:17-19,37`
```
"@ai-sdk/google": "^2.0.36",
"@ai-sdk/openai": "^2.0.68",
"@ai-sdk/react": "^2.0.0",
...
"ai": "^5.0.95",
```
AGENTS.md §AI / §Provider Neutrality requires application code to access AI only through `@reading-advantage/ai` (which is also a dependency, line 22). `@ai-sdk/react` (UI `useChat`/streaming hooks) and `ai` are arguably defensible at the app edge, but `@ai-sdk/google` and `@ai-sdk/openai` are server provider SDKs that should live **only** in the adapter package. Their presence as direct app dependencies invites provider-SDK calls that bypass the adapter chokepoint and contradict the version-contract test in this same batch (`phase-11-sdk-version-contract.test.ts:159-174`, which asserts the *root* must not declare these — but does not guard the sales app).
**Recommendation:** Confirm no app source imports `@ai-sdk/google` / `@ai-sdk/openai` directly; if not used, remove them. If chat genuinely needs a provider model instance client-side, route it through the adapter. (Verification of app `app/`/`components/` imports is out of this batch's file list — see Limitations.)

### F-SALES-B02-002 — High — Curriculum seed inserts orphaned lessons on module conflict (`"fallback-id"`)
**File:** `apps/sales-advantage/scripts/sales-curriculum-seed.ts:221-248`
```ts
const [savedMod] = await db.insert(salesModules)
  .values({ ... })
  .onConflictDoNothing()
  .returning();
const moduleId = savedMod?.id ?? "fallback-id";   // line 233
...
await db.insert(salesLessons).values({ moduleId, ... })  // line 236-247
```
When `onConflictDoNothing` skips an existing module, `returning()` yields no row, so `moduleId` becomes the literal string `"fallback-id"`. Every lesson (and downstream rubric/scenario/quiz) for that module is then inserted with `moduleId = "fallback-id"` — orphaned rows pointing at a non-existent module, corrupting the curriculum graph. This silently produces invalid data rather than failing.
**Recommendation:** On conflict, look up the existing module id and reuse it, or `continue`/skip the module's children. Never fall back to a sentinel FK.

### F-SALES-B02-003 — Medium — `static-seed --force` destructively wipes all curriculum with no environment guard
**File:** `apps/sales-advantage/scripts/static-seed.ts:1336-1344`
```ts
const force = process.argv.includes("--force");
if (force) {
  await db.delete(salesQuizQuestions);
  await db.delete(salesRoleplayScenarios);
  await db.delete(salesLessons);
  await db.delete(salesRubrics);
  await db.delete(salesModules);
}
```
Unconditional table-wide `DELETE` against whatever DB `@reading-advantage/db` resolves to (no `NODE_ENV`/`DATABASE_URL` assertion, no confirmation). A `--force` run pointed at a non-dev database erases the entire sales curriculum, including admin-`approved` content. Sales tables are global (no `schoolId`), so this is not tenant-scoped.
**Recommendation:** Gate destructive seeds behind an explicit `NODE_ENV !== "production"` (or `ALLOW_DESTRUCTIVE_SEED`) check; print the target DB before deleting.

### F-SALES-B02-004 — Medium — Static seed writes `reviewStatus='approved'`, bypassing content governance
**File:** `apps/sales-advantage/scripts/static-seed.ts:1376,1388`
```ts
reviewStatus: "approved",   // lessons
...
reviewStatus: "approved",   // rubrics
```
The AI seed correctly lands everything as `draft` for admin review (`sales-curriculum-seed.ts:245,258`, and its header at lines 19-20). The static seed instead inserts `approved` content directly. The file header (lines 6-8) frames this as dev-only, but there is no runtime guard preventing it from being run against a shared/staging/prod database, where it would surface unreviewed hand-authored content to reps with no approval step.
**Recommendation:** Combine with F-SALES-B02-003's environment guard; or land static content as `draft` and document the manual approval path.

### F-SALES-B02-005 — Low — Seed scripts have no transaction boundary (partial writes on failure)
**Files:** `apps/sales-advantage/scripts/sales-curriculum-seed.ts:219-294`; `apps/sales-advantage/scripts/static-seed.ts:1356-1422`
Both scripts perform many sequential `db.insert(...)` calls outside any transaction. A failure mid-loop (network blip, schema mismatch, the F-SALES-B02-002 path) leaves the curriculum half-seeded with dangling modules/lessons. AGENTS.md §Backend Function Requirements calls for transaction boundaries where appropriate; bulk seeding qualifies.
**Recommendation:** Wrap each module's insert tree (or the whole seed) in `db.transaction(...)`.

### F-SALES-B02-006 — Low — Curriculum seed reads source docs from a hardcoded local home path
**File:** `apps/sales-advantage/scripts/sales-curriculum-seed.ts:82-103`
```ts
const baseDir = process.env.HOME ? `${process.env.HOME}/Desktop/advantage-pr/09-sales-enablement` : "~/Desktop/advantage-pr/09-sales-enablement/";
```
The enablement source corpus is read from a developer-machine path. Missing files are swallowed with a warning (lines 98-100) and the run silently degrades to generic content (lines 188-190). On CI/another machine the seed will quietly produce lower-fidelity curriculum without an obvious signal.
**Recommendation:** Make the doc directory an explicit env var (e.g. `SALES_ENABLEMENT_DIR`) and log clearly when falling back to generic generation.

### F-SALES-B02-007 — Low — Seed scripts are excluded from the test runner
**File:** `apps/sales-advantage/vitest.config.ts:13-17`
The `include` globs cover `app/**`, `components/**`, `lib/**` only; `scripts/**` is not covered. The curriculum-shaping logic (Zod schemas, conflict handling — see F-SALES-B02-002) is therefore untested. AGENTS.md §Testing expects tests for new backend-shaped code.
**Recommendation:** Extract the insert/upsert logic into a testable function and add coverage, or include `scripts/**` with mocked DB.

### F-SALES-B02-008 — Low — `isAdminPath` hardcodes locales `(th|en)`, can drift from `routing.locales`
**File:** `apps/sales-advantage/proxy.ts:26-32`
```ts
/^\/(th|en)\/admin(\/|$)/.test(lowerPath)
```
The locale set is duplicated as a literal regex while the rest of the middleware derives locales from `routing.locales` (lines 90-92). If a locale is added to `i18n/routing`, locale-prefixed `/xx/admin` routes would skip the `SALES_ADMIN` role gate at the middleware layer.
**Recommendation:** Build the admin-path check from `routing.locales` so the two cannot diverge. (Defense-in-depth: API/route handlers should still enforce role server-side regardless.)

### F-SALES-B02-009 — Info — Sales curriculum tables are global (no `schoolId`); confirm single-tenant intent
**Files:** `proxy.ts:57` (`requireRole(db, sessionToken, "SALES_ADMIN")`); seed inserts in both scripts (no `schoolId`); schema `packages/db/src/schema/sales.ts` (out of batch) confirmed to have `order`/`reviewStatus` but no `schoolId` via grep.
The admin gate authorizes by role only, and curriculum/quiz/rubric rows carry no tenant column. This appears intentional (Sales Advantage is an internal single-tenant coaching app), so AGENTS.md §Multi-Tenancy "scope every query by schoolId" does not directly apply — but it is worth an explicit decision record. If reps from different distributors should ever be isolated, the current model offers no tenant boundary.
**Recommendation:** Record the single-tenant decision (tenant-registry / spec) so reviewers don't flag the absent `schoolId` as a defect later. No code change implied by this batch.

### F-SALES-B02-010 — Medium — `phase-0-setup.test.ts` runs a real `tsc` build and probes `node_modules` inside a unit test
**File:** `packages/ai/src/__tests__/phase-0-setup.test.ts:74-113`
```ts
expect(existsSync(resolve(localNm, "vitest"))).toBe(true);   // 80
...
const result = await exec("./node_modules/.bin/tsc --noEmit", { cwd: PKG_ROOT });  // 99
```
Asserting that `node_modules/` is populated (lines 74-82) and shelling out to `tsc --noEmit` (lines 96-113) couples the test to install state, machine layout, and a ~60s compile (the file even documents the RPC-timeout workaround at lines 92-95). This is an environment/CI smoke masquerading as a unit test: it is slow, flaky under parallel turbo load, and fails for reasons unrelated to the code under test.
**Recommendation:** Move the build/install smoke to a CI step or a clearly separated, opt-in integration suite; keep `*.test.ts` behavioral and fast.

### F-SALES-B02-011 — Medium — Closeout/version "tests" assert Measure docs, lockfile text, and commit SHAs (brittle, cross-track)
**Files:** `phase-10-closeout.test.ts` (whole file; e.g. SHA pin `:238-264`, 50-line caps `:114-127,189-200`, archive move `:203-298`); `phase-11-sdk-version-contract.test.ts:245-321` (regex-parses `pnpm-lock.yaml`); `phase-12-closeout-artifacts.test.ts:136-418` (asserts artifact JSON existence, `tech-stack.md` rows, commit refs `43c31318`/`38370826`).
These are process/artifact assertions, not behavioral software tests:
- They read repo-root Measure docs and pin a hardcoded commit SHA (`8075dad`, line 263) and exact line caps — guaranteed to rot.
- They parse `pnpm-lock.yaml` with line-anchored regex (`phase-11-...:262`), brittle to lockfile-format changes.
- They belong to other tracks (`ai_adapter_package_20260603`, `ai_sdk_major_migration`) yet run in the `@reading-advantage/ai` suite, so unrelated Measure housekeeping can turn the package's CI red.
This is the dominant test-quality theme of the batch: the AI package's suite mixes durable behavioral contracts (good — see F-SALES-B02-012 positives) with fragile repo-state assertions.
**Recommendation:** Relocate Measure/process-artifact checks to a dedicated meta-suite or CI script outside the package's `test` gate; reserve `packages/ai` tests for behavior of the adapter.

### F-SALES-B02-012 — Low — README provider table omits OpenRouter and the multimodal/stream/transcribe methods
**File:** `packages/ai/README.md:29-40,82-87`
The provider table lists only `openai` / `google` / `mock`, but the type contract and tests in this batch include an `openrouter` provider (`phase-1-interface.test-d.ts:153`) and the `AIClient` interface exposes `generateObjectFromMedia`, `transcribeAudio`, and `streamText` (`phase-1-interface.test-d.ts:68-77`) — none documented. For an app whose roleplay feature depends on audio transcription/evaluation, the omission of the multimodal surface from the adapter docs is a real gap.
**Recommendation:** Add `openrouter` to the table and document the media/stream/transcribe methods (and their privacy/fallback semantics).

### F-SALES-B02-013 — Low — `diagram.fixture.ts` comment references a non-existent path
**File:** `packages/ai/src/__tests__/diagram.fixture.ts:8`
```
*   - The shared contract harness (`__fixtures__/contract-suite.ts`)
```
The harness actually lives at `__tests__/contract-suite.ts` (this batch, file 13). Minor doc drift that misleads navigation.
**Recommendation:** Fix the path in the comment.

### F-SALES-B02-014 — Low — `tsconfig.json` excludes `__tests__`, so app test files are not type-checked by `check-types`
**File:** `apps/sales-advantage/tsconfig.json:28`
```
"exclude": ["node_modules", "**/__tests__/**"]
```
`check-types` runs `tsc --noEmit` against this config (`package.json:13`), so type errors inside `app/**/__tests__` and `components/**/__tests__` test files are never caught by the typecheck gate (only at vitest runtime). Type regressions in test code ship silently.
**Recommendation:** Either include tests in a test-specific tsconfig used by `check-types`, or accept and document the gap.

### F-SALES-B02-015 — Info — `serverActions.bodySizeLimit: "20mb"` widens the upload attack surface
**File:** `apps/sales-advantage/next.config.ts:34-38`
The 20 MB limit supports browser audio (roleplay recording) upload via Server Actions. Reasonable for the feature, but it is a DoS/storage-abuse surface. The audio path's actual validation (mime/type/duration) and storage-adapter routing are not in this batch (see Limitations); confirm rate limiting (`lib/rate-limit.ts`, batch-01) and adapter-mediated `storage.put()` cover it.
**Recommendation:** Verify in the audio-upload route review that size/type/duration are enforced server-side and storage goes through the adapter.

### F-SALES-B02-016 — Info (positive) — Curriculum bakes in honest-claims / outcome-claims discipline
**File:** `apps/sales-advantage/scripts/static-seed.ts:812-871` (and seed prompt `sales-curriculum-seed.ts:90,122`)
The curriculum explicitly enumerates banned phrases ("Guaranteed results", "Every student will improve", "100% of our schools") and mandates the variance-disclaimer citation ("Results vary by implementation quality"). This aligns with the privacy/claims-integrity goals of the review and is good content governance to preserve.
**Recommendation:** None — retain. Worth a regression test asserting banned phrases never appear in `approved` lessons.

### F-SALES-B02-017 — Low — Admin middleware performs a DB role lookup on every admin navigation
**File:** `apps/sales-advantage/proxy.ts:56-57`
`requireRole(db, sessionToken, "SALES_ADMIN")` hits the database on each matched admin request with no short-cache. Functionally correct and arguably safest, but a per-navigation DB round-trip on the edge path. Acceptable at current scale; note for observability/perf.
**Recommendation:** Acceptable as-is; revisit only if admin traffic grows.

### F-SALES-B02-018 — Low — Quiz `correctAnswer` stored as duplicated option text (drift risk)
**Files:** `apps/sales-advantage/scripts/static-seed.ts:1409-1416`; `sales-curriculum-seed.ts:282-289`
`correctAnswer` is stored as the full option string and `optionsJson` stores the options array separately. If option text is ever edited without updating `correctAnswer` (or vice versa), grading silently breaks with no referential link. An index-based or id-based answer reference would be safer.
**Recommendation:** Store the correct answer as an index/id into `optionsJson`, or add a validation step asserting `correctAnswer ∈ options` at insert time.

---

## Cross-cutting observations

- **Adapter use (positive):** `sales-curriculum-seed.ts:31,192` correctly obtains the AI client via `getAIClient()` from `@reading-advantage/ai` and calls `generateObject` with a Zod schema — exactly the AGENTS.md §AI pattern. No raw provider SDK calls in the seed.
- **Security headers (positive):** `next.config.ts:39-59` sets `no-store, private` on `/api/*` plus `X-Frame-Options: DENY`, `nosniff`, and a sane `Referrer-Policy` globally.
- **Auth/role gate (positive):** `proxy.ts` cleanly distinguishes `FORBIDDEN` (redirect to home with `error=forbidden`) from `UNAUTHORIZED` (clear cookie, redirect with `redirectTo`), and logs unexpected failures as structured JSON.
- **Test-quality split:** behavioral contract tests in this batch are strong (`contract-suite.ts`, `phase-1-interface.test-d.ts`, `phase-11-sdk-v2-call-shape.test.ts` — the `maxTokens → maxOutputTokens` v5 pin is a genuinely useful regression net). The weakness is the closeout/version/setup tests that assert repo/process state (F-SALES-B02-010, F-SALES-B02-011).

---

## Limitations

- **Out-of-batch dependencies:** The audio roleplay recording/upload UI (`components/roleplay-recorder.tsx`, batch-01), the upload route handler, storage-adapter wiring, and the roleplay AI evaluator/fallback/privacy logic (`packages/domain/src/sales/roleplay-evaluator.ts`, batch-04/05) are **not** in this batch. Findings F-SALES-B02-001, -015 flag risks whose final adjudication depends on those files.
- **Schema confirmation:** Tenant/`schoolId` absence (F-SALES-B02-009) was confirmed via `grep` of `packages/db/src/schema/sales.ts` and `packages/auth` role definitions, but the full schema file is reviewed in batch-04; treat F-SALES-B02-009 as provisional pending that review.
- **No execution:** No seeds, tests, lint, or typecheck were run as part of this review (read-only line review). Findings about runtime behavior (e.g. F-SALES-B02-002 orphan inserts, F-SALES-B02-010 tsc timeout) are inferred from the source, not observed.
- **Cross-track tests:** `phase-10/11/12` tests belong to the `ai_adapter_package_20260603` and `ai_sdk_major_migration` tracks; they are reviewed here because they are in the batch file list, but remediation may need coordination with those tracks.
- **Snapshot fixture note (file 12):** the mock-provider snapshot encodes a science-advantage NGSS recommendation fixture reused across packages — not a defect, but the cross-domain coupling is worth awareness.

---

## Severity tally

- High: 1 (F-SALES-B02-002)
- Medium: 5 (F-SALES-B02-001, -003, -004, -010, -011)
- Low: 9 (F-SALES-B02-005, -006, -007, -008, -012, -013, -014, -017, -018)
- Info: 3 (F-SALES-B02-009, -015, -016)

_End of `sales-batch-02` line review. No acceptance or closeout determination is made by this report._
