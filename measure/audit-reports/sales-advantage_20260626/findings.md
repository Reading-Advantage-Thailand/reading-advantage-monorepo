# Sales Advantage — Findings Catalogue

> Track: `sales_advantage_review_20260626`
> Synthesized from the 6 line-review batches (B00–B05). No source code edited.
> **This catalogue makes NO acceptance or closeout claim and asserts NO remediation was performed.** Every entry is a review observation only; severities are reviewer judgment from static reading (one batch ran the 2 batch-05 domain tests — see B05).

## Conventions

- Each finding cites its **source batch ID** (the canonical `F-SALES-Bxx-###`).
- **Cross-refs** group findings that describe the same underlying issue (deduplicated below).
- Findings are split into **Section A (live runtime / production code)** and **Section B (curriculum content / docs / test fixtures / test quality)** per the synthesis requirement.

## Severity tally (as reported per batch, pre-dedup)

| Batch | High | Medium | Low | Info |
|-------|------|--------|-----|------|
| B00 | 3 (incl. -030) | 8 | 12 | 8 |
| B01 | 4 | 13 | 8 | 3 |
| B02 | 1 | 5 | 9 | 3 |
| B03 | 2 (-010 root+guard) | 5 | 13 | 4 |
| B04 | 2 | 4 | 5 | 5 |
| B05 | 2 | 6 (incl. -017 test) | 10 | 4 |

138 distinct IDs total. After de-duplication, the recurring themes collapse into the clusters below.

---

## Deduplicated cross-cutting clusters

| Cluster | Theme | Member findings (source batches) | Net severity |
|---------|-------|-----------------------------------|--------------|
| C1 | **Missing route/domain authorization** on non-chat AI/write paths | `F-SALES-B00-023` (lesson-complete), `F-SALES-B00-027` (roleplay route), `F-SALES-B05-001` (saveAttemptEvaluation IDOR) | High |
| C2 | **Cross-tenant exposure** (no `schoolId` owner-FK scoping) | `F-SALES-B05-002` (cohort), `F-SALES-B05-001` (attempt write), context `F-SALES-B02-009` (global-tenant intent undocumented) | High |
| C3 | **tRPC role-enum gap** breaks sales auth at runtime | `F-SALES-B00-030` (+ `F-SALES-B00-029` context wiring) | High (pending live `context.ts` confirmation) |
| C4 | **Audio input not validated** (size/MIME/duration) before buffer/provider | `F-SALES-B00-028`, `F-SALES-B01-015`, `F-SALES-B04-007` | High/Medium |
| C5 | **Audio/transcript privacy** — raw audio + PII-bearing prompt to 3rd-party AI, no consent/redaction/retention | `F-SALES-B01-018`, `F-SALES-B03-014`, `F-SALES-B04-003`, `F-SALES-B04-006` | Medium (privacy) |
| C6 | **AI adapter barrel leaks raw SDK** + arch-guard blind to it | `F-SALES-B03-010`, `F-SALES-B03-005`, `F-SALES-B02-001` (app SDK deps) | High (architecture) |
| C7 | **Cosmetic progression gating** (client CSS only) | `F-SALES-B00-014`, `F-SALES-B00-015` | Medium |
| C8 | **Draft (unapproved) curriculum leakage** | `F-SALES-B05-003`, `F-SALES-B05-009`, `F-SALES-B05-010` (docstring) | Medium |
| C9 | **Unvalidated boundaries (no Zod parse)** | `F-SALES-B00-022` (lesson-complete), `F-SALES-B01-017`/`-019` (client eval), `F-SALES-B05-005` (domain mutations), `F-SALES-B04-007` (media) | Medium |
| C10 | **Pervasive `as unknown as` casts** erode tRPC type safety | `F-SALES-B00-008`/`-009`/`-013`, `F-SALES-B01-012`, `F-SALES-B05-012` | Low |
| C11 | **Prompt duplication / unsafe prompt assembly** | `F-SALES-B00-020`, `F-SALES-B01-027`, `F-SALES-B01-028` | Medium |
| C12 | **Non-transactional multi-write flows** | `F-SALES-B05-007` (roleplay), `F-SALES-B02-005` (seeds) | Medium/Low |
| C13 | **Schema/contract nullability drift** for `audioStorageKey` | `F-SALES-B04-001` (migration vs schema), `F-SALES-B05-006` (domain output schema) | High/Medium |

---

# Section A — Live runtime / production code findings

These touch shipping application/domain/transport/adapter code paths.

### Critical / High

- **`F-SALES-B00-011` (High)** — XSS: lesson `content` rendered via unsanitized `renderMarkdown` → `dangerouslySetInnerHTML`. Admin "approval" is a status toggle, not sanitization.
- **`F-SALES-B00-027` (High)** — `/api/roleplay-attempts` has no role gate; any authenticated user triggers paid AI evaluation. (C1)
- **`F-SALES-B00-030` (High)** — tRPC `context.ts` `roleSchema` enum lacks `SALES_REP`/`SALES_ADMIN`; parse throws → `auth=null` → entire sales tRPC surface potentially unauthenticated at runtime. Highest-impact; depends on out-of-batch `context.ts`. (C3)
- **`F-SALES-B01-011` (High)** — `correctAnswer` is in the client-delivered question type; if the lesson query returns it, the answer key leaks to the browser pre-submission. (verify server projection)
- **`F-SALES-B01-014` (High)** — Recorder hardcodes `audio/webm` with no `isTypeSupported` guard; Safari/iOS roleplay recording fails into a misleading "mic denied" error. (C4)
- **`F-SALES-B01-015` (High)** — No client max-duration/size cap before upload. (C4)
- **`F-SALES-B04-001` (High)** — `audio_storage_key` NOT NULL in migration `0021` vs nullable schema source (reconciled only by later `0023`). (C13)
- **`F-SALES-B04-002` (High)** — Router test mocks 6 roleplay/audio domain fns the router never exposes; audio path has **no tRPC contract test**. (also test-quality; see Section B)
- **`F-SALES-B05-001` (High)** — `saveAttemptEvaluation` updates attempt by id with no ownership/tenant predicate → IDOR; a rep can write an evaluation onto another rep's attempt. (C1, C2)
- **`F-SALES-B05-002` (High)** — `getCohortOverview` reads `sales_progress` unscoped via `salesRawDb()` → admin sees all reps in all schools. (C2)
- **`F-SALES-B03-010` (High)** — AI barrel `index.ts` re-exports raw SDK functions/constructors; adapter is a pass-through, arch-guard can't see raw-SDK named imports through it. (C6)

### Medium

- **`F-SALES-B00-003`** — Rep-detail page over-fetches whole cohort to render one rep.
- **`F-SALES-B00-005`** — create-rep success copy implies a surfaced credential; no visible force-reset affordance.
- **`F-SALES-B00-007`** — Curriculum admin fires N+1 `moduleBySlug` per card.
- **`F-SALES-B00-012`** — `lesson-complete` bypasses tRPC via one-off REST; ignores fetch failure, flips UI to "Completed" optimistically. (tech debt)
- **`F-SALES-B00-015`** — Progression locking is client-side cosmetic (`pointer-events-none`), bypassable. (C7)
- **`F-SALES-B00-020`** — Chat prompt is string-concatenated with denylist sanitizer; injection-fragile. (C11)
- **`F-SALES-B00-022`** — `lesson-complete` uses hand-rolled validation, not Zod. (C9)
- **`F-SALES-B00-023`** — `lesson-complete` has no role authorization. (C1)
- **`F-SALES-B00-028`** — No audio size/MIME guard before buffering full file into memory. (C4)
- **`F-SALES-B00-029`** — tRPC `createContext` passes header `authorization` while cookie is primary; fragile. (C3)
- **`F-SALES-B01-001`** — Chat client reads stream as raw text; works only by adapter coincidence (`toDataStreamResponse` = text passthrough).
- **`F-SALES-B01-002`** — No abort/unmount cleanup of the chat stream reader.
- **`F-SALES-B01-004`** — Chat empty-state copy hardcoded English (bypasses i18n; default locale is Thai).
- **`F-SALES-B01-008`** — Login failure swallowed; no telemetry; network/500 collapses to generic error.
- **`F-SALES-B01-010`** — Hardcoded `http://localhost:${PORT??3005}` base-URL fallback; container/Cloud Run portability risk.
- **`F-SALES-B01-016`** — Recorder object URL never revoked. (C4)
- **`F-SALES-B01-017`** — Upload `data.evaluation` consumed without Zod validation. (C9)
- **`F-SALES-B01-018`** — No privacy consent/notice for audio upload + AI processing. (C5)
- **`F-SALES-B01-019`** — `roleplay-result` assumes `criteria/strengths/weaknesses` arrays always present; fallback payload could crash it. (C9)
- **`F-SALES-B01-025`** — In-memory rate limiter non-durable across instances; limits multiplied by instance count on Cloud Run.
- **`F-SALES-B02-001`** — Sales app declares `@ai-sdk/google`/`@ai-sdk/openai` directly (adapter-bypass risk). (C6)
- **`F-SALES-B04-003`** — Multimodal audio + prompt forwarded to provider with no privacy/retention controls. (C5)
- **`F-SALES-B04-005`** — Router error mapping by substring instead of `instanceof` on typed domain errors.
- **`F-SALES-B04-006`** — Fallback transcript fed verbatim into 2nd prompt + persisted; redaction/600-char cap only test-enforced. (C5)
- **`F-SALES-B05-003`** — `getModuleBySlug`/`getDashboardData` leak & count draft lessons. (C8)
- **`F-SALES-B05-004`** — `submitRoleplayAttempt` callback bypasses FR-4 canonical-excerpt sourcing.
- **`F-SALES-B05-005`** — Domain mutations don't `.parse()` their Zod input schemas at the boundary. (C9)
- **`F-SALES-B05-006`** — `roleplayAttemptOutputSchema.audioStorageKey` non-nullable vs nullable column/write. (C13)
- **`F-SALES-B05-007`** — `submitRoleplayAttempt` not transactional → orphan attempt rows + inflated `attemptNumber`. (C12)

### Low

- `F-SALES-B00-004` — Rep row dumped raw via `JSON.stringify` into `<pre>` (info leak).
- `F-SALES-B00-006` — Password policy only client-side `minLength=8`.
- `F-SALES-B00-008`/`-009`/`-013` — `as unknown as` casts on tRPC results. (C10)
- `F-SALES-B00-014` — Module page doesn't re-check unlock; deep-linkable. (C7)
- `F-SALES-B00-016` — Login route logs `error.stack`; no route-layer rate limit.
- `F-SALES-B00-021` — No timeout/abort on `streamText`.
- `F-SALES-B00-024` — `db as never` cast in lesson-complete.
- `F-SALES-B01-005` — Admin link client-gated only (acceptable if server enforces).
- `F-SALES-B01-006` — Logout button unlabeled (a11y).
- `F-SALES-B01-007` — Binary EN/TH language toggle not scalable, lacks ARIA.
- `F-SALES-B01-009` — No client rate-limit/lockout feedback; 429 collapses to generic error.
- `F-SALES-B01-012` — Quiz mutation result double-cast through `unknown`. (C10)
- `F-SALES-B01-013` — Retry button reuses `submit` label.
- `F-SALES-B01-026` — Rate-limiter inline eviction scan O(n log n) on hot path; exported helpers are dead code.
- `F-SALES-B02-008` — `isAdminPath` regex hardcodes `(th|en)`; drift from `routing.locales`.
- `F-SALES-B02-017` — Admin middleware DB role lookup per navigation.
- `F-SALES-B02-018` — Quiz `correctAnswer` stored as duplicated option text (drift).
- `F-SALES-B03-024` — Real providers collapse schema errors to `PROVIDER_ERROR`; only Mock emits `SchemaValidationError` (fallback-branching inconsistency).
- `F-SALES-B04-007` — `MediaInput` no size/duration/mime Zod validation before provider. (C4, C9)
- `F-SALES-B04-008` — `maxRetries:1` + single model; no in-adapter failover.
- `F-SALES-B04-009` — `salesChatMessages.role` is unconstrained free text (no enum/check).
- `F-SALES-B04-011` — `:free`/preview model defaults are durability risk for scoring.
- `F-SALES-B05-008` — `saveAttemptEvaluation` accepts `rubricId` but never persists/uses it (audit gap).
- `F-SALES-B05-009` — `submitQuiz` doesn't verify lesson approval; empty-question lesson marked complete. (C8)
- `F-SALES-B05-011` — Free-form `console.error` in evaluator fallback (observability).
- `F-SALES-B05-012` — `as unknown as` double-casts around DB context. (C10)
- `F-SALES-B05-013` — `attemptNumber` derivation concurrency race; no unique constraint.
- `F-SALES-B05-014` — `createRepAccount` returns plaintext password through domain return value.
- `F-SALES-B05-015` — `markTheoryLessonComplete` reused for roleplay; misleading name; no score recorded.
- `F-SALES-B05-016` — `submitRoleplayAttempt` re-queries scenario/rubric redundantly.

### Info / positive (runtime)

- `F-SALES-B00-002` — AI model wiring matches OpenRouter-primary + parakeet-STT-fallback design.
- `F-SALES-B00-017` — Session route fail-open masks infra failures.
- `F-SALES-B00-019` — Chat route auth/authz layering correct (positive).
- `F-SALES-B00-026` — FR-4 remediation correct: excerpts forwarded, no orphan `audioStorageKey` (positive).
- `F-SALES-B01-021`/`F-SALES-B02-009` — Thai-default locale and global-tenant model are deliberate; record decision.
- `F-SALES-B02-015` — `bodySizeLimit: 20mb` widens upload surface.
- `F-SALES-B02-016` — Curriculum bakes in honest-claims discipline (positive).
- `F-SALES-B03-007`/B04 positives — Providers never read `process.env`; constructor-injected keys (positive).
- `F-SALES-B03-014`/`-016`/`-017` — Audio privacy + free-tier fallback + OpenAI-unsupported design notes. (C5)
- `F-SALES-B04-012` — `AIConfig.apiKey` doc contradicts provider env-isolation guarantee (doc).
- `F-SALES-B04-013` — Mock `transcribeAudio` defaults silently vs others throw.
- `F-SALES-B04-015` — No audit/rate-limit on `admin.createRep`/`approveContent`.
- `F-SALES-B05-019`/`-020`/`-021`/`-022` — Provider-neutrality, FR-5/FR-6, storage-out-of-domain, `unscoped()` reason string (positives).

---

# Section B — Curriculum content / docs / test-fixture / test-quality findings

These do not directly alter a shipping runtime path; they concern seed/curriculum
content, documentation, test fixtures, and test design.

### Curriculum / seed content & ops

- **`F-SALES-B02-002` (High)** — AI curriculum seed inserts orphaned lessons under `"fallback-id"` on module conflict.
- **`F-SALES-B02-003` (Medium)** — `static-seed --force` destructively wipes all curriculum tables, no env guard.
- **`F-SALES-B02-004` (Medium)** — Static seed writes `reviewStatus:'approved'`, bypassing content governance.
- **`F-SALES-B02-005` (Low)** — Seeds have no transaction boundary (partial writes). (C12)
- **`F-SALES-B02-006` (Low)** — Curriculum seed reads enablement docs from hardcoded local home path; silent low-fidelity fallback.
- **`F-SALES-B02-016` (Info, positive)** — Curriculum enforces banned-phrase / honest-claims discipline; worth a regression test.

### Documentation drift

- `F-SALES-B02-012` — AI README omits OpenRouter + multimodal/stream/transcribe methods.
- `F-SALES-B02-013` — `diagram.fixture.ts` references non-existent `__fixtures__/contract-suite.ts` path.
- `F-SALES-B04-012` — `AIConfig.apiKey` JSDoc stale vs provider contract.
- `F-SALES-B05-010` — `getModules` docstring claims approval filtering that cannot exist. (C8)
- `F-SALES-B04-004` (docstring portion) — parity-test docstring overstates FK coverage.
- `F-SALES-B01-027`/`-028` — Dead `chat.systemPrompt` in i18n bundles vs live route prompt. (C11)

### Test quality / coverage

- **`F-SALES-B05-017` (Medium)** — Mutation layer has **no** unit tests (createRoleplayAttempt, saveAttemptEvaluation, submitRoleplayAttempt, submitQuiz, saveChatMessage, approveCurriculumContent, createRepAccount). Auth gap C1, draft-leak C8, quiz threshold all unverified.
- **`F-SALES-B04-002` (test portion)** — Router test mocks fns the router never wires; dead mocks imply coverage that doesn't exist; audio path untested at tRPC layer.
- **`F-SALES-B04-004` (Medium)** — Schema parity test uses `arrayContaining` (subset only); can't catch extra/renamed columns, type/nullability drift, or (claimed) FK relationships.
- `F-SALES-B00-018` — Chat route test gaps: 429, 500, SALES_ADMIN role not exercised.
- `F-SALES-B00-025` — Roleplay route test gaps: 401/403/400/429; audio size/type limits not asserted.
- `F-SALES-B01-022` — Shared test setup mocks no browser audio/stream APIs.
- `F-SALES-B02-007` — Seed scripts excluded from test runner (`scripts/**` not in include globs).
- `F-SALES-B02-010` — `phase-0-setup.test.ts` runs real `tsc`/probes `node_modules` (env smoke as unit test).
- `F-SALES-B02-011` — Closeout/version "tests" assert Measure docs, lockfile text, commit SHAs (brittle, cross-track).
- `F-SALES-B02-014` — `tsconfig.json` excludes `__tests__`; test type errors not caught by `check-types`.
- `F-SALES-B03-001` — Adversarial arch-guard test codifies dynamic-import bypass as intended behavior.
- `F-SALES-B03-002` — Brittle textual regex extraction of `G1_REGEX`.
- `F-SALES-B03-003` — Anti-fabrication gate-result test is **inert** (artifact absent in checkout); zero protection.
- `F-SALES-B03-004` — `streamText` adversarial test produces unhandled promise rejections (no `vi.mock`).
- `F-SALES-B03-005` — Adversarial `streamText` test entrenches raw-SDK call pattern over adapter. (C6)
- `F-SALES-B03-006` — Snapshot tests partly redundant with `toEqual`; silent `-u` risk.
- `F-SALES-B03-008`/`-021` — Mixed manual `process.env` save/restore vs safer `withEnv`/`vi.stubEnv`.
- `F-SALES-B03-009`/`-011`/`-018` — Brittle source-text/regex assertions trip on neutral refactors.
- `F-SALES-B03-012` — Multimodal rubric schema is a local re-declaration, no parity tie to real sales evaluator schema.
- `F-SALES-B03-015` (Medium) — `recommendations.fixture.ts` schema is a hand-copied science-advantage schema with no parity test (drift risk).
- `F-SALES-B03-019` — Science-advantage fixture lives in shared `packages/ai` tests (cross-domain coupling).
- `F-SALES-B04-010` — `saveChatMessage` test hand-rolls `db.insert`, bypassing tenant-scoped contract.
- `F-SALES-B04-014` — Package-wide 120s test timeout masks hung unit tests.
- `F-SALES-B04-016` — v5 `maxTokens` regression test is good; keep providers in sync (positive).
- `F-SALES-B05-018` (Low) — Evaluator tests cover only double-failure path; success + fallback-success untested.

(See `test-gaps.md` for the consolidated test-coverage view.)

---

## Limitations carried from all batches

- Read-only, batch-scoped static review; **no code executed** except the two batch-05 domain test files (10 tests passed; mock-DB path, `DATABASE_URL` unset).
- Several high findings depend on out-of-batch files (`packages/api/src/context.ts` for `F-SALES-B00-030`; migration `0023` for `F-SALES-B04-001`; route handlers for storage-adapter verification). They are flagged for verification, **not** asserted as confirmed in those modules.
- AI/audio privacy findings are inferred from contracts/tests, not from observed model output (no real audio submitted, per spec non-goal).
- **No remediation was performed or claimed by this review.**
