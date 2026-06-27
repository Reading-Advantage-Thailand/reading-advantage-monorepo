# Line Review: sa-batch-19

- **Track:** `science_advantage_review_20260626`
- **Batch:** 19 (20 files)
- **Reviewer focus:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline/golden-path patterns
- **Scope:** Proxy auth (unit + integration), architecture guardrails, Phase 9 docs tests, OTel recommendation tests, image generation (class + legacy), mastery calculator, recommendation context (logic + integration), recommendation service (class + legacy), rules engine, AI types, analytics, API helpers, auth constants
- **Date:** 2026-06-27

---

## File-by-File Review

### F1: `apps/science-advantage/lib/__tests__/proxy-role.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Tests are sound and cover all role gates |
| **Security/tenancy** | Good: tests unauthenticated redirect, invalid token cookie clearing, DB-error fail-closed |
| **AGENTS.md compliance** | Uses `@reading-advantage/auth` via vi.mock — follows adapter pattern |
| **Test quality** | Thorough: 13 test cases covering all role hierarchies, signin redirect-when-authed, dashboard |

| Line | Finding |
|------|---------|
| 3–17 | `vi.hoisted` + `vi.mock` pattern for `requireRole`/`getSession` — follows vitest best practices. ✓ |
| 25–34 | `createRequest` helper with optional cookies — clean and reusable. ✓ |
| 50–60 | STUDENT blocked from /admin: asserts 307 redirect to `/dashboard?error=forbidden`. Correct FORBIDDEN handling. ✓ |
| 62–69 | ADMIN allowed through /admin: asserts 200 and checks `requireRole` called with expected token and 'ADMIN'. ✓ |
| 71–82 | Invalid token redirects to `/signin` and clears cookie (`Max-Age=0`). Good security boundary coverage. ✓ |
| 84–91 | DB error (non-AuthError) redirects to `?error=session_check_failed`. Good fail-closed assertion. ✓ |
| 94–105 | TEACHER blocked from /system. ✓ |
| 146–153 | Unauthenticated user at /student redirects to /signin and `requireRole` is NOT called — verifies the early-return gate in proxy.ts:90–91. ✓ |
| 164–170 | TEACHER allowed through /student route — tests role hierarchy correctly. ✓ |
| 173–198 | /signin redirect-when-authed (valid session -> /dashboard; invalid session -> clear cookie + 200; no cookie -> 200). All three paths covered. ✓ |
| 201–216 | /dashboard: unauthenticated -> /signin; any signed-in user -> 200. ✓ |

### F2: `apps/science-advantage/lib/__tests__/proxy.integration.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Integration mirror of unit tests against real DB — consistent |
| **Security/tenancy** | Tests real session validation through `@reading-advantage/auth` `createSession` |
| **AGENTS.md compliance** | Uses Drizzle `db` and `sql` helper — correct. Uses `@reading-advantage/auth` `createSession` — correct adapter pattern |
| **Test quality** | 7 integration tests with proper fixture cleanup (beforeEach + afterAll) |

| Line | Finding |
|------|---------|
| 8–12 | Fixed ID strings for fixture users — traceable in DB, good. ✓ |
| 14–21 | `cleanupFixtures` uses raw SQL via `sql` template tag — appropriate for integration test cleanup. ✓ |
| 23–34 | `seedUser` creates user via Drizzle then calls `createSession(db, id)` — clean fixture setup. ✓ |
| 50–52 | `afterAll` also calls `cleanupFixtures` — ensures no residue even on test failure. ✓ |
| 90–97 | Expired/missing token: asserts 307 -> /signin and `set-cookie` with `Max-Age=0`. ✓ |
| 99–106 | Valid session at /signin redirects to /dashboard — regression guard for authenticated-user redirect. ✓ |

### F3: `apps/science-advantage/lib/ai/__tests__/architecture.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Grep-gate assertions are correct; regex excludes `@reading-advantage/ai` correctly |
| **Security/tenancy** | G-2 guard prevents raw API key env access in `lib/ai/` — security-conscious |
| **AGENTS.md compliance** | Enforces the adapter pattern (no direct `ai` / `@ai-sdk/*` imports). G-2 enforces "Env access belongs in @reading-advantage/ai" |
| **Test quality** | Regression guard architecture is sound; walker fn handles edge cases |

| Line | Finding |
|------|---------|
| 1–52 | Excellent documentation of guard purpose, regex scope decisions, and test runner configuration notes. ✓ |
| 53–56 | Minimal imports: vitest + Node fs/path/url. No DB or network needed. ✓ |
| **63–77** | **F-SA-B19-001 [completeness]** — IGNORED_DIRS includes 14 entries but is missing `__pycache__`, `.env`, `.drizzle`, and `drizzle/` artifacts. None of these would normally contain `.ts` source files, but the exclusion list should be comprehensive or use a dynamic approach (e.g., skip any dir not matching a safe-allowlist). **Severity: low**. |
| 82 | G1_REGEX: `/from\s+['"](ai|@ai-sdk\/)/` — correctly excludes `@reading-advantage/ai` (the `@reading-advantage/ai` string starts with `@`, not `a` or `@ai-sdk/`). Verified. ✓ |
| 85–104 | `walk()` function handles missing dirs (try/catch), skips dotfiles and IGNORED_DIRS, correctly filters test files when `includeTestFiles=false`. ✓ |
| 120–130 | G-1 assertion with detailed failure output including inline `rg` command. Good DX. ✓ |
| 132–143 | G-2 assertion scoped to `lib/ai/` only. Env-key guard is in the right scope. ✓ |

### F4: `apps/science-advantage/lib/ai/__tests__/phase-9-docs.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Contracts pin the expected doc surface correctly; multiline regex for section heading works with `m` flag |
| **Security/tenancy** | N/A — doc-content assertions |
| **AGENTS.md compliance** | Prevents documentation from instructing direct SDK imports — enforces adapter pattern in docs |
| **Test quality** | Well-documented RED/GREEN expectations; references plan tasks and spec FR-7 explicitly |

| Line | Finding |
|------|---------|
| 1–59 | Comprehensive documentation of RED/GREEN expectations, task references, and file location rationale. ✓ |
| 70–77 | Hardcoded paths to spec.md and image doc — fragile if docs are restructured, but documented as intentional contract. ✓ |
| 98–108 | Negative assertions: spec.md `must not` contain `import { openai } from '@ai-sdk/openai'` or `@ai-sdk/google-vertex`. Contract enforcement. ✓ |
| 120–149 | Positive assertions for "Provider Configuration" section heading and adapter entry-point mentions. ✓ |
| **133** | `^##\s+Provider Configuration\s*$` regex with `m` flag — correct multiline anchor. ✓ |
| 156–194 | Task 2 assertions on `ai-image-generation.md`. Line 9 is pinned explicitly (0-based: index 8). ✓ |
| **174** | Tests that line 9 mentions `@reading-advantage/ai` — codebase refers to `@reading-advantage/ai` correctly. ✓ |
| **186–188** | `aiImageConfig` / `getAIClient()` / `createAIClient()` — checks for three possible adapter references. ✓ |

### F5: `apps/science-advantage/lib/ai/__tests__/recommendation-service.otel.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Thorough OTel span lifecycle coverage; stub AIClient correctly tracks invocations |
| **Security/tenancy** | No direct concerns; tests use mock data throughout |
| **AGENTS.md compliance** | Constructor injection of `AIClient` interface; uses `@reading-advantage/ai` via vi.mock. Follows adapter pattern. |
| **Test quality** | Excellent: 6 test cases covering happy path, error path, cache-hit adversarial, multi-model fallback, parent-child relationship. 748 lines of well-structured, well-documented tests. |

| Line | Finding |
|------|---------|
| 62–99 | StubAIClient with configurable throw count, call recording, and active span ID tracking. Well-designed test double. ✓ |
| **100–103** | Bogus `vi.mock` for `@reading-advantage/ai` with `MockProvider` and `createTestClient` — bridges the dependency gap until Phase 8 adds it as a real dep. Acceptable Red-phase pattern. ✓ |
| 115–122 | Zod `vi.mock` workaround with detailed comment explaining the bun + vitest transform issue. Pragmatic. ✓ |
| 127–143 | In-memory Redis via `vi.mock` for `@/lib/platform/redis-client` — clean, observable mock. ✓ |
| 148–160 | Imports after mocks using pattern that vitest hoists correctly. ✓ |
| 232–259 | `installConsoleSpies()` helper captures JSON log lines — reuses the Phase 4 logger contract. Good cross-phase alignment. ✓ |
| 287–300 | `withParentSpan()` helper wraps service call in parent OTel span for parent-child assertions. Clean abstraction. ✓ |
| 302–346 | Happy path: asserts `ai.generateObject` span exists, `ai.model` and `ai.schema` attributes, OK status, and span was active during `client.generateObject`. Multiple verification points. ✓ |
| **345** | `expect(stub.activeSpanIds).toContain(aiSpan?.spanContext().spanId)` — verifies the span was the active context during the call (not just created). Good. ✓ |
| 348–394 | Error path: asserts ERROR status span, `>= 1` error spans, and exception event with `span.recordException(err)`. ✓ |
| **396–436** | Logger traceId assertion: verifies logger carries OTel span traceId (not input context.traceId). FR-5 contract enforcement. ✓ |
| 461–575 | Cache-hit adversarial test: 5 assertions spanning cache miss avoidance, result integrity, log emission count, traceId correctness, and span absence. Comprehensive. ✓ |
| **479–488** | Computes deterministic cache key in test to populate in-memory Redis correctly. Matches `buildCacheKey` logic. ✓ |
| **509** | Uses `rec:${expectedKey}` prefix — matches RedisCacheAdapter prefix. Verified integration point. ✓ |
| 604–695 | Multi-model fallback adversarial test using `vi.doMock` for scoped config. ✓ |
| **618** | `import('../recommendation-service?fallback-test')` — query-param hack forces vitest to re-import. This is a known vitest limitation; acceptable for this case. ✓ |
| 710–747 | Parent-child span relationship test. Uses `parentSpanContext.spanId` (v2.x OTel SDK property). ✓ |

### F6: `apps/science-advantage/lib/ai/image-generator.class.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Tests correctly stub AIClient and verify delegation, env-mutation, fallback, legacy API |
| **Security/tenancy** | Tests that `process.env` is NOT mutated at call time — FR-5 compliance |
| **AGENTS.md compliance** | Constructor injection pattern follows interface; uses `@reading-advantage/ai` mock |
| **Test quality** | 7 test cases covering construction, delegation, env immutability, fallback, legacy wrapper preservation |

| Line | Finding |
|------|---------|
| 87–115 | StubAIClient with configurable `throwOnGenerateImageCount` — clean for testing fallback logic. ✓ |
| 133–138 | `vi.hoisted` sets env vars before module import — required for `aiImageConfig` at load time. ✓ |
| 148–185 | `resolveImageGenerator()` helper with descriptive TypeError for Red-phase — guides implementer. ✓ |
| **210–216** | Existence assertion for `ImageGenerator` class. ✓ |
| 227–253 | Delegation test: verifies `client.generateImageCalls` length, prompt substrings, model selection, and result shape. ✓ |
| **246** | Asserts `call.model` is `'google/gemini-3-pro-image'` — primary model from `aiImageConfig`. ✓ |
| **255–276** | Env mutation test: deletes `GOOGLE_API_KEY`, sets `OPENAI_API_KEY` and `GEMINI_API_KEY`, calls `generateDiagram`, asserts neither key was mutated. Good FR-5 verification. ✓ |
| **278–289** | Fallback test: `throwOnGenerateImageCount = 1` causes first call to throw, second succeeds. Asserts `fallbackUsed: true` and `modelUsed: 'openai/dall-e-3'`. ✓ |
| **291–297** | Legacy `generateLessonDiagram` preservation test. ✓ |

### F7: `apps/science-advantage/lib/ai/image-generator.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Tests legacy `generateLessonDiagram` function with actual `ai` mock |
| **Security/tenancy** | Mutates `process.env` directly in tests — acceptable for isolated test env |
| **AGENTS.md compliance** | Tests the legacy wrapper that will be migrated; uses `vi.mock('ai')` which the architecture guard (F3) allows only in test files |
| **Test quality** | 3 integration-ish tests covering primary model, fallback, missing-key fallback |

| Line | Finding |
|------|---------|
| 9–11 | `vi.mock('ai')` with `experimental_generateImage` — uses Vercel AI SDK v3-era API. Acceptable for legacy test coverage. ✓ |
| **34–45** | `beforeEach`: saves/restores original env, sets GEMINI_API_KEY, deletes GOOGLE_API_KEY. Correct setup. ✓ |
| 47–77 | Primary model test: verifies model name, mimeType webp, size cap, no fallback. ✓ |
| 68–72 | `expect.objectContaining({ model: 'google/gemini-3-pro-image' })` — verifies correct model selection. ✓ |
| 79–105 | Fallback test: sets `AI_IMAGE_FALLBACK_MODELS` env var, primary throws, secondary succeeds. ✓ |
| **107–130** | Missing Google key test: deletes both `GEMINI_API_KEY` and `GOOGLE_API_KEY`, verifies fallback to `openai/dall-e-3`. Good edge case coverage. ✓ |

### F8: `apps/science-advantage/lib/ai/image-generator.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Solid: `buildPrompt` constructs safe prompts; `optimizeImage` tries multiple quality levels; `ImageGenerator` handles fallback loop correctly |
| **Security/tenancy** | No explicit tenant scoping; no direct env-var reads in new class (uses `aiImageConfig`). Legacy wrapper has `@ts-expect-error` escape hatch |
| **AGENTS.md compliance** | New `ImageGenerator` uses constructor-injected `AIClient` interface — follows adapter pattern. Legacy wrapper still imports `ai` directly (grandfathered) |
| **Architecture** | Good separation: prompt building, optimization, and generation are separate concerns. Legacy wrapper delegates to class. |

| Line | Finding |
|------|---------|
| 27–56 | `buildPrompt()`: school-safe instructions, no watermarks/branding, explicit aspect ratio. Good prompt engineering. ✓ |
| **58–84** | `optimizeImage()`: tries quality levels [80,70,60,50,40], returns first below `maxBytes`. Falls back to worst quality if all exceed. Good. ✓ |
| 86–87 | `ImageGenerator` class with private readonly `client: AIClient`. ✓ |
| 91–94 | Model dedup: `filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)` — O(n²) but for 2-3 models, irrelevant. ✓ |
| **98–126** | Fallback loop logs each error, rethrows after all models fail. ✓ |
| 120–124 | `logger.warn('ai.image.model_error', { model, error })` — structured logging. ✓ |
| **132–139** | `ensureApiKey()`: validates API key presence before legacy generateImage call. Throws synchronously — early failure. ✓ |
| **144–145** | `// @ts-expect-error -- ai is a transitive dep available at runtime via @reading-advantage/ai` — fragile runtime dependency. If the dep graph or package resolution changes, this breaks silently. Should declare `ai` as an explicit dependency or use the shared adapter. **Severity: medium.** |
| **147–159** | Legacy `AIClient` adapter wraps `experimental_generateImage` from `ai` package. Note: `ensureApiKey` is called inside the async handler, which is correct. ✓ |

### F9: `apps/science-advantage/lib/ai/mastery-calculator.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct weighted moving average formula, proper clamping, evidence counting |
| **Security/tenancy** | Pure function — no IO, no security concerns |
| **AGENTS.md compliance** | No Zod input schema on exported `calculateMasteryUpdates` — should define input/output schemas per AGENTS.md |
| **Architecture** | Clean pure-function module; no external dependencies |

| Line | Finding |
|------|---------|
| 1–3 | `clamp()` helper — correct. ✓ |
| 38–106 | `calculateMasteryUpdates()`: builds existing mastery map, aggregates by standardId, computes weighted average. ✓ |
| 51–54 | Skip logic for empty standardIds — `skipped` counter incremented. ✓ |
| **56–57** | `perStandardWeight = response.weight / response.standardIds.length || 0` — if `response.standardIds.length` is 0, `weight / 0` is `Infinity`, then `|| 0` catches it. But `standardIds.length` is guarded by the `if (!response.standardIds.length)` check on line 51, so `|| 0` is a belt-and-suspenders guard. ✓ |
| **93** | `clamp(previousMastery * 0.35 + newScore * 0.65, 0, 1)` — weighted moving average. The hardcoded weights (35% historical, 65% new evidence) should be configurable or documented. No issue for current scope, but worth noting. |
| **97** | `masteryLevel: Number(nextMastery.toFixed(4))` — 4-decimal precision via `toFixed` then back to Number. Acceptable. |
| 108–121 | `buildResponseInput()` — handles nullable `weight` and `answeredAt` with defaults. ✓ |
| **Exported function missing JSDoc** | **F-SA-B19-002 [jsdoc]** — Both `calculateMasteryUpdates` and `buildResponseInput` lack JSDoc. Per AGENTS.md: "Every exported function... must have a JSDoc comment." **Severity: medium.** |

### F10: `apps/science-advantage/lib/ai/prompts/recommendation.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Prompt correctly includes all context fields; JSON instruction is clear |
| **Security/tenancy** | Includes student hash (not PII) and mastery data — no schoolId leaking |
| **AGENTS.md compliance** | No Zod schema at module boundary; prompt strings are colocated with the recommendation module |
| **Architecture** | Clean separation: pure prompt builder, no IO |

| Line | Finding |
|------|---------|
| 4 | `context.candidateLessons.slice(0, 10)` — caps candidate lessons at 10. Reasonable for prompt token limits. ✓ |
| 27–56 | `buildRecommendationPrompt()`: includes student hash, grade, standards alignment, curriculum, mastery snapshot, attempt summary, candidate lessons. ✓ |
| **32** | "Respond strictly in JSON with the schema described elsewhere in this prompt" — the actual Zod schema lives in `recommendation-service.ts:19-35`. The prompt doesn't include the schema inline; "described elsewhere" is vague. If the Zod schema changes without updating the prompt, the LLM may produce shape-mismatched output that Zod would reject. **Severity: low** (mitigated by Zod validation downstream). |

### F11: `apps/science-advantage/lib/ai/recommendation-context.integration.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Seeded fixture state matches expected assertions; all edge cases covered |
| **Security/tenancy** | Uses TEST_SCHOOL_ID and schoolId columns correctly in seed data |
| **AGENTS.md compliance** | Uses Drizzle `db` imports from `@reading-advantage/db` — correct |
| **Test quality** | 6 integration tests with complete fixture lifecycle; covers mastery sorting, candidate lessons, attempt summary, edge cases |

| Line | Finding |
|------|---------|
| 23 | `TEST_SCHOOL_ID` as fixed UUID. ✓ |
| 25–39 | `cleanup()` deletes in dependency order (child tables first). Correct. ✓ |
| 50–207 | `beforeEach`: seeds schools, users (student + teacher), scienceClasses, curriculum units, lessons, unit-lessons, standards, lesson-standards, mastery, completions. Comprehensive state setup. ✓ |
| 86 | `scienceClasses.schoolId: TEST_SCHOOL_ID` — tenancy correctly set. ✓ |
| 128–135 | `scienceUnitLessons` entries include `schoolId` — correct for FLAT table classification. ✓ |
| 213–254 | `buildAttempt()` helper returns complete `AttemptWithRelations` shape including nested lesson, standards, curriculumUnits, student, questionResponses. Well-designed factory. ✓ |
| 256–273 | Mastery snapshot sorted ascending by masteryLevel assertion. ✓ |
| 280–297 | Candidate lessons: order, prerequisites (peer ordering), completed flag, standards inheritance. ✓ |
| **289** | `expect(result.candidateLessons[1].prerequisites).toEqual([attemptedLessonId])` — verifies prerequisite logic (order-based). ✓ |
| **312–325** | Edge case: no curriculum units on attempt lesson — returns empty candidates and null curriculumTitle. ✓ |
| **327–331** | Edge case: `maxScore=0` returns `scorePercentage=null`. ✓ |

### F12: `apps/science-advantage/lib/ai/recommendation-context.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Logic is correct; parallel query execution via Promise.all; proper fallback chains |
| **Security/tenancy** | **See finding below** — schoolId scoping is absent from DB queries |
| **AGENTS.md compliance** | Uses Drizzle imports from `@reading-advantage/db` — correct. No schoolId scoping on queries |
| **Architecture** | Complex function with inline IIFE for curriculum units — could be broken into smaller helpers |

| Line | Finding |
|------|---------|
| 1–11 | Imports from `@reading-advantage/db` + `crypto` — correct Drizzle usage. ✓ |
| 74–75 | Constants `MAX_WEAK_STANDARDS = 5`, `MAX_CANDIDATE_LESSONS = 20` — reasonable limits. ✓ |
| **77–82** | `hashStudentId`: uses `createHash('sha256')` with `aiConfig.hashSecret`. Produces 16-char hex. Good for anonymization. ✓ |
| 84–102 | `formatLesson()`: computes prerequisites by order comparison (not FK). Correct. ✓ |
| **104–134** | `summarizeAttempt()`: deduplicates incorrect standards via Set. Correct `scorePercentage` handling for `maxScore=0`. ✓ |
| **144–327** | `buildRecommendationContext()` main function. ✓ |
| **148** | `traceId = 'rec_' + randomUUID()` — cryptographically random UUID from `crypto.randomUUID()`. ✓ |
| **153–170** | Mastery snapshot query — uses `eq(scienceStandardMastery.studentId, attempt.studentId)` but does NOT filter by `schoolId`. If a student ID exists across multiple schools (e.g., demo data), mastery from other schools could leak. Requires caller-level scoping. |
| 172–176 | Mastery version from `max(updatedAt)`. ✓ |
| 180–280 | Curriculum unit IIFE — parallel queries per unit via Promise.all. Acceptable pattern for moderate data volumes, but scales poorly with many units. |
| **282–286** | `Promise.all` on three independent queries — good parallel execution. ✓ |
| **292** | `masteryLevel: Number(record.masteryLevel)` — DB `numeric` column casts to JS string; `Number()` conversion is correct for the returned shapes. ✓ |
| **300–306** | `candidateLessons` capped at `MAX_CANDIDATE_LESSONS` per unit. ✓ |
| **310–313** | `standardsAlignment` fallback: attempt lesson -> curriculum unit -> null. ✓ |
| **Missing JSDoc** | **F-SA-B19-003 [jsdoc]** — `buildRecommendationContext` has a one-line description (line 137–143) but the exported `AttemptWithRelations` type and `hashStudentId`/`formatLesson`/`summarizeAttempt` private functions lack JSDoc. Per AGENTS.md: every function must have JSDoc. **Severity: medium.** |
| **No schoolId scoping** | **F-SA-B19-004 [tenancy]** — The function queries `scienceStandardMastery`, `scienceStandardMastery`, `scienceCurriculumUnits`, `scienceUnitLessons`, `scienceLessons`, `scienceLessonStandards`, and `scienceLessonCompletions` without any `schoolId` filter. The `attempt.studentId` is the only scoping dimension. If the calling code passes an `AttemptWithRelations` for a student in a different school (e.g., via a server action that doesn't verify schoolId), this leaks cross-tenant mastery data. The `buildRecommendationContext` function should either accept a `schoolId` parameter and add it to all queries, or the function's documentation should explicitly state that the caller is responsible for schoolId scoping. **Severity: medium.** |

### F13: `apps/science-advantage/lib/ai/recommendation-service.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Tests correctly verify delegation to `client.generateObject`, caching, legacy wrapper preservation |
| **Security/tenancy** | Uses in-memory Redis and stubs — no real dependencies |
| **AGENTS.md compliance** | Constructor injection of `AIClient` interface — correct adapter pattern |
| **Test quality** | 5 test cases covering construction, delegation, caching, legacy API preservation |

| Line | Finding |
|------|---------|
| 44–54 | `vi.mock` for `ai`, `@ai-sdk/openai`, `@ai-sdk/google` — allows module to load in unit mode. ✓ |
| 61–80 | In-memory Redis mock — consistent with otel test pattern. ✓ |
| 104–141 | StubAIClient with call recording and schema.parse round-trip. ✓ |
| 143–154 | `@reading-advantage/ai` mock with `MockProvider` and `createTestClient`. ✓ |
| 196–238 | Fixture context matches `RecommendationContext` shape. ✓ |
| 269–305 | Delegation test: verifies prompt substrings, schema shape (call.schema.parse is a function), and result shape matches `GenerateResult`. ✓ |
| **282–285** | `call.prompt` contains sentinel substrings (`phase6hash0000`, `Atoms and Molecules`, `MS-PS1-1`, `Energy & Motion`). ✓ |
| **307–319** | Cache short-circuit test: two calls with same context, asserts `generateObjectCalls.length === 1`. ✓ |
| 321–327 | Legacy `generateRecommendation` preservation test. ✓ |

### F14: `apps/science-advantage/lib/ai/recommendation-service.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Class is well-structured: cache-first, model fallback loop, OTel spans, fallback rules engine |
| **Security/tenancy** | No schoolId scoping in cache key or fallback — relies on pre-scoped context |
| **AGENTS.md compliance** | Uses `@reading-advantage/ai` `AIClient` interface — correct adapter pattern. OTel wrapped via `@opentelemetry/api` (allowed in backend modules per adapter rule). |
| **Architecture** | Clean separation: cache, model selection, OTel instrumentation, fallback. |

| Line | Finding |
|------|---------|
| 1–13 | Imports from zod, crypto, `@reading-advantage/ai`, `@opentelemetry/api`, internal configs/logger/redis. ✓ |
| 19–35 | `recommendationSchema` — well-defined Zod schema with descriptive field constraints. ✓ |
| **22–23** | `recommendedLessonSlug: z.string().min(1)` and `focusStandards: z.array(z.string().min(1)).min(1).max(5)` — proper validation. ✓ |
| 43–46 | `recommendationCache = new RedisCacheAdapter(getRedisClient(), ...)` — instantiated at module level. This creates a connection on module import. Acceptable for a module that's always used, but could cause issues in test environments. |
| **48–56** | `buildCacheKey()`: sha256 hash of studentId + masteryVersion + sorted candidate IDs. First 16 hex chars — sufficient for deduplication. Collision risk is negligible (2^64 space). ✓ |
| 58–180 | `RecommendationService` class. ✓ |
| **64–77** | Cache-first: checks cache, parses JSON, returns on hit. Catches parse errors to regenerate on corrupted entries. ✓ |
| **70** | `trace.getSpan(otelContext.active())?.spanContext().traceId` — uses active OTel context, not input context.traceId. Correct FR-5 behavior. ✓ |
| **80–86** | Models deduplicated (`primaryModel`, `secondaryModel`). ✓ |
| **90–151** | OTel span wrapping: `startActiveSpan('ai.generateObject', ...)` with `ai.model` and `ai.schema` attributes, error handling with `recordException`, `setStatus`. ✓ |
| **106–107** | `const response = await this.client.generateObject(...)` — **F-SA-B19-005 [type-safety]** — The `response` is typed as the generic `T` from `client.generateObject<T>()`. The destructured fields (`response.recommendedLessonId`, etc.) are not type-checked against the Zod schema; the schema is passed to `client.generateObject` which should validate, but the return type is opaque. A type assertion or a dedicated response type would be safer. **Severity: low.** |
| 119–126 | Secondary model usage warning log with traceId. ✓ |
| 133–148 | Error path: `recordException`, `setStatus(ERROR)`, structured log. ✓ |
| 153–155 | Cache set on success — fire-and-forget (`catch(() => {})`). ✓ |
| **163–177** | Fallback: `generateFallbackRecommendation(context)` called when all models fail. Cached and returned. ✓ |
| **182–189** | Legacy `generateRecommendation` wrapper: uses dynamic `import('@reading-advantage/ai')` to get `getAIClient()`. Clean lazy initialization. ✓ |
| 191 | `recommendationSchema` re-exported — available for consumers. ✓ |

### F15: `apps/science-advantage/lib/ai/rules-engine.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Fallback logic correctly orders lessons, filters completed, picks by weak standards |
| **Security/tenancy** | Pure function — no IO, no auth concerns |
| **AGENTS.md compliance** | No Zod schema on `generateFallbackRecommendation` — it operates on already-validated context types |
| **Architecture** | Clean pure-function module with small well-named helpers |

| Line | Finding |
|------|---------|
| 3 | `WEAK_THRESHOLD = 0.6` — documented threshold. ✓ |
| 5–9 | `listWeakStandards()`: filters mastery < 0.6. ✓ |
| 11–16 | `pickLesson()`: generic find helper. ✓ |
| 18–42 | `toRecord()`: builds `RecommendationRecord` with reasoning template. ✓ |
| **33–35** | Reasoning: `"Based on your mastery levels, focusing on {standards}..."` — template-based fallback response. Acceptable for rules-based output. |
| **48–80** | `generateFallbackRecommendation()`: main logic. ✓ |
| 54–65 | Edge case: `orderedLessons.length === 0` — returns re-attempt of current lesson. Good defensive branch. ✓ |
| **67–69** | Weak target selection: `weakStandards` -> `incorrectStandards` as fallback. ✓ |
| **71–77** | Lesson selection: prefer uncompleted lesson matching weak standards -> any uncompleted lesson -> first lesson. Clear priority chain. ✓ |
| **Missing JSDoc** | **F-SA-B19-006 [jsdoc]** — Exported `generateFallbackRecommendation` lacks JSDoc. Per AGENTS.md. **Severity: medium.** |

### F16: `apps/science-advantage/lib/ai/types.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Types are well-defined and structurally sound |
| **Security/tenancy** | No issues — type definitions only |
| **AGENTS.md compliance** | Types are inferred from design; no Zod schemas for AI output types (Zod schema lives in recommendation-service.ts) |
| **Architecture** | Clean type module with clear separation of concerns |

| Line | Finding |
|------|---------|
| 1 | Imports `LessonType` and `StandardsAlignment` from `@/lib/enums` — shared types. ✓ |
| 3–10 | `MasterySnapshotEntry`: all fields correctly typed. ✓ |
| 12–22 | `CandidateLesson`: `prerequisites: string[]` (lesson ID array). ✓ |
| 24–34 | `AttemptPerformance`: nullable `completedAt` and `scorePercentage`. ✓ |
| 36–47 | `RecommendationContext`: composite type for AI recommendation input. ✓ |
| 49–57 | `RecommendationRecord`: matches the Gemini output shape. ✓ |
| All types are exported | ✓ |

### F17: `apps/science-advantage/lib/analytics.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Client-side analytics wrapper, SSR-safe |
| **Security/tenancy** | No issues |
| **AGENTS.md compliance** | Directly accesses `window.umami` — acceptable for a thin client-side analytics bridge. No server-side data leakage. |
| **Architecture** | Simple adapter pattern for analytics; degrades gracefully |

| Line | Finding |
|------|---------|
| 1 | `import * as clientLogger from '@/components/client-logger'` — imports a client-side logger module. ✓ |
| 4–10 | `declare global` augmentation for `Window.umami`. ✓ |
| 12–20 | `track()` function: SSR-safe guard (`typeof window !== "undefined"`). ✓ |
| 13 | `window.umami.track(event, data)` — only fires when Umami is loaded. ✓ |
| 18 | Dev fallback: logs to `clientLogger.info` in non-production. ✓ |
| **Missing JSDoc** | **F-SA-B19-007 [jsdoc]** — Exported `track` function lacks JSDoc. Per AGENTS.md. **Severity: medium.** |

### F18: `apps/science-advantage/lib/api-helpers.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Tests verify response shapes, status codes, and optional details |
| **Security/tenancy** | No issues — pure response factories |
| **AGENTS.md compliance** | Functions lack Zod input/output schemas — but as simple response wrappers this is acceptable |
| **Test quality** | 5 test cases covering both helpers with code paths (success with/without custom status, error with/without details, default status) |

| Line | Finding |
|------|---------|
| 1–2 | Clean imports. ✓ |
| 6–12 | `apiSuccess` with default 200 status — verifies `{ success: true, ...data }`. ✓ |
| 14–20 | `apiSuccess` with custom 201 status. ✓ |
| 24–30 | `apiError` with 404 — verifies `{ success: false, error }`. ✓ |
| 32–42 | `apiError` with details included. ✓ |
| 44–50 | `apiError` default 400 status. ✓ |

### F19: `apps/science-advantage/lib/api-helpers.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Functions work correctly but have a subtle spread-ordering footgun |
| **Security/tenancy** | No issues |
| **AGENTS.md compliance** | Missing Zod schemas and JSDoc |
| **Architecture** | Simple wrappers; acceptable for thin response helpers |

| Line | Finding |
|------|---------|
| 1 | `import { NextResponse } from 'next/server'` — Next.js server dependency. Acceptable for a response helper. ✓ |
| **3–5** | **F-SA-B19-008 [correctness]** — `apiSuccess`: `{ success: true, ...data }`. If `data` contains a `success` property, it overrides `true`. Example: `apiSuccess({ success: false })` produces `{ success: false }`. The spread should be `{ ...data, success: true }` to ensure `success: true` always wins. **Severity: medium.** |
| 7–17 | `apiError` with optional details — correctly omits `details` key when undefined. ✓ |
| **Missing JSDoc** | **F-SA-B19-009 [jsdoc]** — Both `apiSuccess` and `apiError` lack JSDoc. Per AGENTS.md. **Severity: medium.** |
| **Missing Zod schemas** | **F-SA-B19-010 [contract]** — No input/output Zod schemas defined for these API boundary functions. Per AGENTS.md: "Every backend function should define Input schema, Output schema." These are response-formatting functions, so the finding is low severity, but they still form part of the API contract. **Severity: low.** |

### F20: `apps/science-advantage/lib/auth/constants.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Tests verify role hierarchy ordering and default route mapping |
| **Security/tenancy** | No issues |
| **AGENTS.md compliance** | Re-exports from `@reading-advantage/auth` — correct adapter pattern |
| **Test quality** | 2 test cases, both clear |

| Line | Finding |
|------|---------|
| 1–2 | Clean imports. ✓ |
| 6–10 | `ROLE_HIERARCHY` ordinal checks: STUDENT < TEACHER < ADMIN < SYSTEM. ✓ |
| 14–19 | `ROLE_ROUTES` mapping: STUDENT -> /student, TEACHER -> /teacher, ADMIN -> /admin, SYSTEM -> /system. ✓ |

---

## Summary of Findings

| ID | File | Line | Severity | Category | Description |
|----|------|------|----------|----------|-------------|
| F-SA-B19-001 | `architecture.test.ts` | 63–77 | low | completeness | IGNORED_DIRS missing `__pycache__`, `.env`, `.drizzle`, `drizzle/` |
| F-SA-B19-002 | `mastery-calculator.ts` | 38, 108 | medium | jsdoc | Exported `calculateMasteryUpdates` and `buildResponseInput` lack JSDoc |
| F-SA-B19-003 | `recommendation-context.ts` | multiple | medium | jsdoc | Exported `buildRecommendationContext` has minimal doc; private functions and `AttemptWithRelations` type have none |
| F-SA-B19-004 | `recommendation-context.ts` | 153–280 | medium | tenancy | No schoolId scoping on DB queries — cross-tenant data leak risk if caller doesn't scope |
| F-SA-B19-005 | `recommendation-service.ts` | 106–114 | low | type-safety | `client.generateObject<T>().` response destructuring is unchecked against the Zod schema shape |
| F-SA-B19-006 | `rules-engine.ts` | 48 | medium | jsdoc | Exported `generateFallbackRecommendation` lacks JSDoc |
| F-SA-B19-007 | `analytics.ts` | 12 | medium | jsdoc | Exported `track` function lacks JSDoc |
| F-SA-B19-008 | `api-helpers.ts` | 3–5 | medium | correctness | `apiSuccess` spread order lets `data.success` override the hardcoded `success: true` |
| F-SA-B19-009 | `api-helpers.ts` | 3, 7 | medium | jsdoc | Both `apiSuccess` and `apiError` lack JSDoc |
| F-SA-B19-010 | `api-helpers.ts` | 3, 7 | low | contract | No Zod schemas on API boundary helpers |

### Severity Distribution

| Severity | Count |
|----------|-------|
| **high** | 0 |
| **medium** | 7 |
| **low** | 3 |

### Category Distribution

| Category | Count |
|----------|-------|
| jsdoc | 5 |
| correctness | 1 |
| tenancy | 1 |
| completeness | 1 |
| type-safety | 1 |
| contract | 1 |

---

## Limitations

- **No runtime execution.** Findings are based on static analysis of source code only. Tests have not been run.
- **No cross-batch deduplication.** Findings are scoped to files in this batch; some issues (e.g., JSDoc gaps, tenancy scoping) may also affect files reviewed in other batches.
- **No schema verification.** Some findings reference database column names/spellings that could not be verified without the full Drizzle schema files (not in this batch).
- **No dependency graph verification.** Finding F-SA-B19-005 about type safety in `generateObject` response depends on the `AIClient` interface definition in `@reading-advantage/ai` (not in batch scope).
- **Architecture guard tests (F3, F4) are TDD-Red-phase files.** They are designed to fail before the Green implementation lands. Their correctness is judged against the spec, not against current implementation.
- **No acceptance/closeout claims.** This review identifies issues but does not determine whether the batch passes or fails any acceptance gate.
