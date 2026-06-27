# Line-by-Line Review — `sales-batch-04`

> **Track:** `sales_advantage_review_20260626`
> **Parent:** `monorepo_feature_review_masterplan_20260626`
> **Batch:** `sales-batch-04` (file list: `/tmp/opencode/sales-batch-04`)
> **Reviewer mode:** read-only line review. No source code was edited.
> **Date:** 2026-06-27

This report covers the 20 files in `sales-batch-04`. Findings are line-anchored
and carry severity (Critical / High / Medium / Low / Info) and stable IDs
`F-SALES-B04-###`. This is a line-review artifact only — it makes **no
acceptance or closeout claims** for any track or phase.

---

## Scope and method

- Read each of the 20 listed files in full.
- Cross-checked three boundary concerns against files outside the batch (for
  context only, not reviewed line-by-line): the `audio_storage_key`
  nullability drift across migrations `0021`/`0023`, the schema column
  definition, and the router↔test domain-function surface.
- Focus areas applied per task: sales curriculum/progression, browser audio
  recording/upload, storage adapter usage, AI evaluation/fallback/privacy,
  auth/role/tenant boundaries, admin reporting, AGENTS.md compliance, and test
  quality.

### Files reviewed (20/20)

| # | File | Type |
|---|------|------|
| 1 | `packages/ai/src/providers/google.test.ts` | test |
| 2 | `packages/ai/src/providers/google.ts` | source (adapter) |
| 3 | `packages/ai/src/providers/mock.test.ts` | test |
| 4 | `packages/ai/src/providers/mock.ts` | source (adapter) |
| 5 | `packages/ai/src/providers/openai.test.ts` | test |
| 6 | `packages/ai/src/providers/openai.ts` | source (adapter) |
| 7 | `packages/ai/src/providers/openrouter-preflight.test.ts` | test |
| 8 | `packages/ai/src/providers/openrouter.test.ts` | test |
| 9 | `packages/ai/src/providers/openrouter.ts` | source (adapter) |
| 10 | `packages/ai/src/types.ts` | source (contracts) |
| 11 | `packages/ai/tsconfig.json` | config |
| 12 | `packages/ai/vitest.config.ts` | config |
| 13 | `packages/api/src/__tests__/sales-router.test.ts` | test |
| 14 | `packages/api/src/routers/sales.ts` | source (transport) |
| 15 | `packages/db/drizzle/0021_sales_advantage.sql` | migration |
| 16 | `packages/db/src/__tests__/sales-schema-parity.test.ts` | test |
| 17 | `packages/db/src/schema/sales.ts` | source (schema) |
| 18 | `packages/domain/src/__tests__/sales-mutations.test.ts` | test |
| 19 | `packages/domain/src/__tests__/sales-queries.test.ts` | test |
| 20 | `packages/domain/src/__tests__/sales-roleplay-evaluator.test.ts` | test |

---

## Findings summary

| ID | Severity | File | Theme |
|----|----------|------|-------|
| F-SALES-B04-001 | High | `0021_sales_advantage.sql` / `schema/sales.ts` | Schema↔migration drift (`audio_storage_key` NOT NULL) |
| F-SALES-B04-002 | High | `sales-router.test.ts` | Mocks 6 roleplay/audio domain fns the router never exposes; no coverage of the audio path |
| F-SALES-B04-003 | Medium | `google.ts`, `openrouter.ts` | Multimodal audio sent to AI provider with no privacy/retention guard or PII note |
| F-SALES-B04-004 | Medium | `sales-schema-parity.test.ts` | `arrayContaining` parity test cannot catch extra/renamed columns or migration drift |
| F-SALES-B04-005 | Medium | `sales.ts` (router) | Error mapping by string matching (`includes("not found")`) is brittle |
| F-SALES-B04-006 | Medium | `sales-roleplay-evaluator.test.ts` | Fallback STT→text path: transcript privacy/excerpt truncation only asserted by test, no redaction |
| F-SALES-B04-007 | Low | `google.ts`, `openrouter.ts` | `transcribeAudio`/media: no input size/duration/mime validation before base64 to provider |
| F-SALES-B04-008 | Low | `openrouter.ts` | `maxRetries: 1` + single-model default; no provider failover within adapter |
| F-SALES-B04-009 | Low | `sales.ts` (schema) | `salesChatMessages.role` is free-text, not an enum/check constraint |
| F-SALES-B04-010 | Low | `sales-mutations.test.ts` | `saveChatMessage` test hand-rolls `db.insert` mock, bypassing tenant-scoped contract |
| F-SALES-B04-011 | Low | `openrouter.ts` | Hardcoded free/preview model defaults are durability risk for the eval pipeline |
| F-SALES-B04-012 | Info | `types.ts` | `AIConfig.apiKey` doc says "Read from env if not supplied" — conflicts with provider "never read process.env" guarantee |
| F-SALES-B04-013 | Info | `mock.ts` | `transcribeAudio` mock silently returns a fixture default while other methods throw when unconfigured — inconsistent contract |
| F-SALES-B04-014 | Info | `vitest.config.ts` | 120s test timeout package-wide masks slow/hanging unit tests |
| F-SALES-B04-015 | Info | `sales.ts` (router) | No rate limiting / audit logging on `admin.createRep` and `approveContent` |
| F-SALES-B04-016 | Info | `openrouter.test.ts` | Test comment documents a known v5 `maxTokens` regression as design context |

---

## Detailed findings

### F-SALES-B04-001 — High — `audio_storage_key` schema/migration nullability drift
**Files:** `packages/db/drizzle/0021_sales_advantage.sql:118`,
`packages/db/src/schema/sales.ts:112`

Migration `0021` line 118 creates `sales_roleplay_attempts.audio_storage_key`
as `text NOT NULL`, but `schema/sales.ts:112` declares it nullable
(`text("audio_storage_key")`, no `.notNull()`). A later migration
`0023_cultured_sunspot.sql:1` (outside this batch) drops the NOT NULL to
reconcile, so the live schema and the Drizzle definition agree **only after
0023**. Within batch-04's reviewable artifacts the `0021` migration is
internally inconsistent with the schema source as shipped.

Risk: anyone reading `0021` in isolation (e.g. for a fresh-DB bootstrap that
skips later migrations, or a squash) will reintroduce a NOT NULL that the
domain layer violates — `createRoleplayAttempt` and `saveAttemptEvaluation`
test fixtures (`sales-mutations.test.ts:50,67`) assume the column can be
absent/late-bound. The fix already exists in 0023 but the drift should be
called out: the generated migration `0021` did not match the schema author's
intent at creation time.

Recommendation: confirm `0023` is always applied; consider a parity/migration
test that diffs the Drizzle snapshot against schema source to prevent
recurrence (see F-SALES-B04-004).

---

### F-SALES-B04-002 — High — Router test mocks audio/roleplay functions the router never wires
**File:** `packages/api/src/__tests__/sales-router.test.ts:19-27`

The mock factory declares `getBestAttemptForScenario`,
`markTheoryLessonComplete`, `createRoleplayAttempt`, `saveAttemptEvaluation`,
`submitRoleplayAttempt`, `aiClientToEvaluateRoleplay`, and
`buildEvaluationPrompt` (lines 15-28). The router under test
(`routers/sales.ts`) exposes none of these — verified: router calls only
`getModules, getModuleBySlug, getLesson, getScenario, getAttemptsForScenario,
getProgressForUser, getDashboardData, submitQuiz, saveChatMessage,
createRepAccount, getCohortOverview, approveCurriculumContent`.

The roleplay-attempt creation, evaluation, and audio upload flow is actually
served by Next.js Route Handlers under
`apps/sales-advantage/app/api/roleplay-attempts/route.ts` and
`.../lesson-complete/route.ts` (confirmed via grep; those files are **outside
this batch** and not reviewed here). Consequence: the **audio
recording/upload + AI evaluation path has no tRPC contract test in this batch**,
and the router test carries dead mocks that imply coverage that does not exist.
The unused-mock surface also means a future router change that *adds* one of
these procedures would inherit a silent mock instead of a real assertion.

Severity High because the core differentiating feature of sales-advantage
(audio roleplay evaluation) is exactly the path with the weakest test coverage
in the reviewed transport layer.

---

### F-SALES-B04-003 — Medium — Multimodal audio forwarded to provider without privacy/retention controls
**Files:** `packages/ai/src/providers/google.ts:96-129,184-219`,
`packages/ai/src/providers/openrouter.ts:106-140,195-230`

`generateObjectFromMedia` and `transcribeAudio` base64-encode the raw audio
buffer (`input.media.buffer.toString("base64")`) and send it to Google /
OpenRouter. There is no:
- consent/retention annotation or data-processing flag,
- redaction of the prompt (which for roleplay includes prospect persona
  context and rep speech — potential PII of real prospects if reps improvise
  with real names),
- provider data-retention opt-out header (e.g. OpenRouter's
  `X-Data-Collection`/zero-retention routing).

AGENTS.md ("AI" + "Privacy") expects privacy to be a first-class concern for
AI boundaries. The adapter is the correct architectural layer (good: no SDK
leakage), but the audio/transcript privacy posture is undocumented and
unenforced. This is a policy gap, not a code defect; flagging for the
audio/AI privacy task in Phase 2.

---

### F-SALES-B04-004 — Medium — Schema parity test uses `arrayContaining`, cannot detect drift
**File:** `packages/db/src/__tests__/sales-schema-parity.test.ts:31-158`

Every assertion uses `expect(columns(...)).toEqual(expect.arrayContaining([...]))`.
`arrayContaining` only checks that the listed columns are a **subset** of the
actual columns. It will not fail on:
- an extra/renamed column,
- a removed column not in the expected list,
- type/nullability changes (it inspects key names only).

This directly relates to F-SALES-B04-001: a parity test that compared the full
column set and nullability against the migration snapshot would have surfaced
the `audio_storage_key` drift. The test's own docstring (lines 4-6) claims it
asserts "all 9 sales_* tables export the expected columns and that the FK
relationships resolve" — but **no FK relationship is actually asserted**; the
test only reads column key names. The docstring overstates coverage.

---

### F-SALES-B04-005 — Medium — Router error mapping relies on substring matching
**File:** `packages/api/src/routers/sales.ts:26-47`

`mapSalesError` branches on `err.message === "Module not found"`,
`err.message.includes("not found")`, `includes("not approved")`,
`includes("prerequisite")`. The domain layer defines typed errors
(`ScenarioNotFoundError`, `CurriculumNotApprovedError`,
`ModulePrerequisiteNotMetError`, `RubricNotApprovedError`,
`AudioStorageError` — seen in the router-test mock at lines 43-48), yet the
router maps by string. Risks:
- A reworded domain message silently downgrades a 404/400 to a 500.
- `AudioStorageError` and `RubricNotApprovedError` have no explicit mapping —
  `AudioStorageError` falls through to `INTERNAL_SERVER_ERROR` (acceptable) but
  `RubricNotApprovedError`'s message would need to contain "not approved" to
  map to 400; not guaranteed.

Recommendation: switch to `instanceof` checks against the exported domain error
classes. Only `AuthError` (line 27) is currently mapped by type.

---

### F-SALES-B04-006 — Medium — Fallback transcript handling: privacy + truncation only test-enforced
**File:** `packages/domain/src/__tests__/sales-roleplay-evaluator.test.ts:89-163`

The test suite documents the fallback contract: primary
`generateObjectFromMedia` → on failure `transcribeAudio` (STT) → `generateObject`
on the transcript text (lines 89-110), and that `transcriptExcerpt` is
truncated to 600 chars when the eval model omits it (lines 153-163). Two
observations from the test (the implementation `roleplay-evaluator.ts` is
outside this batch, so this is inferred from assertions):

1. The transcript is fed verbatim into a second prompt
   (`evalCall.prompt`.toContain("Rep introduced herself professionally"),
   line 109) and persisted as `transcriptExcerpt`. No redaction step is
   asserted — same PII concern as F-SALES-B04-003 but for the stored excerpt.
2. The 600-char truncation (line 162) is a behavioral guarantee enforced only
   by one unit test; there is no schema-level `max` on `transcriptExcerpt`
   storage (schema column is unbounded `text`, `schema/sales.ts:114`).

These are reasonable behaviors, but the privacy/limit guarantees live only in
tests; flagging for the AI/privacy task.

---

### F-SALES-B04-007 — Low — No input validation on media size/duration/mime before provider call
**Files:** `packages/ai/src/providers/google.ts:96-129,184-219`,
`packages/ai/src/providers/openrouter.ts:106-140,195-230`,
`packages/ai/src/types.ts:23-28`

`MediaInput` (`types.ts:23`) accepts any `Buffer` + `mimeType` string with no
Zod validation. The providers encode and send whatever they receive. A large
or wrong-type buffer is only rejected by the remote provider (slow, costs a
call, surfaces as a generic `PROVIDER_ERROR`). AGENTS.md requires runtime
validation at external boundaries; the audio boundary has none at the adapter
layer. (Upload-side validation may exist in the route handler, outside batch —
unverified.)

---

### F-SALES-B04-008 — Low — Single-model defaults with `maxRetries: 1`, no in-adapter failover
**File:** `packages/ai/src/providers/openrouter.ts:26-29,72,87,130,153,199,220`

All OpenRouter calls use `maxRetries: 1` and a single default model. For the
roleplay eval pipeline the resilience strategy is the STT fallback in the
domain layer (F-SALES-B04-006), not the adapter. That is a defensible design,
but worth noting: a transient provider error on `generateObjectFromMedia`
immediately triggers the more expensive STT→text fallback rather than a retry
of the cheaper multimodal path. Low severity / design observation.

---

### F-SALES-B04-009 — Low — `salesChatMessages.role` is unconstrained free text
**File:** `packages/db/src/schema/sales.ts:171`

`role: text("role").notNull()` with no enum or check constraint. The chat tutor
distinguishes `user`/`assistant` roles (test fixtures use `"user"`), but the DB
accepts any string. A `pgEnum` (consistent with the three enums already defined
at lines 17-33) or a check constraint would prevent malformed roles. The Zod
`chatMessageInputSchema` (referenced in router) may constrain it, but the
storage layer does not.

---

### F-SALES-B04-010 — Low — `saveChatMessage` test bypasses the tenant-scoped DB contract
**File:** `packages/domain/src/__tests__/sales-mutations.test.ts:109-118`

The test overrides `db.insert` with a hand-rolled `vi.fn()` returning
`{values:{returning:...}}` to sequence two inserts. This bypasses the
`createTenantDB` wrapper's insert path that the production code relies on for
tenant scoping, so the test does not exercise (and cannot catch regressions in)
tenant-scoping behavior for chat inserts. Since sales runs with
`schoolId: null` (global tenant), the practical risk is low today, but the test
gives false confidence about the tenant-scoped insert contract. Prefer
extending `createMockDb`'s `insertReturning` to support a sequence rather than
replacing `db.insert`.

---

### F-SALES-B04-011 — Low — Hardcoded free/preview model IDs as eval defaults
**File:** `packages/ai/src/providers/openrouter.ts:26-29,72`

Defaults `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` (media),
`nvidia/parakeet-tdt-0.6b-v3` (ASR), and `x-ai/grok-build-0.1` (text). The
`:free` and preview tiers are subject to deprecation/rate changes on
OpenRouter, and the entire roleplay scoring pipeline depends on the media model.
Env overrides exist (`SALES_AUDIO_EVAL_MODEL` etc., per evaluator test
lines 123-151), which mitigates this, but the in-code defaults are a durability
risk for production scoring. Also note Google's `defaultImageModel`
(`google.ts:43`) is a `-preview-` model.

---

### F-SALES-B04-012 — Info — `AIConfig.apiKey` doc contradicts provider env-isolation guarantee
**File:** `packages/ai/src/types.ts:185-186`

The JSDoc for `AIConfig.apiKey` says *"API key for the provider. Read from env
if not supplied."* Every provider's `apiKey` doc explicitly states *"Must be
provided explicitly — never read from process.env"* (`google.ts:23`,
`openai.ts:23`, `openrouter.ts:35`). The `AIConfig` comment is stale/misleading
relative to the enforced contract. Doc-only fix.

---

### F-SALES-B04-013 — Info — Mock `transcribeAudio` defaults silently; other methods throw
**File:** `packages/ai/src/providers/mock.ts:144-154`

`transcribeAudio` returns `{ text: "[mock transcript]" }` when unconfigured
(line 150), whereas `generateObject`/`generateImage`/`generateText` throw
`ProviderNotConfiguredError` when unconfigured. This asymmetry means a test that
forgets to configure transcription gets a silent fake transcript instead of a
clear failure — could mask a missing STT-fallback expectation. Intentional
convenience, but inconsistent with the explicit-configuration contract the rest
of the mock enforces.

---

### F-SALES-B04-014 — Info — Package-wide 120s test timeout
**File:** `packages/ai/vitest.config.ts:5-7`

`testTimeout: 120_000` applies to all `packages/ai` tests including the
pure-unit provider tests, which are fully mocked and should complete in
milliseconds. The high ceiling exists for the `openrouter-preflight.test.ts`
live network test (skipped without `OPENROUTER_API_KEY`), but applying it
globally means a genuinely hung unit test takes 2 minutes to fail in CI. Prefer
a per-test timeout on the preflight test.

---

### F-SALES-B04-015 — Info — Admin mutations lack audit/rate-limit hooks at transport
**File:** `packages/api/src/routers/sales.ts:196-236`

`admin.createRep` (creates an account + returns a generated password, per test
line 149) and `admin.approveContent` are security-sensitive
(account creation, curriculum approval). AGENTS.md ("Audit Logs") lists
"permission changes" and account creation among events that should produce
immutable audit entries. The router has correct role gating
(`salesAdminOnly`, lines 61-69) but no audit metadata or rate limiting at this
layer. Audit logging may live in the domain layer (outside batch — unverified).

---

### F-SALES-B04-016 — Info — Test documents a known v5 `maxTokens` regression as context
**File:** `packages/ai/src/providers/openrouter.test.ts:169-219`

The "v2/v5 call shape" block asserts the adapter forwards consumer `maxTokens`
as `maxOutputTokens` and must **not** pass the v1 `maxTokens` keyword (which
v5 silently drops, removing the token cap). The current `openrouter.ts`
(lines 84-86, 150-152) does map to `maxOutputTokens`, so the assertions pass.
This is well-written regression coverage; flagged only as Info so the reviewer
is aware the same kwarg pattern is repeated verbatim in `google.ts` and
`openai.ts` and should be kept in sync.

---

## Positive observations (no action)

- All four providers honor the "no `process.env` reads in adapters" rule;
  API keys are constructor-injected (`google.ts:40-44`, `openai.ts:42-49`,
  `openrouter.ts:67-73`). Good provider-neutrality per AGENTS.md.
- Errors are uniformly wrapped in `AIClientError`/`UnsupportedError` with a
  `PROVIDER_ERROR` code and the original cause attached
  (`openrouter.ts:91-96`, etc.).
- `MockProvider` validates configured `generateObject` responses against the
  caller's Zod schema (`mock.ts:66-72`), giving real schema-compliance
  signal in unit tests.
- Router correctly separates `salesProcedure` (rep+admin) from
  `salesAdminProcedure` (admin-only) and the role gate is unit-tested for both
  `createRep` and `cohortOverview` (`sales-router.test.ts:147-169`).
- Domain mutation/query tests assert the permission boundary
  (`/lacks permission/`) for admin-only operations
  (`sales-mutations.test.ts:127-144`, `sales-queries.test.ts:152-159`).
- Quiz grading threshold (70% pass) and percentage scoring are tested at both
  the failing (50%) and passing (100%) boundaries
  (`sales-mutations.test.ts:80-103`).
- Roleplay evaluator tests cover the full fallback ladder: primary success,
  primary-fail→STT→text, both-fail→`SalesError`, env-override of every model,
  excerpt backfill, and the "never call STT on primary success" negative case
  (`sales-roleplay-evaluator.test.ts:76-171`). Strong behavioral coverage of
  the AI eval contract.
- FK `onDelete` semantics are deliberate: `sales_roleplay_scenarios.rubric_id`
  uses `restrict` (protects approved rubrics), conversations use `set null`,
  attempts/progress cascade from user/lesson (`schema/sales.ts:82-84,109-162`;
  migration `0021:150-163`).

---

## Limitations

1. **Batch-scoped review.** Only the 20 listed files were reviewed
   line-by-line. The actual audio recording/upload UI, the storage adapter
   call sites, the roleplay route handlers
   (`apps/sales-advantage/app/api/roleplay-attempts/route.ts`,
   `lesson-complete/route.ts`), the domain implementations
   (`packages/domain/src/sales/queries.ts`, `mutations.ts`,
   `roleplay-evaluator.ts`, `schema.ts`, `permissions.ts`, `errors.ts`), and
   the AI factory/`index.ts` are **out of scope** and were only consulted via
   grep for cross-reference (F-SALES-B04-001/002/006). Findings that infer
   implementation behavior from tests are marked as such.
2. **No execution.** No tests, lint, type-check, or build were run as part of
   this line review; all findings are from static reading. Assertions about
   pass/fail behavior are based on reading the test code, not running it.
3. **Storage adapter usage not directly observable.** The batch contains the
   schema column `audioStorageKey` and references to `AudioStorageError`, but no
   file in the batch calls `storage.put/getSignedUrl`. Storage-adapter
   compliance could not be verified from these 20 files.
4. **Migration drift conclusion** (F-SALES-B04-001) depends on migration `0023`
   which is outside the batch; the reconciliation was confirmed by grep but the
   `0023` file itself was not line-reviewed.
5. Severity ratings are reviewer judgment for an internal training app
   (global tenant, `schoolId: null`); they are not a formal risk assessment.

---

*End of `sales-batch-04` line review. This artifact records findings only and
asserts no Measure phase acceptance or track closeout.*
