# Line Review: sales-batch-03

- **Track:** `sales_advantage_review_20260626`
- **Batch:** 03 (20 files)
- **Baseline SHA:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
- **Date:** 2026-06-27
- **Reviewer focus:** sales curriculum/progression, browser audio recording/upload, storage adapter use, AI evaluation/fallback/privacy, auth/role/tenant boundaries, admin reporting, AGENTS.md compliance, test quality
- **Scope of this batch:** `packages/ai` AI-adapter source + test suite (provider selector, errors, barrel, mock/contract/multimodal/streamText/arch-guard/adversarial tests, fixtures, test utils). The batch contains **no** sales-app, domain, DB, storage, recording, or admin-reporting source — those focus areas are addressed only insofar as the AI adapter is the layer the sales roleplay evaluation depends on. See Limitations.

---

## Severity legend

- **high** — correctness/security defect or material AGENTS violation that should block.
- **medium** — real defect, test-quality gap, or architectural concern to fix soon.
- **low** — minor / stylistic / preference / drift risk.
- **info** — observation, positive note, or scope boundary; no action required.

---

## File-by-File Review

### F1: `packages/ai/src/__tests__/phase-13-adversarial-arch-guard-regex.test.ts`

Adversarial test that pins the shapes the production G-1 arch-guard regex (`phase-arch-no-direct-sdk.test.ts`) catches vs. misses. Reads the guard file from disk and extracts `G1_REGEX` textually.

| Line | Finding |
|------|---------|
| 73–91 | Positive cases asserted (static `from "ai"` / `from "@ai-sdk/..."`). Correct. ✓ |
| 93–122 | **F-SALES-B03-001 [medium, test-quality/architecture]** — This test *codifies the gap as intended behavior*: it asserts the guard MUST NOT catch dynamic `import("ai")`, `require("ai")`, `import("ai").then(...)`. Locking in a known bypass as a passing expectation means a regression that re-introduces a direct SDK call via dynamic import/require slips through both the production guard and this "adversarial" net. The docstring (L8–25) acknowledges the gap but the test does not drive closing it. |
| 124–158 | Side-effect / re-export shapes: re-exports with `from` are asserted caught; bare `import "ai"` asserted missed. Same gap-as-spec pattern. **low** addendum to F-SALES-B03-001. |
| 170–188 | `extractG1Regex` rebuilds the regex with a `"g"` flag the source does not carry. With `g`, `.test()` is stateful; the loops do reset `lastIndex` (L89, L113, L137) so no false negative here, but the extraction is fragile to any future flag/escaping change. **F-SALES-B03-002 [low]** — brittle textual extraction of a regex literal; a refactor of the guard's quoting trips `extractG1Regex` returning `null` (only guarded by a `.not.toBeNull()` assertion, L76/101/127). |
| 62–71 | Pins existence of a `G1_REGEX` constant in the guard file — couples two test files textually. Acceptable as a tripwire. ✓ |

### F2: `packages/ai/src/__tests__/phase-13-adversarial-gate-result-scope.test.ts`

Adversarial anti-fabrication test over `measure/tracks/ai_sdk_major_migration/artifacts/gate-result.json`.

| Line | Finding |
|------|---------|
| 72–86, 89–95, 117–119, 157–158 | **F-SALES-B03-003 [medium, test-quality]** — Every test early-returns when the artifact is missing (`readGateResult`/`readScopeCheck` return `null`). I verified `measure/tracks/ai_sdk_major_migration/artifacts/gate-result.json` **does not exist** in this checkout, so all three assertions are *inert and silently green*. The entire anti-fabrication guard provides zero protection in the audited tree; a fabricated or absent gate-result is indistinguishable from a real passing one here. The file lives under another track's tree, so this batch cannot confirm it is ever produced. |
| 105–114 | When active, the `\d+ passed > 0` pin is a reasonable hardening over the loose `/passed/` regex it critiques. ✓ (conditional on F-SALES-B03-003). |
| 132–146 | `archGuard` start-of-string + "zero"/"imports" pin is sound *if* exercised. ✓ (conditional). |
| 149–171 | `turboSummary` block pin is sound *if* exercised. ✓ (conditional). |

### F3: `packages/ai/src/__tests__/phase-13-adversarial-streamText-await.test.ts`

Pins that provider `streamText` is async (returns `Promise<StreamTextResult>`) and that two production routes await `streamText(`.

| Line | Finding |
|------|---------|
| 99–127 | **F-SALES-B03-004 [low, test-quality]** — `OpenAIProvider/GoogleProvider/OpenRouterProvider.streamText({prompt:"x"})` are invoked with **no `vi.mock("ai")`** in this file. Because the methods are `async`, the call returns a Promise synchronously (assertion passes), but the underlying `aiStreamText` runs against an unconfigured real client and rejects. The test never awaits, producing an **unhandled promise rejection** per case — noisy and potentially flagged as a failure under strict unhandled-rejection settings. Prefer mocking the SDK or asserting the type at compile time only. |
| 150–199 | Route-await grep over `apps/codecamp-advantage/app/api/chat/route.ts` and `apps/reading-advantage/server/controllers/stories-assistant-controller.ts`. I confirmed both files exist and both use `await streamText(` (route L101 / controller L276). Guard is currently green. ✓ |
| 150–162, 2 (barrel) | **F-SALES-B03-005 [medium, architecture/AGENTS]** — Both audited routes import `streamText` from `@reading-advantage/ai` (the **raw re-exported SDK function**, see F18/F-SALES-B03-010), not `getAIClient().streamText`. This adversarial test therefore *enforces the raw-SDK call pattern* (await + `toDataStreamResponse`) rather than the adapter pattern AGENTS.md mandates ("Application code must not depend directly on provider SDKs"). The test entrenches an adapter-bypass channel. Cross-ref F-SALES-B03-010. |
| 83–97 | MockProvider async/`callLog` contract assertion is valid and matches `mock.ts`. ✓ |

### F4: `packages/ai/src/__tests__/phase-2-mock-provider.test.ts`

Mock-provider contract + `createTestClient` export + snapshot tests.

| Line | Finding |
|------|---------|
| 62–79 | `resolveCreateTestClient` runtime-resolution shim is a clean Red-phase device; harmless now that the export exists (verified `createTestClient` in `mock.ts:185`). ✓ |
| 97–137 | Solid fixture/override behavior coverage; override-wins and fallback-to-default both asserted. ✓ |
| 146–149 | Runs the shared `runAIClientContract` harness against the mock — good reuse. ✓ |
| 155–181 | **F-SALES-B03-006 [low, test-quality]** — Snapshot tests (`toMatchSnapshot`) on the recommendation object and a base64 PNG. Snapshots are durable only if the committed `.snap` (in batch-02) is reviewed; an inadvertent `-u` regenerates silently. Acceptable but lower-signal than explicit equality (the same object is also asserted via `toEqual` at L107, making the snapshot partly redundant). |
| 47, 42–51 | Imports `diagram.fixture.js` / `contract-suite.js` (batch-02 files) — cross-batch dependency, reviewed there. ✓ |

### F5: `packages/ai/src/__tests__/phase-3-openai-provider.test.ts`

OpenAI provider delegation, explicit-apiKey plumbing, G-3 no-`process`-import guard, schema-validation boundary, v5 `maxOutputTokens` shape, gated live integration.

| Line | Finding |
|------|---------|
| 202–224 | **F-SALES-B03-007 [info, positive]** — Explicit env-leak test: sets `OPENAI_API_KEY` then asserts the explicit constructor key is used and the env value is NOT forwarded. Good guard against silent credential leakage. ✓ |
| 267–276 | File-source G-3 scan (no `import … from "process"`) — good static guard. ✓ |
| 278–305 | Error-boundary coverage: schema errors surface as `AIClientError`; unknown errors as `PROVIDER_ERROR`. ✓ |
| 317–361 | v5 `maxTokens → maxOutputTokens` rename pinned with both positive and negative (`not.toHaveProperty("maxTokens")`) assertions. Strong. ✓ |
| 363–381 | `it.skipIf(!OPENAI_API_KEY)` gated network test — visible as skipped, not hidden. Good practice. ✓ |
| 204–223 | **F-SALES-B03-008 [low, consistency]** — Direct `process.env` mutation with try/finally restore instead of the project's `withEnv()` helper (`test-utils.ts`). Restored correctly, but inconsistent with the selector tests and risks leakage if a future edit drops the finally. |
| 84–91, 116–119 | SDK mock wiring uses `as unknown as` double-casts for the callable-with-`.image` shape — necessary given the SDK typing, acceptable in tests. ✓ |

### F6: `packages/ai/src/__tests__/phase-4-google-provider.test.ts`

Parallel structure to F5 for Google/Gemini.

| Line | Finding |
|------|---------|
| 209–239 | Env-leak guard covers BOTH `GOOGLE_API_KEY` and `GEMINI_API_KEY`. ✓ |
| 266–312 | Default-model assertions (`gemini-2.5-flash` text/object, `gemini-2.0-flash-preview-image-generation` image) and no-`organization` forwarding. Good provider-specific coverage. ✓ |
| 315–354 | G-3 + schema/PROVIDER_ERROR boundary mirrors F5. ✓ |
| 365–409 | v5 `maxOutputTokens` shape pinned (positive + negative). ✓ |
| 411–429 | Gated live Gemini test via `skipIf(!GEMINI_API_KEY)`. ✓ |
| 210–238 | **F-SALES-B03-008 (recurrence) [low]** — same direct-`process.env`-mutation-vs-`withEnv` inconsistency as F5. |

### F7: `packages/ai/src/__tests__/phase-5-provider-selector.test.ts`

Env-matrix selector + lazy-singleton + barrel-export + static schema-shape guard.

| Line | Finding |
|------|---------|
| 86–143 | Comprehensive env matrix incl. boundary cases (`NODE_ENV=test`→mock, `production`/`development` no-key→throw, both Google key aliases, mock-ignores-stray-key). Strong. ✓ |
| 158–185, 164–166 | Pre-cleans matrix keys + `resetAIClient()` before each row to prevent CI-secret leakage false-passes. Good isolation. ✓ |
| 222–245 | Asserts singleton does not leak across `withEnv` blocks. Good — this is the kind of state-leak regression that breaks Phases 6/7. ✓ |
| 339–354 | **F-SALES-B03-009 [low, test-quality]** — Static `client.ts` schema shape is asserted via brittle source-text regexes (`aiConfigSchema = z.object({…`, exact enum ordering, `.default('openai')`). A semantically-equivalent refactor (reordered enum, multiline formatting, `z.string().optional()` → `.optional()` chained differently) fails the test without any behavior change. Prefer importing and introspecting the runtime schema where feasible. |
| 312–330 | Barrel-identity assertions (`barrel.X === X`) are precise and cheap. ✓ |

### F8: `packages/ai/src/__tests__/phase-9-docs.test.ts`

README content guard for FR-7.

| Line | Finding |
|------|---------|
| 54–149 | Pure file-content assertions; README verified present at `packages/ai/README.md`. Asserts package id, `getAIClient()` import+call, Provider Configuration heading, three provider names, env vars (`AI_PROVIDER`, `OPENAI_API_KEY`, Google key alias), and `MockProvider` import+`new`. Reasonable doc regression net. ✓ |
| 92 | **F-SALES-B03-011 [low]** — Heading regex `^##\s+Provider(?:s| Configuration)?\s*$` is anchored to a top-level `##`; a future `###` subsection or trailing text on the heading line silently fails. Minor brittleness; documentation-only impact. |

### F9: `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts`

Production architecture guard: scans `apps/**` source for `from "ai"` / `from "@ai-sdk/..."`.

| Line | Finding |
|------|---------|
| 89 | **F-SALES-B03-010 [high, architecture/AGENTS]** — `G1_REGEX = /from\s+['"](ai|@ai-sdk\/)/` only catches *direct* SDK module specifiers. It does **not** catch consumption of raw SDK functions re-exported through `@reading-advantage/ai` (see F18). Because `index.ts` re-exports `generateObject`, `generateText`, `streamText`, `experimental_generateImage`, `createOpenAI`, `createGoogleGenerativeAI`, `createVertex`, an app can call the raw Vercel AI SDK while importing only `@reading-advantage/ai` — passing this guard yet violating the AGENTS rule "Application code must not depend directly on provider SDKs." Confirmed live: codecamp chat route and reading stories controller both pull raw `streamText` via the barrel. The guard gives false assurance of adapter compliance. |
| 59–80 | `IGNORED_DIRS` / `TEST_FILE_RE` exclusions are reasonable; excluding test files from a *production* guard is justified. ✓ |
| 91–112 | Recursive walker with try/catch on missing `apps/` and dotfile/ignored-dir skipping. Sound. ✓ |
| 114–139 | Per-line scan with relative-path + line-number violation reporting and an actionable failure message. Good diagnostics. ✓ |

### F10: `packages/ai/src/__tests__/phase-multimodal-contract.test.ts`

`generateObjectFromMedia` contract against `MockProvider`.

| Line | Finding |
|------|---------|
| 28–46 | Compile-time interface presence + input-shape (schema/prompt/media incl. `audio/webm` mime). Relevant to sales roleplay audio evaluation. ✓ |
| 48–90 | Covers happy path, call-logging, not-configured → `ProviderNotConfiguredError`, and invalid-canned-output → `SchemaValidationError`. Good boundary coverage for the AI-evaluation path. ✓ |
| 6–26 | **F-SALES-B03-012 [info]** — The rubric schema here (overallScore/passed/criteria/feedback/transcriptExcerpt) is a *local re-declaration* for the test, not the real sales roleplay evaluator schema (that lives in `packages/domain/src/sales`, batch-05). No parity check ties them; drift would be undetected by this batch. Cross-ref F-SALES-B03-015. |

### F11: `packages/ai/src/__tests__/phase-multimodal-google.test.ts`

Google `generateObjectFromMedia` call-shape.

| Line | Finding |
|------|---------|
| 41–65 | Asserts the SDK is called with a single user message containing a `file` part (base64 audio + mediaType) then a `text` part (prompt), and **no** top-level `prompt`. Precise multimodal contract; matches privacy-relevant flow (raw audio base64 forwarded to Gemini). ✓ |
| 67–84 | Default model `gemini-2.5-flash` pinned. ✓ |
| 86–97 | SDK errors wrapped as `AIClientError` (PROVIDER_ERROR) with descriptive message. ✓ |
| 5–17, 19 | **F-SALES-B03-013 [low, test-quality]** — Imports `generateObject` from `"ai"` *after* `vi.mock("ai")` (L19) — standard, but the file mixes the mocked-import style with a hoisted mock; fine functionally. Note: this test deliberately uses `from "ai"`, which is allowed because test files are excluded from the F9 guard. ✓ (informational) |
| 28, 49–53 | **F-SALES-B03-014 [info, privacy]** — Confirms the adapter base64-encodes the *entire* raw audio buffer and forwards it to a third-party provider with no redaction/consent gating at the adapter layer. In-scope as the AI-evaluation/privacy focus; the actual transport code is `providers/google.ts`/`openrouter.ts` (batch-04). Flag for privacy review of the upstream caller (who supplies learner audio) — not fixable in test files. |

### F12: `packages/ai/src/__tests__/phase-multimodal-openrouter.test.ts`

OpenRouter `generateObjectFromMedia` call-shape.

| Line | Finding |
|------|---------|
| 41–73 | file+text message-part contract asserted (parallel to F11). ✓ |
| 75–135 | Schema passthrough, default model (`nvidia/nemotron-3-nano-omni-…:free`), explicit-model override + `openrouter/` prefix stripping. Matches `openrouter.ts:50` `stripOpenRouterPrefix`. ✓ |
| 137–168 | Temperature forwarding + SDK-error wrapping (PROVIDER_ERROR). ✓ |
| 94–113 | **F-SALES-B03-016 [info]** — Default multimodal model is a `:free` OpenRouter tier. For the sales roleplay evaluation fallback path, a free-tier model implies rate-limit/quality variability; ensure the evaluator's fallback/retry strategy (batch-05) tolerates this. Observation only. |
| 28, 52 | Same privacy note as F-SALES-B03-014 (raw audio base64 to OpenRouter). |

### F13: `packages/ai/src/__tests__/phase-multimodal-unsupported.test.ts`

OpenAI provider rejects `generateObjectFromMedia`.

| Line | Finding |
|------|---------|
| 8–43 | Asserts `UnsupportedError` with message steering to openrouter/google and `code === "UNSUPPORTED"`. Clean negative-capability contract. ✓ |
| — | **F-SALES-B03-017 [info, fallback]** — Establishes that audio evaluation requires google/openrouter. Relevant to fallback design: if the configured provider is OpenAI, roleplay evaluation hard-fails by design. Verify the sales evaluator (batch-05) selects an audio-capable provider explicitly rather than relying on the default singleton. |

### F14: `packages/ai/src/__tests__/phase-stream-text-contract.test.ts`

`AIClient.streamText` interface + v5 kwarg + barrel type export.

| Line | Finding |
|------|---------|
| 120–174 | Interface presence (compile + runtime), MockProvider call-logging, textStream draining, `toDataStreamResponse → Response`. Good. ✓ |
| 178–230 | Real providers forward `maxTokens` as `maxOutputTokens` and not `maxTokens` — positive+negative pins across all three providers. Strong. ✓ |
| 68–79 | **F-SALES-B03-018 [low, test-quality]** — `vi.importActual("ai").catch(() => ({}))` falls back to an empty module if `"ai"` cannot resolve. With the fallback, only `streamText` is mocked and the other SDK symbols providers import become `undefined`; within this file only `streamText` is exercised so it works, but the silent empty-module fallback could mask a genuine module-resolution break and produce confusing failures elsewhere. |
| 234–256 | Barrel type-export check via source-text regex for `StreamTextInput` in the `export type { … } from "./types.js"` block — brittle (same class as F-SALES-B03-009) but low-risk. **low**. |

### F15: `packages/ai/src/__tests__/recommendations.fixture.ts`

Captured science-advantage recommendation fixture + schema re-declaration.

| Line | Finding |
|------|---------|
| 28–44 | **F-SALES-B03-015 [medium, drift-risk]** — `recommendationFixtureSchema` is a hand-maintained copy of `apps/science-advantage/lib/ai/recommendation-service.ts` with only a comment ("Must remain structurally equivalent…", L25) enforcing parity. No automated parity test ties the two; the real schema can drift while the fixture/snapshot stays green, defeating the stated regression-net purpose (L9–18). Add an importing parity assertion or generate the fixture from the source schema. |
| 55–73 | Fixture data is synthetic (`stu_test_001`, lesson IDs) — no real PII. ✓ |
| 51–53 | "Treat as immutable / clone before mutating" documented but not enforced (`Object.freeze` would harden). **low**. |
| 1–18 | **F-SALES-B03-019 [info]** — This is a *science-advantage* recommendation fixture living in `packages/ai` tests, pulled into the sales batch only because `packages/ai` is shared. It has no sales-curriculum/progression content; sales recommendation/progression logic is not exercised by this batch. |

### F16: `packages/ai/src/__tests__/test-utils.ts`

`withEnv(overrides, fn)` helper.

| Line | Finding |
|------|---------|
| 38–66 | Snapshot/apply/reset/restore with `resetAIClient()` on both entry and finally; `undefined` deletes the key. Correct and the finally guarantees restoration on throw. ✓ |
| 42–51 | **F-SALES-B03-020 [low]** — `previous[key]` stores `undefined` both for "was unset" and "was explicitly undefined"; on restore (L58–63) an originally-unset key is `delete`d — correct. Edge case: a var legitimately set to the empty string is preserved correctly. No defect; documenting the reasoning since the helper is the isolation backbone for F5–F7. |
| — | Good JSDoc per AGENTS documentation standard. ✓ |

### F17: `packages/ai/src/client.test.ts`

Unit tests for `createAIClient` / `getAIClient` / `resetAIClient`.

| Line | Finding |
|------|---------|
| 9–21 | Mocks `@ai-sdk/openai`, `@ai-sdk/google`, `ai`; note `@ai-sdk/openrouter` path is exercised via the real `OpenRouterProvider` (which uses `@ai-sdk/openai`). ✓ |
| 23–88 | Covers each provider construction + missing-key throws for openai/google/openrouter. ✓ |
| 37–46, 56–68, 78–87 | **F-SALES-B03-021 [low, test-quality]** — Env save/restore uses `if (original) process.env.X = original` — if the original value was falsy/empty it would not be restored. Combined with no `afterEach` cleanup, a deleted key could leak into later tests in the file. The `getAIClient` block (L91–94) uses `vi.unstubAllEnvs()` but the `createAIClient` block relies on manual restore. Low risk given test order, but inconsistent with the more robust `withEnv` used in F7. |
| 90–122 | Singleton/test-default/`AI_PROVIDER`/reset behaviors covered with `vi.stubEnv`. ✓ |

### F18: `packages/ai/src/client.ts`

Provider factory + lazy singleton.

| Line | Finding |
|------|---------|
| 9–14 | `aiConfigSchema` validates external config with Zod default `"openai"` — AGENTS boundary-validation aligned. ✓ |
| 28–77 | Per-provider key resolution: explicit `apiKey` then env fallback; throws `ProviderNotConfiguredError` on missing key. Clear, structured errors. ✓ |
| 28, 72–76 | **F-SALES-B03-022 [low]** — `switch (parsed.provider as AIProvider)` casts a value the Zod enum has already constrained; the `default` branch is unreachable given validation. Harmless but the cast/branch are dead defensive code. |
| 99–108 | `getAIClient` reads `AI_PROVIDER`/`NODE_ENV` once and memoizes. **F-SALES-B03-023 [low]** — Provider is selected from env only on first call; in a long-lived process an env change has no effect until `resetAIClient()`. Documented (L92–93) and intended, but worth noting for the sales worker/runtime: ensure provider selection is fixed at process start, not expected to be reconfigurable per-request. |
| 80–108 | Module-level mutable `singletonClient` — the very state-leak the F7 tests guard against; mitigated by `resetAIClient`. ✓ |

### F19: `packages/ai/src/errors.ts`

Error hierarchy.

| Line | Finding |
|------|---------|
| 6–15 | `AIClientError` with machine-readable `code` and optional `cause`. Good structured-error design. ✓ |
| 21–57 | `ProviderNotConfiguredError`, `SchemaValidationError`, `UnsupportedError` set distinct `code`s. ✓ |
| 34–45 | **F-SALES-B03-024 [low]** — `SchemaValidationError` and `UnsupportedError` do not forward a `cause` to the base ctor (param exists on `AIClientError`). Original Zod issues are kept on `validationErrors` for the schema case, so debuggability is preserved, but provider wrap-sites (e.g. `openrouter.ts`) emit `PROVIDER_ERROR` for *all* failures including schema rejections, so `SchemaValidationError`'s distinct code is only produced by `MockProvider` — real providers collapse schema failures into PROVIDER_ERROR. Inconsistent error taxonomy between mock and real providers (relevant to fallback branching on `code`). |
| — | No PII embedded in messages; errors interpolate provider name/detail only. ✓ |

### F20: `packages/ai/src/index.ts`

Public barrel.

| Line | Finding |
|------|---------|
| 15–24 | **F-SALES-B03-010 (root cause) [high, architecture/AGENTS]** — The barrel re-exports raw provider SDK constructors (`createOpenAI`, `createGoogleGenerativeAI`, `createVertex`) and raw Vercel AI SDK functions (`generateObject`, `generateText`, `streamText`, `experimental_generateImage`). This makes `@reading-advantage/ai` a *pass-through* for the very SDKs the adapter is meant to encapsulate, and it is the channel by which app code (codecamp chat route, reading stories controller) calls raw `streamText` while appearing adapter-compliant to the F9 guard. AGENTS.md: "Application code must not depend directly on provider SDKs." Recommend removing the raw re-exports (or isolating them to an explicitly-named `@reading-advantage/ai/sdk` escape hatch) and tightening the F9 guard to also flag raw-SDK named imports from the barrel. |
| 1–13, 26–39 | Type exports + error/class/provider re-exports are appropriate for the adapter surface. ✓ |

---

## Cross-Cutting Observations

- **Adapter-bypass via barrel (F-SALES-B03-010 / -005):** the single most material architecture finding in this batch — the adapter package leaks the raw SDK, and the arch-guard cannot see it. Highest-priority follow-up.
- **Inert anti-fabrication guard (F-SALES-B03-003):** the gate-result adversarial test contributes no protection in this checkout.
- **Schema-drift risk (F-SALES-B03-015):** hand-copied fixture schema with no parity test.
- **Brittle source-text assertions (F-SALES-B03-009, -011, -014/-018 regex pins):** several tests assert on source/regex text rather than behavior; semantically-neutral refactors will trip them.
- **Test-env-mutation inconsistency (F-SALES-B03-008, -021):** mix of manual `process.env` save/restore and the safer `withEnv`/`vi.stubEnv` helpers.
- **Privacy of learner audio (F-SALES-B03-014):** raw audio base64 is forwarded to third-party providers (Google/OpenRouter) at the adapter layer with no redaction/consent gating; the upstream sales caller must own consent/retention. Actual transport code is in batch-04/05.
- **Positive:** error boundaries, env-leak guards, gated (visible-skipped) network tests, env-matrix selector coverage, and singleton-leak guards are genuinely strong test-quality work.

---

## Limitations

1. **Scope mismatch with focus areas.** All 20 files are `packages/ai` adapter source/tests. This batch contains **no** sales curriculum/progression code, **no** browser audio recording/upload component, **no** storage-adapter usage, **no** auth/role/tenant boundary code, and **no** admin-reporting code. Findings on those focus areas are limited to where the AI adapter intersects them (audio multimodal transport, evaluation fallback/privacy). Those focus areas are reviewed in batches 00–01 (app/UI/auth/recorder) and 04–05 (providers, sales router, sales domain/db).
2. **Cross-batch dependencies not re-reviewed here:** `diagram.fixture.ts`, `contract-suite.ts`, the committed `.snap`, and provider implementations (`google.ts`, `openrouter.ts`, `openai.ts`, `types.ts`) are batch-02/04 files; I read `openrouter.ts`/`mock.ts` only to verify test claims, not as primary review targets.
3. **External-tree artifact:** `measure/tracks/ai_sdk_major_migration/artifacts/gate-result.json` (referenced by F2) lives under another track and is absent in this checkout; I could not confirm whether it is produced in any CI lane.
4. **No tests were executed** and **no source was edited** during this review; assertions about test pass/fail behavior (e.g. unhandled rejections in F3, inert tests in F2) are derived from static reading plus targeted existence checks (`apps/**` route files, README, fixtures), not from a test run.
5. **Live-network and type-only (`.test-d.ts`) behaviors** were assessed structurally only.

---

## Coverage Confirmation

All 20 files in `/tmp/opencode/sales-batch-03` reviewed (F1–F20), each with line-anchored findings or an explicit clean note. Finding IDs `F-SALES-B03-001` through `F-SALES-B03-024` assigned. This report makes **no acceptance or closeout claims**; it is a line-review artifact only.
