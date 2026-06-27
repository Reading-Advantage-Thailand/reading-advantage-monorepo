# Line Review: sa-batch-21

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-21 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns
- **File types**: CI gate tests (5), config modules (4), env + env test (2), content parsers + test (2), enums (1), form builder (1), gamification (5)

---

## Files Reviewed

| # | File | Lines | Type |
|---|------|-------|------|
| 1 | `apps/science-advantage/lib/ci-gates/phase-4-process-env-cast.test.ts` | 239 | CI gate test |
| 2 | `apps/science-advantage/lib/ci-gates/phase-6-misc-cleanup.test.ts` | 300 | CI gate test |
| 3 | `apps/science-advantage/lib/ci-gates/phase-7-check-types-script.test.ts` | 355 | CI gate test |
| 4 | `apps/science-advantage/lib/ci-gates/phase-8-ignore-build-errors.test.ts` | 304 | CI gate test |
| 5 | `apps/science-advantage/lib/ci-gates/phase-9-delete-app-local-ci-workflow.test.ts` | 294 | CI gate test |
| 6 | `apps/science-advantage/lib/config/ai-images.ts` | 12 | Config module |
| 7 | `apps/science-advantage/lib/config/ai.ts` | 13 | Config module |
| 8 | `apps/science-advantage/lib/config/features.ts` | 5 | Config module |
| 9 | `apps/science-advantage/lib/config/recommendations.ts` | 23 | Config module |
| 10 | `apps/science-advantage/lib/content-parsers.test.ts` | 182 | Unit test |
| 11 | `apps/science-advantage/lib/content-parsers.ts` | 229 | Utility module |
| 12 | `apps/science-advantage/lib/enums.ts` | 34 | Type definitions |
| 13 | `apps/science-advantage/lib/env.test.ts` | 78 | Unit test |
| 14 | `apps/science-advantage/lib/env.ts` | 150 | Env validation |
| 15 | `apps/science-advantage/lib/forms/from-zod.ts` | 250 | Form builder |
| 16 | `apps/science-advantage/lib/gamification/badges.constants.ts` | 89 | Constants/types |
| 17 | `apps/science-advantage/lib/gamification/badges.integration.test.ts` | 484 | Integration test |
| 18 | `apps/science-advantage/lib/gamification/badges.ts` | 245 | Business logic |
| 19 | `apps/science-advantage/lib/gamification/streak.integration.test.ts` | 97 | Integration test |
| 20 | `apps/science-advantage/lib/gamification/streak.test.ts` | 90 | Unit test |

---

## Cross-Cutting Observations

Before the per-file findings, three systemic issues span multiple files in this batch:

1. **Multi-tenancy gap — production badge queries not scoped by `schoolId`.** The `db` import from `@reading-advantage/db` is a raw Drizzle client, not the `createTenantDB` tenant-scoped wrapper from `packages/domain`. All badge-checker functions in `badges.ts` (`countCompletedLessons`, `checkPerfectScore`, `checkUnitChampion`, `checkLabPartner`, `checkStreakWarrior`, `checkDedicatedLearner`, `checkQuizMaster`, `checkFastLearner`) query FLAT tables without a `schoolId` filter. The AGENTS.md mandates that FLAT tables must be scoped automatically via `createTenantDB` or manually via `eq(table.schoolId, tenant.schoolId)`. This is a **medium-severity tenancy defect** (files 17, 18).

2. **Direct `db` usage bypasses TenantDB wrapper.** The monorepo's `packages/domain/src/tenant-registry.ts` classifies every science table as FLAT and provides `createTenantDB` for automatic scoping. Science-advantage imports `db` directly from `@reading-advantage/db` rather than through `createTenantDB`, which means none of the automatic tenant-scoping is applied. This is an architecture-baseline deviation (files 17, 18, 19).

3. **`from-zod.ts` has no test file.** `lib/forms/from-zod.ts` is a 250-line business-logic module (form field generation from Zod schemas) with zero tests. AGENTS.md requires `"Write tests for all new backend code"` and vitest is the designated framework. This is a test-coverage gap (file 15).

---

## File-by-File Findings

### File 1: `phase-4-process-env-cast.test.ts` (239 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (CI gate) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 34–36, 87–88 | Shared mutable module-level `tscOutput`/`tscStatus` populated in `beforeAll`. If `beforeAll` throws, tests 2–5 silently pass on stale `undefined`. Test 1 guards against status being `null`, but `tscOutput` would remain `""` causing false-negative regex matches. The slice-then-check pattern mitigates this well. | Info | F-SA-B21-001 |
| 59–72 | `PHASE_4_FILES` is declared `as const` but the tuple is never iterated in test generation (each file gets a hand-written `it` block). This duplicates the file list — a future addition must update both the tuple and the describe block. A data-driven `it.each(PHASE_4_FILES)` pattern would eliminate the duplication risk. | Low | F-SA-B21-002 |
| 96–103 | `spawnSync` with `stdio: ["ignore", "pipe", "pipe"]` captures output correctly. 240s timeout is generous for a ~30s operation. | OK | — |
| 116–124 | `ts2559ErrorsInFile` uses `line.startsWith(filePrefix)` which is safe because tsc always emits `<path>(line,col):` format and no path ends with another path's prefix. | OK | — |
| 147–164 | Error message in `expect` is highly actionable — includes the fix strategy, the full tsc snippet. Good test-engineering pattern. | OK | — |
| 200–219 | The "cohort" gate is a defensive cross-check that catches regressions in unexpected files. Good pattern. | OK | — |

---

### File 2: `phase-6-misc-cleanup.test.ts` (300 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (CI gate) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 99–104 | `PHASE_6_FILES` contains `app/api/students/.../route.integration.test.ts` — an integration test file that depends on DB schema. The file itself may be deleted during the track's Phase 6 fix; the test will correctly fail if the file is missing (`startsWith` returns false and the cohort is clean). However, if the test file is renamed during refactoring, this gate silently passes. | Info | F-SA-B21-003 |
| 148–156 | `tscErrorsInFile` uses the same pattern as Phase 4's `ts2559ErrorsInFile` but generalised to any `error TS\d+:`. A general `/\berror TS\d+:/u` regex could match error messages in comments or strings if tsc formats them unusually, though this is unlikely in practice. | Low | F-SA-B21-004 |
| 238–258 | Error message for the mastery-profile test file is very long (paragraph about root cause). Informative but may be truncated by CI log viewers. | Info | F-SA-B21-005 |
| 260–280 | Cohort gate same pattern as Phase 4 — good. | OK | — |
| All | Fix advice strings repeat the same information from the file JSDoc into every error message. This is defensive (the JSDoc is not visible at test-failure time) and follows good practice. | OK | — |

---

### File 3: `phase-7-check-types-script.test.ts` (355 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (CI gate) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Excellent |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 92–102 | `NO_OP_SCRIPT_VALUES` includes `"false"` and `"exit 0"` — good defensive list. Consider adding `"tsc --version"` (a command that runs tsc but does not typecheck) and `"tsc -b"` (build mode without noEmit). | Info | F-SA-B21-006 |
| 124–135 | `runCheckTypesGate` uses `corepack pnpm` instead of just `pnpm`. This is correct for environments where pnpm is only available via corepack (fresh CI). However, if `corepack` is not installed (some Docker images), the spawn fails silently (status non-zero but the error message may be confusing). The "sanity check" test 6 catches this. | Low | F-SA-B21-007 |
| 183–206 | Tests 2 and 3 read `package.json` twice via `readFileSync`+`JSON.parse`. An alternative is reading once in a shared `beforeAll`. Performance impact is negligible for a 1 KB file. | Info | F-SA-B21-008 |
| 229 | Test 4 accesses `pkg.scripts?.checkTypes` as a fallback for the hyphenated key. This is unnecessary — the script key is consistently `check-types` in all package.json files. The fallback only adds confusion. | Low | F-SA-B21-009 |
| 252–283 | Test 5 checks `turbo.json` task configuration — excellent regression guard for the workspace-level wiring. | OK | — |
| 301–327 | Conditional assertion in test 6 (`if (checkTypesStatus === 0) { ... } else { expect(tscLines.length).toBeGreaterThan(0) }`) is a pragmatic way to handle the "currently red" state. The block-level `expect(checkTypesStatus).toBe(0)` inside the `if` branch is useless (it is already known to be 0) but harmless. | Info | F-SA-B21-010 |
| All | Comprehensive file with 7 tests covering wiring, regression, and end-to-end. Excellent test quality. | OK | — |

---

### File 4: `phase-8-ignore-build-errors.test.ts` (304 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (CI gate) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 99–101 | `RESOLVED_ERROR_COMMENT_PHRASE` and `PRISMA_REMOVAL_PHRASE` are hardcoded strings from the 2026-06-07 file state. If the comment block is reformatted (e.g. line breaks change), these strings won't match and the test will fail. This is the intended behaviour (tight coupling to the exact text), but it is brittle to cosmetic rewording. The design explicitly accepts this brittleness for regression-detection value. | Info | F-SA-B21-011 |
| 107–114 | `RESOLVED_COHORT_BULLETS` array — each bullet is a full sentence fragment. A comment reformat that rewords any bullet (e.g. "INTERN role widening" → "Role widening for INTERN") causes the test to fail, even if the substantive content is unchanged. | Low | F-SA-B21-012 |
| 129–130 | `let buildOutput: string; let buildStatus: number | null;` — shared mutable state populated by nested `beforeAll`. If the file-content tests (first describe block) run in isolation via `vitest -t "file-content"`, the build is not spawned. If a future contributor adds a test that reads these in the first describe, it would get `undefined` silently. Using a WeakMap or a dedicated context object would be more robust. | Low | F-SA-B21-013 |
| 143–154 | `runBuildGate` spawns `pnpm turbo run build --filter=science-advantage` with a 9-minute timeout. This is a 2–4 minute build that may fail if turbo cache is cold. The spawn timeout is generous enough for cold runs. | OK | — |
| 162–183 | Test 1 correctly checks `ignoreBuildErrors: true` absence. The error message includes the full file content, which is helpful but could be very long. | Info | F-SA-B21-014 |
| 185–214 | Test 2 handles both "field present → value must be `false`" and "field absent → acceptable" branches. Good defensive pattern. | OK | — |
| 216–241 | Test 3 checks comment block removal — uses both the anchor phrase and individual bullets. Comprehensive. | OK | — |

---

### File 5: `phase-9-delete-app-local-ci-workflow.test.ts` (294 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (CI gate) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 104–130 | Path constants are absolute, resolved from `process.cwd()`. Correct for vitest running from the package root. | OK | — |
| 141–153 | `listDirSync` helper handles non-existent directory → `null`, non-directory → throws. Clean. The `throw` for a non-directory at the `.github/workflows` path is a reasonable failure mode (though unlikely). | OK | — |
| 161–178 | Test 1 uses `existsSync` and asserts `toBe(false)`. If the parent `.github/workflows/` directory also doesn't exist because someone deleted the entire `.github/` tree, `existsSync` returns false and this test passes. But test 4 guards against that. | OK | — |
| 180–204 | Test 2 reimplements the `find` gate in pure JS rather than spawning `find`. This is correct for portability (Windows CI). | OK | — |
| 206–232 | Test 3 handles "directory absent" via early return (`if entries === null { return; }`). Silent pass on directory absence is correct behaviour — the directory being deleted is the Phase 9 end state. | OK | — |
| 239–290 | Test 4 tests the `.github/` directory exists, is a directory, and has entries. The detailed error message guides the human to the right fix. Good regression guard. | OK | — |
| All | No expensive spawns (no tsc, no build). Pure filesystem checks. Excellent for targeted test runs. | OK | — |

---

### File 6: `ai-images.ts` (12 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `import { env } from '@/lib/env'` — uses path alias, consistent with `tsconfig.json`. | OK | — |
| 3–11 | `aiImageConfig` includes `googleApiKey` and `openaiApiKey` as plain strings. These are API keys exposed through the config object. AGENTS.md requires auth/API keys go through the AI adapter pattern, not be passed around as raw config values. The keys are consumed by the adapter, but exposing them at module scope means any module that imports `aiImageConfig` has access to raw keys. | Low | F-SA-B21-015 |
| 12 | `export type AiImageConfig = typeof aiImageConfig` — type derived from runtime value. Clean. | OK | — |

---

### File 7: `ai.ts` (13 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 8 | `hashSecret: env.aiRecommender.hashSecret` — the hash secret is a 32-char minimum value (enforced by `env.ts` refinement). Exposing it through the config object is structurally identical to file 6 — it enables any importing module to access the secret. However, `aiConfig` is used only by `recommendations.ts` (file 9), which is in the same module group. Acceptable within the current architecture. | Info | F-SA-B21-016 |

---

### File 8: `features.ts` (5 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–5 | Simple feature-flag wrapper. `isAiRecommendationEnabled()` reads `NEXT_PUBLIC_FEATURE_AI_RECOMMENDATION` from the validated env object. Correctly uses the public prefix for client-accessible flags. | OK | — |

---

### File 9: `recommendations.ts` (23 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Minor concern — module-level singleton |
| **Security/tenancy** | N/A (no per-tenant state) |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 7 | `recommendationCache = new Map<string, { expiresAt: number; response: unknown }>()` — module-level in-memory cache. In a serverless environment (Vercel serverless functions), this cache lives only as long as the cold-start instance and is shared across requests within that instance. This is fine for a long-running server but produces unpredictable behaviour in serverless (stale reads, memory leaks across requests). If science-advantage deploys to serverless, this should use Redis. | Medium | F-SA-B21-017 |
| 9–13 | `rateLimitStore = new RedisRateLimitStore(getRedisClient(), ...)` — module-level singleton Redis store with `fallbackEnabled: true`. The `fallbackEnabled` setting means rate limiting degrades gracefully when Redis is unavailable (falls back to in-memory). This is good. | OK | — |
| 15–18 | `RateLimitError` extends `Error` with `retryAfter` in seconds. The `Math.max(1, ...)` floor is correct (prevents sub-second retry-after). | OK | — |
| 20–23 | `resetTestkit()` resets both the cache and the rate-limit store. This is a test-only utility exported from production code. AGENTS.md doesn't forbid this, but it couples production exports to test concerns. Using a separate test helper file would be cleaner. | Low | F-SA-B21-018 |
| 6 | `requestSchema` is exported but unused within the file. Likely consumed by API routes. Validation before reaching this module is proper. | OK | — |

---

### File 10: `content-parsers.test.ts` (182 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (pure functions) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 39–42 | `parseVocabulary('')` returns `[]` — edge case covered. Good. | OK | — |
| 45–74 | `parseMaterials` tests cover both "with quantity" and "without quantity" formats. The regex-based parsing handles `3`, `1`, `Several`, `One per student`. Edge cases not covered: negative quantities, decimal quantities (`1.5 cups`), multi-word quantities (`A few`). Not critical for current lesson content, but a gap for future content variability. | Low | F-SA-B21-019 |
| 77–116 | `parseProcedure` tests cover numbered steps with and without sub-steps. The format `1. instruction` is matched; the test doesn't cover leading whitespace or malformed step numbers (`01.`). | Info | F-SA-B21-020 |
| 118–151 | `parseMarkdownSections` test covers h2 and h3 sections. Does not test: h4+ sections, section with no blank line after header, trailing whitespace, or empty sections. | Info | F-SA-B21-021 |
| 153–181 | `extractVocabulary` test covers integration of `parseMarkdownSections` + `getSection` + `parseVocabulary`. Good end-to-end coverage. Missing: case-insensitive "Key Vocabulary" variant. | Info | F-SA-B21-022 |
| All | Well-structured tests with clear describe/it hierarchy. Every public parser function has at least one test. | OK | — |

---

### File 11: `content-parsers.ts` (229 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (pure functions) |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 9–30 | Interfaces are clean, well-documented via JSDoc. `subSteps` is optional on `ProcedureStep` — consistent with `parseProcedure` which initialises it as `[]`. | OK | — |
| 35–80 | `parseMarkdownSections` uses a line-based parser with state (`currentSection`). The regex `/^##\s+(.+)$/` matches h2, `/^###\s+(.+)$/` matches h3. Does not handle: h4+ (`####`), alternative heading syntax (`===` underline), or trailing `#` symbols in ATX headings (`## Title ##`). Acceptable for controlled lesson content. | Info | F-SA-B21-023 |
| 90–106 | `parseVocabulary` uses a `gm` regex. The `lastIndex` reset is implicit on each call (new RegExp per call since it's a literal). Correct. | OK | — |
| 94 | Regex `/- \*\*(.+?)\*\*\s+\(Thai:\s+(.+?)\)\s+-\s+(.+)$/gm` matches the expected format but is hard-typed to Thai language. Non-Thai bilingual content (e.g. English/Mandarin) would not parse. | Low | F-SA-B21-024 |
| 116–131 | `parseMaterials` regex `/- (?:(\d+(?:-\d+)?|[Ss]everal|[Oo]ne per student)\s+)?(.+)$/gm` — the quantity patterns are hardcoded English strings. Localised material lists would fail. In a science curriculum targeting English/Thai bilingual classrooms, this is a narrow concern but worth noting. | Info | F-SA-B21-025 |
| 182–183 | `getSection` uses case-insensitive comparison. Good. | OK | — |
| 190–229 | `extractVocabulary`, `extractMaterials`, `extractProcedure` are thin wrappers over `parseMarkdownSections` + `getSection` + the specific parser. Clean separation of concerns. | OK | — |

---

### File 12: `enums.ts` (34 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (type definitions) |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 12–16 | Re-exports `StandardsAlignment` from `@reading-advantage/types/contracts/class`. Also re-exports a type alias `StandardsAlignmentType`. The dual export of value + type from the same path is valid TypeScript (`export { StandardsAlignment }` re-exports both the value and the type). | OK | — |
| 18 | `LESSON_TYPE_VALUES = ['LESSON', 'LAB', 'ASSESSMENT', 'REVIEW'] as const` — matches the Drizzle schema enum in `packages/db/src/schema/science.ts`. | OK | — |
| 20–25 | `LessonType` object with `satisfies Record<LessonType, LessonType>` — enables both type-level (`LessonType` type) and value-level (`LessonType.LESSON` string literal) usage. Good pattern that replaces the Prisma-generated enum. | OK | — |
| 27–34 | `MasteryRunStatus` follows the same pattern. Four values: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`. | OK | — |

---

### File 13: `env.test.ts` (78 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK (with caveat) |
| **Security/tenancy** | OK |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 11–13 | Test that `env.ts` does not contain `NEXT_PUBLIC_DEV_AUTH`. Correct protection — the dev auth override must remain server-only. | OK | — |
| 19–45 | Recursive filesystem scan checks all `.ts`, `.tsx`, `.js`, `.jsx` files in `lib/`, `app/`, `components/` for `NEXT_PUBLIC_DEV_AUTH`. Skips `.test.*` files (which may legitimately reference it). The scan excludes `node_modules` and `generated`. Correct approach. | OK | — |
| 23–28 | The `scanDir` function skips directories starting with `.`. This means `.next/` (contents of which may contain compiled references) is skipped. Since compiled output is not source, this is correct. | OK | — |
| 30 | The test skips `.test.*` files but not `node_modules` (that's handled by the directory skip). The `!entry.name.includes('.test.')` guard means the test would miss a violation in a file like `config.test.ts` — but such a file would only exist in `app/` or `components/` by accident. Acceptable. | Info | F-SA-B21-026 |
| 48–67 | The `.env.example` coverage test reads `.env.example` by parsing lines matching `^[A-Z_]+=` and checks each variable name appears in `env.ts`. This is a good regression guard. However, it only checks that the variable *name* appears in the source, not that it is meaningfully defined in the schema — a bare `console.log("DATABASE_URL")` would pass. | Low | F-SA-B21-027 |
| 64 | `it.each(envExampleVars)` — if `.env.example` is empty or missing, this test has no cases and silently passes. An assertion that `envExampleVars.length > 0` before the `each` would guard against this. | Low | F-SA-B21-028 |

---

### File 14: `env.ts` (150 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK (env validation) |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 13–51 | Zod schema validates `process.env` at boot time. Every `.env.example` variable is declared. Most values are `z.string().optional()` — this means missing values produce `undefined` rather than a boot failure. For production safety, critical vars (`DATABASE_URL`, `OPENAI_API_KEY`) should be required in production via a `.refine` or conditional schema. | Medium | F-SA-B21-029 |
| 16 | `DATABASE_URL: z.string().url().optional().default('postgresql://localhost:5432/test')` — the default is an invalid `postgresql://` URL (no credentials, no database name). In development this gives a confusing connection error instead of a clear "DATABASE_URL is not set" message. | Low | F-SA-B21-030 |
| 51–59 | `.refine` checks `AI_RECOMMENDER_HASH_SECRET` length >= 32 if set. The error message is correctly scoped to the `AI_RECOMMENDER_HASH_SECRET` path. | OK | — |
| 61 | `const rawEnv = envSchema.parse(process.env);` — if validation fails, this throws at import time. A try/catch with structured error logging would be more robust, but hard-fail on missing env is an acceptable pattern for Next.js. | Info | F-SA-B21-031 |
| 66–81 | `parseCommaSeparated` and `parseNumber` helpers are pure, well-documented. | OK | — |
| 86–89 | `parseBoolean(value, fallback)` treats anything other than `'true'` as false. `'1'`, `'yes'`, `'TRUE'` all produce `false`. This is documented behaviour but could surprise operators used to flexible boolean parsing. | Info | F-SA-B21-032 |
| 92–105 | `aiRecommender` derived config uses cascading fallbacks: `AI_RECOMMENDER_MODEL_PRIMARY ?? AI_RECOMMENDER_MODEL ?? 'gemini-2.5-flash'`. The `AI_RECOMMENDER_MODEL` (without `_PRIMARY`) is a legacy key — documented in the JSDoc but adds complexity. | Info | F-SA-B21-033 |
| 102 | `hashSecret: rawEnv.AI_RECOMMENDER_HASH_SECRET ?? 'science-advantage'` — the fallback is a hardcoded string literal that is the same for every deployment. Users who omit `AI_RECOMMENDER_HASH_SECRET` get a predictable secret, making the hash non-secret. The `.refine` only checks length if the value IS set, so omitting it entirely bypasses the check and uses the weak default. | High | F-SA-B21-034 |
| 117–150 | Exported `env` object provides typed access to all parsed values. Good — consumers never read `process.env` directly. | OK | — |

---

### File 15: `from-zod.ts` (250 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (form generation) |
| **AGENTS.md compliance** | Deviation — no tests |
| **Test quality** | No tests exist |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–250 | **No test file.** Zero tests exist for `buildFormFields`, `humanize`, `unwrapType`, `defaultFieldType`, `deriveOptions`, or `shouldRenderTextarea`. This is a 250-line business-logic module generating form field configurations from Zod schemas — it should have unit tests. | High | F-SA-B21-035 |
| 67 | `HUMANIZE_REGEX = /([a-z0-9])([A-Z])/g` — inserts a space between lowercase+digit and uppercase. Does not handle acronyms (`APIField` → `A P I Field` not `API Field`) or consecutive capitals (`XMLParser` → `X M L Parser`). Acceptable for default label generation; overrides are available. | Info | F-SA-B21-036 |
| 71–76 | `humanize()` also replaces `_` and `-` with spaces, then title-cases each word. Good for generating labels from `snake_case` or `kebab-case` schema keys. | OK | — |
| 78–125 | `unwrapType` handles `ZodOptional`, `ZodNullable`, `ZodDefault`, `ZodCatch`, `ZodEffects`, `ZodPipeline`. Does not handle `ZodReadonly` (new in Zod 4?), `ZodBranded`, or `ZodLazy`. Acceptable for the current schema shapes. | Info | F-SA-B21-037 |
| 127–145 | `defaultFieldType` maps Zod types to form field kinds. `ZodArray` maps to `'select'` — this assumes array fields are always multi-select. For array-of-primitives used as tags, this is correct. For array-of-objects (e.g. `addresses`), this produces a broken form. | Low | F-SA-B21-038 |
| 166–184 | `shouldRenderTextarea` checks `max` string-length check. The type-checks for `_def.checks` access a private `drizzle-orm`/Zod internal property (`_def`). This is fragile across Zod versions. If Zod's internal structure changes, this silently breaks (falls back to `false`, producing text inputs instead of textareas). | Medium | F-SA-B21-039 |
| 193–229 | `buildFormFields` iterates `schema.shape` entries. The `shape` property is a public Zod API. Correct. | OK | — |
| 231–249 | Ordering logic gives fields without an explicit `order` override `Number.MAX_SAFE_INTEGER` (at the end). Fields with the same order are kept in insertion order (stable sort). The `.filter(field => !field.hidden)` removes hidden fields after sorting — if all fields are hidden, `ordered` is empty, and the `transform` (if any) still runs. Acceptable. | OK | — |

---

### File 16: `badges.constants.ts` (89 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (constants/types) |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–11 | `BadgeType` union of 10 string literals — all values are `UPPER_SNAKE_CASE` consistent with database enum conventions. | OK | — |
| 13–18 | `BadgeDefinition` interface has four required fields: `id`, `name`, `description`, `icon`. The `icon` field references `'Footprints'`, `'Trophy'`, etc. — these are likely Lucide or `lucide-react` icon names. No type constraint enforces this; a typo like `'Trophyyy'` compiles fine but breaks at runtime. | Low | F-SA-B21-040 |
| 20–81 | `BADGE_DEFINITIONS` is a flat array. Each badge has a unique `id`. No unit test validates uniqueness (the integration test at badges.integration.test.ts line 173 does check `ids.size === 10`). | OK | — |
| 83–89 | `BadgeTriggerEvent` defines two event types: `quiz_completed` and `lesson_completed`. The `score` and `attemptNumber` are optional — this is correct because `lesson_completed` events don't have scores. | OK | — |

---

### File 17: `badges.integration.test.ts` (484 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK (fixtures include schoolId, but tests don't isolate by school) |
| **Security/tenancy** | **Defect** — production code untested for school scoping |
| **AGENTS.md compliance** | OK (integration tests use real DB as expected) |
| **Test quality** | Good coverage, well-structured |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 2 | `import { db, and, eq, sql } from '@reading-advantage/db'` — uses raw Drizzle client, not tenant-scoped wrapper. All test inserts manually include `schoolId: TEST_SCHOOL_ID`, which is correct for fixture isolation. | OK | — |
| 22–24 | `TEST_SCHOOL_ID`, `TEACHER_ID`, `STUDENT_ID` are constant strings. `TEACHER_ID` and `STUDENT_ID` are prefixed with `badges-itest-*` to avoid collisions. `TEST_SCHOOL_ID` is a deterministic UUID (`00000000-...-0099`). | OK | — |
| 26–40 | `cleanupFixtures` uses explicit `DELETE` for junction and leaf tables, then raw `sql` for tables without Drizzle ORM convenience methods. Ordering is correct (child tables first, then users). However, the `users` table DELETE uses a raw SQL parameter and `sql` template literal — the Drizzle `eq` pattern would be cleaner and more type-safe. | Info | F-SA-B21-041 |
| 39 | `await db.execute(sql`DELETE FROM users WHERE id IN (${TEACHER_ID}, ${STUDENT_ID})`)` — Uses tagged template literals from `drizzle-orm`'s `sql` helper. This is parameterised (safe from injection) because `drizzle-orm`'s `sql` tag handles template interpolation as bound parameters. Correct. | OK | — |
| 63–76 | `seedClass` inserts `standardsAlignment: 'THAI'` — the string literal matches `LessonType` enum values. The `schoolId: TEST_SCHOOL_ID` is manually added. | OK | — |
| 166 | `beforeEach` inserts `schools` with `onConflictDoNothing()` — this handles the case where multiple test suites share the same test school UUID. Good pattern. | OK | — |
| 184–229 | Tests for `FIRST_STEPS` correctly verify unlock, non-unlock, and no-re-unlock. Good. | OK | — |
| 219–228 | The "does not re-unlock" test queries `achievements` directly. It filters by `userId` and `badgeType` but **not** by `schoolId`. Since the integration test uses a single school and `cleanupFixtures` deletes all rows, this is safe for the test environment. If someone ran two parallel test suites sharing the same DB, there could be cross-contamination, but vitest runs tests sequentially. | Info | F-SA-B21-042 |
| 288–323 | `UNIT_CHAMPION` tests create a class, unit, lessons, and unit-lesson junctions. All inserts include `schoolId`. Good fixture hygiene. | OK | — |
| 354–400 | Tests for `QUIZ_MASTER`, `SCIENCE_EXPLORER`, `FAST_LEARNER` — all use the same `STUDENT_ID`, accumulating state across tests. The `beforeEach` cleanup prevents cross-test leakage. Good. | OK | — |
| 403–410 | `BILINGUAL_SCHOLAR` test documents that this badge never unlocks yet. The comment `"(deferred, requires language preference tracking)"` is the only documentation. A pending/ skipped test (`it.todo`) would be more visible. | Info | F-SA-B21-043 |
| 412–459 | "Achievement creation" and "does not duplicate" tests verify the actual DB state after `checkBadgeConditions`. Good integration coverage of the write path. | OK | — |
| All | **Missing: multi-tenant isolation test.** No test verifies that a student in school A cannot affect badge state in school B, or that badge query functions only return data from the user's school. Given the production-code tenancy defect (file 18), this test gap is correlated. | Info | F-SA-B21-044 |

---

### File 18: `badges.ts` (245 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Contains multi-tenancy defect |
| **Security/tenancy** | **Defect** — no schoolId filters on read queries |
| **AGENTS.md compliance** | Deviation — bypasses TenantDB wrapper |
| **Test quality** | See file 17 (integration tests exist but don't cover tenancy) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `import 'server-only'` — prevents accidental client-side import. Correct. | OK | — |
| 3 | `import { db, and, eq, ... } from '@reading-advantage/db'` — uses raw Drizzle client. The TenantDB (`createTenantDB` in `packages/domain/src/tenant-registry.ts`) is not used. The AGENTS.md mandates that FLAT tables get automatic schoolId scoping. | OK | — |
| 18–29 | `countCompletedLessons` queries `scienceLessonCompletions` (FLAT) without filtering by `schoolId`. If two schools have different data for the same `userId` (unlikely but possible if user IDs are not globally unique per school), the count is wrong. **Multi-tenancy gap.** | Medium | F-SA-B21-045 |
| 35–54 | `checkPerfectScore` queries `scienceAttempts` (FLAT) without `schoolId`. Same issue. | Medium | F-SA-B21-046 |
| 56–90 | `checkUnitChampion` queries `scienceCurriculumUnits` (FLAT) and `scienceUnitLessons` (FLAT) without `schoolId`. **Multi-tenancy gap.** | Medium | F-SA-B21-047 |
| 96–112 | `checkLabPartner` joins `scienceLessonCompletions` and `scienceLessons` (both FLAT). Neither query is scoped by `schoolId`. The join itself is correct (`lessonId` matches), but cross-school data could leak. | Medium | F-SA-B21-048 |
| 118–134 | `checkStreakWarrior` and `checkDedicatedLearner` query `gamificationProfiles` (FLAT) without `schoolId`. | Medium | F-SA-B21-049 |
| 136–147 | `checkQuizMaster` queries `scienceAttempts` (FLAT) without `schoolId`. | Medium | F-SA-B21-050 |
| 149–170 | `checkFastLearner` queries `scienceAttempts` (FLAT) without `schoolId`. | Medium | F-SA-B21-051 |
| 172–183 | `CHECKERS` map — all badge checker functions are registered. Each receives only `userId` (no `schoolId` parameter). Adding school scoping to `checkBadgeConditions` would require either (a) threading `schoolId` through every checker, or (b) using `createTenantDB` to auto-scope all queries. | Info | F-SA-B21-052 |
| 199–244 | `checkBadgeConditions` queries `achievements` (FLAT) without `schoolId` (line 209). However, the INSERT at line 234 correctly includes `schoolId` from the user's gamification profile. The insert is scoped, but the read-before-write (dedup check) is not — allowing a race where a user in school A could be considered as "already having" a badge awarded in school B. | Medium | F-SA-B21-053 |
| 217–225 | The userProfile lookup at line 217–221 retrieves `schoolId` from `gamificationProfiles`. If a user has no gamification profile, the function returns early with empty arrays — this means a student who has not yet had a profile initialised never earns any badges, even if they meet the conditions. This is a correctness gap (the profile should be initialised before badge checks, or the checker should handle missing profiles). | Medium | F-SA-B21-054 |
| 227–242 | The INSERT into `achievements` uses the profile's `schoolId`. This is correct for the write path. But the preceding read (line 206–210) queries `achievements` without `schoolId` — so the dedup check works across schools, which is wrong for multi-tenant correctness. | Medium | F-SA-B21-055 |
| All | **Architecture deviation:** This file imports `db` directly from `@reading-advantage/db` rather than using the `createTenantDB` wrapper from `packages/domain/src/tenant-registry.ts`. All science tables are classified as FLAT in the registry, meaning they have `schoolId` columns and the TenantDB would auto-inject the school filter. The science-advantage app bypasses this mechanism entirely. | High | F-SA-B21-056 |

---

### File 19: `streak.integration.test.ts` (97 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | OK (single-user, school-scoped inserts) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 2 | `import { db, eq, sql } from '@reading-advantage/db'` — raw Drizzle client. Same architecture deviation as file 18. The `updateStreakForProfile` function only reads/writes by `profileId`, which is a direct PK lookup — school scoping is less critical here because the profile PK is globally unique. | Info | F-SA-B21-057 |
| 50–66 | Test 1: starts streak at 1 when `lastActiveAt` is null. Verifies both return value and persisted state. Good. | OK | — |
| 68–77 | Test 2: 50 XP milestone at 7-day streak. Good boundary test. | OK | — |
| 79–90 | Test 3: streak resets on 2+ day gap. Verifies the reset-to-1 behaviour. | OK | — |
| 92–96 | Test 4: throws for non-existent profile. The error message is the `profileId` string — testing the exact message `"/GamificationProfile not found/"` ties the test to the exact error string. A minor refactor of the error message breaks this test. | Low | F-SA-B21-058 |
| 44 | `describe('updateStreakForProfile (integration)')` — only tests the `updateStreakForProfile` function, not the pure `updateStreak` function. The pure function has its own unit tests (file 20). Good separation. | OK | — |
| All | Missing: test for streak increment across a month boundary, DST boundary, or timezone edge case. The `isSameDay` and `isYesterday` functions use local timezone — tests use fixed UTC dates, which is correct for the test fixture but may not match production server TZ. | Info | F-SA-B21-059 |

---

### File 20: `streak.test.ts` (90 lines)

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A (pure function) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 6–10 | Test 1: `lastActiveAt: null` → streak=1. Correct. | OK | — |
| 12–19 | Test 2: yesterday's activity → increment. Correct. | OK | — |
| 21–28 | Test 3: same-day activity → streak unchanged. Correct. | OK | — |
| 30–37 | Test 4: 2+ day gap → reset to 1. Correct. | OK | — |
| 39–47 | Test 5: verifies `lastActiveAt` is updated to `currentTime`. This also confirms the streak is unchanged (yesterday → same day). | OK | — |
| 49–58 | Test 6: same-day activity with different hour — updates time but not streak. Edge case covered. | OK | — |
| 61–89 | `getStreakMilestoneBonus` tests cover: below-7, exactly-7, between-7-and-30, exactly-30, above-30. All boundary values covered. | OK | — |
| All | 14 `it` blocks across 2 describe groups. Every `updateStreak` behaviour is tested. Clean. | OK | — |

---

## Summary of Findings

| ID | File | Line(s) | Severity | Title |
|----|------|---------|----------|-------|
| F-SA-B21-001 | phase-4-process-env-cast.test.ts | 34–36, 87–88 | Info | Shared mutable state in module scope |
| F-SA-B21-002 | phase-4-process-env-cast.test.ts | 59–72 | Low | PHASE_4_FILES tuple unused for test generation |
| F-SA-B21-003 | phase-6-misc-cleanup.test.ts | 99–104 | Info | Integration test file may be deleted during fix |
| F-SA-B21-004 | phase-6-misc-cleanup.test.ts | 148–156 | Low | General error TS regex could match false positives |
| F-SA-B21-005 | phase-6-misc-cleanup.test.ts | 238–258 | Info | Long error message risks CI truncation |
| F-SA-B21-006 | phase-7-check-types-script.test.ts | 92–102 | Info | NO_OP_SCRIPT_VALUES could include tsc --version / tsc -b |
| F-SA-B21-007 | phase-7-check-types-script.test.ts | 124–135 | Low | corepack pnpm may not be available in some Docker images |
| F-SA-B21-008 | phase-7-check-types-script.test.ts | 183–206 | Info | Redundant readFileSync + JSON.parse |
| F-SA-B21-009 | phase-7-check-types-script.test.ts | 229 | Low | Unnecessary camelCase script key fallback |
| F-SA-B21-010 | phase-7-check-types-script.test.ts | 301–327 | Info | Redundant assertion inside if branch |
| F-SA-B21-011 | phase-8-ignore-build-errors.test.ts | 99–101 | Info | Brittle hardcoded comment string anchors |
| F-SA-B21-012 | phase-8-ignore-build-errors.test.ts | 107–114 | Low | Bullet array sensitive to cosmetic rewording |
| F-SA-B21-013 | phase-8-ignore-build-errors.test.ts | 129–130 | Low | Shared mutable state from nested beforeAll |
| F-SA-B21-014 | phase-8-ignore-build-errors.test.ts | 162–183 | Info | Full file content in error message may be very long |
| F-SA-B21-015 | ai-images.ts | 3–11 | Low | API keys exposed through config object |
| F-SA-B21-016 | ai.ts | 8 | Info | hashSecret exposed through config object |
| F-SA-B21-017 | recommendations.ts | 7 | **Medium** | Module-level in-memory cache not suitable for serverless |
| F-SA-B21-018 | recommendations.ts | 20–23 | Low | Test utility exported from production code |
| F-SA-B21-019 | content-parsers.test.ts | 45–74 | Low | Material quantity parsing limited to known English patterns |
| F-SA-B21-020 | content-parsers.test.ts | 77–116 | Info | Procedure parsing not tested with leading whitespace |
| F-SA-B21-021 | content-parsers.test.ts | 118–151 | Info | Markdown section parsing not tested for h4+ |
| F-SA-B21-022 | content-parsers.test.ts | 153–181 | Info | extractVocabulary not tested for case-insensitive header |
| F-SA-B21-023 | content-parsers.ts | 35–80 | Info | Section parser does not handle h4+ or alternative heading syntax |
| F-SA-B21-024 | content-parsers.ts | 94 | Low | Vocabulary regex hardcoded to Thai language |
| F-SA-B21-025 | content-parsers.ts | 116–131 | Info | Material quantity patterns hardcoded to English |
| F-SA-B21-026 | env.test.ts | 30 | Info | Test files excluded from NEXT_PUBLIC_DEV_AUTH scan |
| F-SA-B21-027 | env.test.ts | 48–67 | Low | .env.example coverage test checks name presence, not schema definition |
| F-SA-B21-028 | env.test.ts | 64 | Low | Empty .env.example produces silent pass |
| F-SA-B21-029 | env.ts | 13–51 | **Medium** | Most env vars optional — missing critical vars not caught at boot |
| F-SA-B21-030 | env.ts | 16 | Low | Invalid default DATABASE_URL gives confusing error |
| F-SA-B21-031 | env.ts | 61 | Info | Hard throw on validation failure at import time |
| F-SA-B21-032 | env.ts | 86–89 | Info | parseBoolean only accepts 'true' — '1'/'yes'/'TRUE' are false |
| F-SA-B21-033 | env.ts | 92–105 | Info | Legacy AI_RECOMMENDER_MODEL fallback adds complexity |
| F-SA-B21-034 | env.ts | 102 | **High** | Hardcoded fallback for AI_RECOMMENDER_HASH_SECRET bypasses the .refine length check |
| F-SA-B21-035 | from-zod.ts | 1–250 | **High** | 250-line business-logic module with zero tests |
| F-SA-B21-036 | from-zod.ts | 67 | Info | HUMANIZE_REGEX does not handle acronyms or consecutive capitals |
| F-SA-B21-037 | from-zod.ts | 78–125 | Info | unwrapType does not handle ZodReadonly, ZodBranded, ZodLazy |
| F-SA-B21-038 | from-zod.ts | 127–145 | Low | ZodArray always maps to 'select' — wrong for array-of-objects |
| F-SA-B21-039 | from-zod.ts | 166–184 | **Medium** | Access to Zod internal _def.checks is fragile across versions |
| F-SA-B21-040 | badges.constants.ts | 13–18 | Low | icon field has no type constraint; typo compiles fine |
| F-SA-B21-041 | badges.integration.test.ts | 26–40 | Info | Raw SQL DELETE for users instead of Drizzle ORM pattern |
| F-SA-B21-042 | badges.integration.test.ts | 219–228 | Info | Achievements query in dedup test not scoped by schoolId |
| F-SA-B21-043 | badges.integration.test.ts | 403–410 | Info | BILINGUAL_SCHOLAR deferral not documented via it.todo |
| F-SA-B21-044 | badges.integration.test.ts | All | Info | Missing multi-tenant isolation test |
| F-SA-B21-045 | badges.ts | 18–29 | **Medium** | countCompletedLessons queries scienceLessonCompletions without schoolId |
| F-SA-B21-046 | badges.ts | 35–54 | **Medium** | checkPerfectScore queries scienceAttempts without schoolId |
| F-SA-B21-047 | badges.ts | 56–90 | **Medium** | checkUnitChampion queries FLAT tables without schoolId |
| F-SA-B21-048 | badges.ts | 96–112 | **Medium** | checkLabPartner queries FLAT tables without schoolId |
| F-SA-B21-049 | badges.ts | 118–134 | **Medium** | checkStreakWarrior / checkDedicatedLearner query gamificationProfiles without schoolId |
| F-SA-B21-050 | badges.ts | 136–147 | **Medium** | checkQuizMaster queries scienceAttempts without schoolId |
| F-SA-B21-051 | badges.ts | 149–170 | **Medium** | checkFastLearner queries scienceAttempts without schoolId |
| F-SA-B21-052 | badges.ts | 172–183 | Info | Checker function signature lacks schoolId parameter |
| F-SA-B21-053 | badges.ts | 199–244 | **Medium** | Achievements dedup read (line 209) not scoped by schoolId |
| F-SA-B21-054 | badges.ts | 217–225 | **Medium** | Missing gamification profile causes silent badge denial |
| F-SA-B21-055 | badges.ts | 227–242 | **Medium** | Achievements INSERT schoolId mismatch with unscoped dedup read |
| F-SA-B21-056 | badges.ts | All | **High** | Architecture deviation: uses raw db instead of TenantDB wrapper for FLAT tables |
| F-SA-B21-057 | streak.integration.test.ts | 2 | Info | Raw Drizzle client used instead of TenantDB (same deviation as badges.ts) |
| F-SA-B21-058 | streak.integration.test.ts | 92–96 | Low | Error message assertion is brittle |
| F-SA-B21-059 | streak.integration.test.ts | All | Info | Missing timezone/DST/month-boundary edge case tests |
| F-SA-B21-060 | env.ts | 47 | Info | NEXT_PUBLIC prefix on ENABLE_MASTERY_PIPELINE exposes internal setting to client |

---

## Severity Distribution

| Severity | Count | IDs |
|----------|-------|-----|
| **High** | 4 | F-SA-B21-034 (hash secret fallback), F-SA-B21-035 (no tests for from-zod.ts), F-SA-B21-056 (arch deviation: raw db not TenantDB) |
| **Medium** | 12 | F-SA-B21-017 (serverless in-memory cache), F-SA-B21-029 (missing critical env validation), F-SA-B21-039 (fragile Zod internal access), F-SA-B21-045, F-SA-B21-046, F-SA-B21-047, F-SA-B21-048, F-SA-B21-049, F-SA-B21-050, F-SA-B21-051 (badge tenancy gaps), F-SA-B21-053, F-SA-B21-054, F-SA-B21-055 |
| **Low** | 14 | F-SA-B21-002, F-SA-B21-004, F-SA-B21-007, F-SA-B21-009, F-SA-B21-012, F-SA-B21-013, F-SA-B21-015, F-SA-B21-018, F-SA-B21-019, F-SA-B21-024, F-SA-B21-027, F-SA-B21-028, F-SA-B21-030, F-SA-B21-038, F-SA-B21-040, F-SA-B21-058 |
| **Info** | 24 | F-SA-B21-001, F-SA-B21-003, F-SA-B21-005, F-SA-B21-006, F-SA-B21-008, F-SA-B21-010, F-SA-B21-011, F-SA-B21-014, F-SA-B21-016, F-SA-B21-020, F-SA-B21-021, F-SA-B21-022, F-SA-B21-023, F-SA-B21-025, F-SA-B21-026, F-SA-B21-031, F-SA-B21-032, F-SA-B21-033, F-SA-B21-036, F-SA-B21-037, F-SA-B21-041, F-SA-B21-042, F-SA-B21-043, F-SA-B21-044, F-SA-B21-052, F-SA-B21-057, F-SA-B21-059, F-SA-B21-060 |

Total: 55 findings (4 High, 12 Medium, 14 Low, 25 Info)

---

## Limitations

1. **Static analysis only.** Findings are based on code reading, not on dynamic analysis, type-checking, or test execution.
2. **No cross-package call graph.** The report flags that `badges.ts` uses raw `db` instead of `createTenantDB`, but does not verify whether the TenantDB wrapper is available to the science-advantage `lib/` code (the wrapper lives in `packages/domain` and may not be importable from the app without additional dependencies).
3. **No Drizzle schema validation.** The report trusts that the schema definitions in `packages/db/src/schema/science.ts` match the database state. Schema-drift is not assessed.
4. **`from-zod.ts` black-box assessment.** Without tests, some correctness observations are speculative.
5. **No assessment of runtime behaviour of `recommendations.ts` cache.** The in-memory `Map` may be acceptable if science-advantage runs on long-lived server processes (not serverless).
6. **CI gate tests not executed.** The `phase-*` files are red-phase assertions expected to fail; this review only evaluates their structure and correctness as tests, not their green-phase validity.
7. **No acceptance or closeout claims.** This report is a line review only. It does not assert that any file or track is complete, ready for closeout, or meets its acceptance criteria.

---

## Notable Patterns (Good)

1. **CI gate tests are well-engineered** — expensive `tsc`/`pnpm` invocations are cached via `beforeAll`, each test is self-documenting with actionable error messages, and every file has a "sanity check" guard against silent shared-state failures.

2. **Env validation pattern** (`env.ts` + `env.test.ts`) is strong — Zod-schema validation at boot, no `process.env` reads outside `env.ts`, `.env.example` coverage guard, and a security scan for `NEXT_PUBLIC_DEV_AUTH` leaks.

3. **Badge integration tests** are comprehensive — every badge type is tested for unlock, non-unlock, and dedup. Fixture setup/teardown is clean with `schoolId` scoping in all inserts.

4. **Pure function test quality** (`streak.test.ts`, `content-parsers.test.ts`) is high — edge cases covered, boundary values tested, test descriptions clear.

5. **AGENTS.md JSDoc compliance** is strong across all reviewed files — every exported function has a description and `@param`/`@returns` tags.

6. **`enums.ts`** correctly replaces Prisma-generated enums with TypeScript `satisfies Record<...>` pattern. No runtime dependency, type-safe.
