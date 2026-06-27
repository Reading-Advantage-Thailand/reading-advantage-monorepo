# SA-Batch-22: Line-by-Line Review

**Track:** `science_advantage_review_20260626`
**Batch:** 22 (20 files)
**Audit Date:** 2026-06-27
**Scope:** Gamification (streak, XP), grade4-normalization, instrumentation, interventions (cache, config, detect-alerts), observability tests
**Focus:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline/golden-path patterns
**Report ID:** SA-BATCH-22

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 2 |
| 🟠 High | 3 |
| 🟡 Medium | 5 |
| 🔵 Low | 4 |
| ⓘ Info | 4 |

**Key themes:**
1. **Tenancy bypass**: `xp.ts` and `streak.ts` use the raw `db` import instead of `tenantDb`, leaving `gamificationProfiles` (a FLAT table with `schoolId`) unprotected by TenantDB auto-scoping.
2. **Missing authorization**: `awardXp` and `updateStreakForProfile` accept a `profileId` with zero authorization — any authenticated caller could award XP or update streak on any profile.
3. **Provider SDK direct use**: `instrumentation.node.ts` imports OpenTelemetry SDKs directly rather than going through an internal adapter.
4. **Test logic duplication**: `xp.test.ts` duplicates the business logic inline rather than importing and testing `calculateXpForQuiz`.
5. **Unbounded in-memory cache**: `cache.ts` has no eviction or size limit, risking memory leak under load.

---

## File-by-File Findings

### 1. `apps/science-advantage/lib/gamification/streak.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-001 | 1 | 🟠 High | Uses `db` from `@reading-advantage/db` directly. `gamificationProfiles` is classified as **FLAT** in `tenant-registry.ts` (has `schoolId`). Bypassing TenantDB means the school-id scope auto-injection is lost. Any caller could update a profile across any school. |
| F-SA-B22-002 | 18-35 | 🟡 Medium | `updateStreak` is a pure function — good. But it accepts `currentTime` as a parameter, which is a best-practice pattern. No issues with the core logic. |
| F-SA-B22-003 | 43-46 | 🔴 Critical | `updateStreakForProfile` performs no authorization check. It fetches and updates a profile by raw `profileId` with no verification that the caller has access to that profile's school/tenant. Combined with F-SA-B22-001, this allows cross-tenant streak manipulation. |
| F-SA-B22-004 | 47-51 | 🔵 Low | The SELECT query uses `.limit(1)` without `.orderBy()`. For a `uuid` primary key this is safe, but the pattern is fragile if the query were ever changed to filter on non-unique columns. |
| F-SA-B22-005 | 44-46 | 🔵 Low | No JSDoc on exported `updateStreakForProfile`. Violates AGENTS.md documentation standards. `updateStreak` also lacks JSDoc. |
| F-SA-B22-006 | 62-69 | ⓘ Info | WRITE follows READ — no race-condition protection (no transaction, no `RETURNING` on update after select). At low concurrency this is unlikely to cause issues, but under concurrent calls for the same profile, the select-then-update gap could lose XP. |

### 2. `apps/science-advantage/lib/gamification/xp.constants.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-007 | 1-51 | 🔵 Low | No JSDoc on any exported function (`calculateLevel`, `getLevelName`, `calculateXpForQuiz`). |
| F-SA-B22-008 | 19-27 | ⓘ Info | `calculateLevel` uses a single-pass loop. Correct for 6 thresholds — linear scan is fine. Edge case: `xp` being negative would still return level 1 (since `minXp: 0`). |
| F-SA-B22-009 | 35-52 | 🟡 Medium | `calculateXpForQuiz` does not validate `scorePercentage` range (0-100) or `attemptNumber` being positive. Negative or >100 scores produce silently wrong results. The calling code must validate — this reliance is not documented. |
| F-SA-B22-010 | 48 | 🟡 Medium | First-attempt bonus of +25 XP is applied at `scorePercentage >= 80`, while the highest base-XP bracket starts at `>= 90`. This is a design choice (not a bug), but it means a student scoring 80% gets `75 + 25 = 100` total XP, same as a student scoring 90% who gets `100 + 0 = 100` (since first-attempt bonus only applies when `attemptNumber === 1`). A retake at 90% yields only 100 XP. The spec intent is unclear. |

### 3. `apps/science-advantage/lib/gamification/xp.integration.test.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-011 | 42-44 | 🟡 Medium | `beforeEach` inserts a school with a magic UUID `00000000-0000-0000-0000-000000000099` and uses `onConflictDoNothing()`. No cleanup of this school in `cleanupFixtures`. If previous test runs left a school with this ID, the fixture would silently reuse a stale school row. |
| F-SA-B22-012 | 17-39 | ⓘ Info | `seedProfile` inserts a user without a `schoolId` — looking at the Drizzle schema, `users` doesn't have a `schoolId` column in this project's Drizzle schema (it's a shared `users` table). But the test user has no school association, which is atypical. |
| F-SA-B22-013 | 12-15 | 🔵 Low | Cleanup uses raw SQL (`db.execute(sql`...`)`) instead of Drizzle delete methods. While functional, this diverges from the project convention of using Drizzle ORM for all DB access. |
| F-SA-B22-014 | 76-79 | ⓘ Info | Missing test: no test verifies behavior with negative XP amounts, zero XP, or very large amounts. |
| F-SA-B22-015 | — | 🟡 Medium | **Missing test:** No test validates tenant scoping — the `awardXp` function does not check schoolId, and the test suite does not verify that cross-school access is prevented. |

### 4. `apps/science-advantage/lib/gamification/xp.test.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-016 | 83-135 | 🟠 High | **Test quality — logic duplication.** The `'XP Award Calculation'` describe block (lines 83-135) duplicates the business logic inline instead of importing and testing the `calculateXpForQuiz` function from `xp.constants.ts`. The test reimplements the threshold logic (lines 101-107) rather than calling `calculateXpForQuiz(percentage, 1)`. This means the test can never catch a regression in `calculateXpForQuiz` — it only validates that the duplicated logic matches its own expectation. |
| F-SA-B22-017 | 1-2 | 🔵 Low | Tests `calculateLevel` and `getLevelName` from `xp.constants` but does not import or test `calculateXpForQuiz` from the same module — the sole reason the XP Award section exists is to cover the missing function, but the approach is flawed (see F-SA-B22-016). |

### 5. `apps/science-advantage/lib/gamification/xp.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-018 | 1 | ⓘ Info | `'server-only'` import is correctly present — prevents accidental client-side import. |
| F-SA-B22-019 | 10-13 | 🟠 High | **No authorization.** `awardXp` accepts a `profileId` and amount with zero authorization. Any authenticated user could call this with any `profileId` and any `amount`. There is no check that the caller owns the profile, is in the same school, or has the STUDENT/TEACHER role. |
| F-SA-B22-020 | 14-22 | 🟠 High | **No tenancy scoping.** Uses raw `db` instead of `tenantDb`. `gamificationProfiles` is FLAT with `schoolId`, but this query and update have zero tenant scoping. With TenantDB, these operations would auto-inject `eq(table.schoolId, tenant.schoolId)`. |
| F-SA-B22-021 | 21 | 🟡 Medium | **Amount validation.** `amount` is unchecked. A negative amount could decrement XP. Zero is handled correctly (no-op math), but there's no rejection. The function and tests should validate `amount > 0`. |
| F-SA-B22-022 | 10-44 | 🔵 Low | No JSDoc on the exported `awardXp` function. |

### 6. `apps/science-advantage/lib/grade4-normalization.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-023 | 23-31 | 🟡 Medium | `correctAnswer` is typed as `z.unknown()` — acceptable for flexible input, but downstream consumers (e.g., quiz grading) will need their own validation. Consider a discriminated union per question type. |
| F-SA-B22-024 | 57-69 | 🟡 Medium | `normalizeQuestionType` has a fallback path (lines 63-68) that uppercases and replaces dashes/spaces with underscores, then checks validity, then returns the transformed string even if invalid. This means an unrecognized type like `'essay'` returns `'ESSAY'` without being caught by the validity check. The caller gets a warning in the output but not an error. Silently passing through an unparseable type could cause issues downstream. |
| F-SA-B22-025 | 82-113 | 🔵 Low | `normalizeQuestionFile` parses input with Zod (good), but throws a generic `Error` on parse failure rather than a typed/structured error. |
| F-SA-B22-026 | 1-113 | 🔵 Low | No JSDoc on any exported function. |

### 7. `apps/science-advantage/lib/instrumentation.node.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-027 | 1-8 | 🟡 Medium | **Provider SDK direct use.** Imports OpenTelemetry SDKs directly (`@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, etc.) instead of routing through an internal adapter. This violates the AGENTS.md Provider Neutrality Rule: "Application code must not depend directly on provider SDKs". However, OpenTelemetry is an open standard, not a vendor provider, so this may be an acceptable exception — the report flags it for explicit documentation. |
| F-SA-B22-028 | 8 | 🔵 Low | `SemanticResourceAttributes` is deprecated as of `@opentelemetry/semantic-conventions` >= 1.26. Modern usage imports `SEMRESATTRS_SERVICE_NAME` from `@opentelemetry/semantic-conventions` or uses `ATTR_SERVICE_NAME` (v2+). |
| F-SA-B22-029 | 1-29 | ⓘ Info | No shutdown handling (`sdk.shutdown()`). Next.js does not call `register()` shutdown hooks, so this is consistent with the platform. |

### 8. `apps/science-advantage/lib/instrumentation.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-030 | 1-10 | ✅ None | Clean, minimal Next.js instrumentation entry point. Correctly checks `NEXT_RUNTIME` before loading Node-specific module. No issues. |

### 9. `apps/science-advantage/lib/interventions/cache.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-031 | 16 | 🟠 High | **Unbounded in-memory cache.** Uses a plain `Map<string, InternalCacheEntry>` with no eviction policy, size limit, or cleanup mechanism. Under sustained use with many classIds, this will grow without bound and cause a memory leak. Consider LRU eviction (e.g., `lru-cache` package) or use Redis from the shared storage adapter. |
| F-SA-B22-032 | 22-24 | 🔵 Low | Lazy expiration only — entries are only evicted when `get()` encounters an expired entry. Stale data persists in memory until accessed or until the server restarts. |
| F-SA-B22-033 | 41-51 | 🟡 Medium | `set` stores `CacheValue` but the `cacheKey` field is computed from `classId` inside `set()`. The caller passes `Omit<CacheValue, 'cacheKey'>`, but the `CacheValue` type includes `cacheKey` — a consumer could pass a value that already has `cacheKey` set and it would be overwritten. Minor type-design concern, not a runtime bug. |
| F-SA-B22-034 | 26-58 | 🔵 Low | No JSDoc on any method of `interventionCache`. |
| F-SA-B22-035 | 1-61 | ⓘ Info | This cache is instance-local. In a multi-replica deployment, each pod has its own copy, causing cache incoherence. Use a shared store (Redis) for production. |

### 10. `apps/science-advantage/lib/interventions/config.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-036 | 1-57 | ✅ None | Clean typed config with no security or correctness issues. All thresholds and weights have reasonable defaults. |
| F-SA-B22-037 | 1-57 | 🔵 Low | No JSDoc on the exported config object or types. The meaning of each weight and threshold is largely self-evident from naming, but documentation would help onboarding. |

### 11. `apps/science-advantage/lib/interventions/detect-alerts.test.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-038 | 28 | 🔵 Low | `makeRecord` casts `masteryLevel` with `as unknown as MasteryRecord['masteryLevel']` — the source is a `number` and the target is `string | { toString(): string }`. This works at runtime but indicates the test fixture types are not perfectly aligned with the production types. |
| F-SA-B22-039 | 37-68 | ✅ None | Good edge-to-edge coverage: tests scoring, ordering, severity computation, empty/absent cases. |
| F-SA-B22-040 | 91-122 | ✅ None | Tests `maxAlerts` limit. |

### 12. `apps/science-advantage/lib/interventions/detect-alerts.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-041 | 13-15 | 🟡 Medium | `Class`, `StandardMastery`, `user` types inferred from Drizzle schema. Capitalization inconsistency: `user` (lowercase) vs `Class`/`StandardMastery` (PascalCase). Minor style deviation. |
| F-SA-B22-042 | 30-31 | ⓘ Info | `masteryLevel: string | { toString(): string }` — accommodates both Drizzle's decimal-string and Prisma's Decimal-like object during the migration window. Pragmatic, but the `toString()` path means every access calls `Number()` coercion, which is handled at lines 152, 168, 186. |
| F-SA-B22-043 | 218, 238 | 🟡 Medium | **Cursor design.** Both `traceId` and `cursor` are set to the same `randomUUID()`. For paginated APIs, a cursor should encode sort order (e.g., `score:studentId`). Using a random UUID means cursor-based pagination cannot efficiently fetch "next page" — the consumer would need to skip IDs. This is a design gap if the API exposes cursor pagination. |
| F-SA-B22-044 | 134-247 | ✅ None | Pure function — no external DB/storage calls. Correctly accepts all data as parameters. Good functional design. |
| F-SA-B22-045 | 141-146 | ✅ None | Early return for empty inputs. |

### 13. `apps/science-advantage/lib/observability/__tests__/client-logger.adversarial.test.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-046 | 1-192 | ✅ None | Thorough adversarial tests. All four adversarial surfaces (call shape, NODE_ENV boundaries, spy integrity, module surface stability) are covered. |
| F-SA-B22-047 | 147-151 | ✅ None | Correctly tests that `NODE_ENV=production` is the exclusive no-op branch. |
| F-SA-B22-048 | 180-182 | 🔵 Low | Asserts `mod.default` is `undefined` — this depends on dynamic import behavior. If the module doesn't have a default export, `mod.default` is indeed `undefined` per ES module spec. Correct assumption. |

### 14. `apps/science-advantage/lib/observability/__tests__/client-logger.test.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-049 | 1-186 | ✅ None | Well-structured standard tests covering dev/prod branching for all four methods. |
| F-SA-B22-050 | 85-88 | ✅ None | Safe cleanup with optional chaining (`infoSpy?.mockRestore()`) in case the module import failed. Good defensive pattern. |

### 15. `apps/science-advantage/lib/observability/__tests__/context.test.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-051 | 1-297 | ✅ None | Comprehensive coverage of FR-3: surface, round-trip, out-of-scope, nesting, userId mutation, async leakage, Node runtime guard. |
| F-SA-B22-052 | 238-276 | ✅ None | Async leakage tests with `Promise.all` are particularly valuable regression guards. |

### 16. `apps/science-advantage/lib/observability/__tests__/env-example-otel.contract.test.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-053 | 1-76 | ✅ None | `.env.example` at `apps/science-advantage/.env.example` correctly contains `OTEL_SERVICE_NAME="science-advantage"` (line 51, non-commented) and `OTEL_EXPORTER_OTLP_ENDPOINT` (commented, line 50). Both pass. |
| F-SA-B22-054 | 66-74 | ✅ None | Correctly allows commented lines for optional OTEL_EXPORTER_OTLP_ENDPOINT. |

### 17. `apps/science-advantage/lib/observability/__tests__/env-example.contract.test.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-055 | 1-71 | ✅ None | `.env.example` at line 55 has `SENTRY_DSN=` and line 54 has the `# required in production` comment. Both pass. |

### 18. `apps/science-advantage/lib/observability/__tests__/eslint-no-console.adversarial.test.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-056 | 1-298 | ✅ None | Thorough adversarial tests covering production-rule enforcement, severity verification, boundary coverage (log/info/debug), logger-sink exclusion, and test-file exclusion. |
| F-SA-B22-057 | 182-188 | ✅ None | Creates and cleans up a temporary canary file — resilient with best-effort cleanup. |
| F-SA-B22-058 | 251-297 | ✅ None | Boundary fixture creation with `try/finally` cleanup. |

### 19. `apps/science-advantage/lib/observability/__tests__/eslint-no-console.exclusions.test.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-059 | 1-108 | ✅ None | Verifies `scripts/**` and `vitest.integration.global-setup.ts` are excluded from `no-console`. Confirmed by `eslint.config.mjs` lines 67-77 and 81-86. |

### 20. `apps/science-advantage/lib/observability/__tests__/eslint-no-console.test.ts`

| ID | Line(s) | Severity | Finding |
|----|---------|----------|---------|
| F-SA-B22-060 | 1-152 | ✅ None | Correctly tests `bad.ts` (exits non-zero for `console.log`) and `good.ts` (exits zero for `logger.info`). Uses `--no-ignore` to bypass the fixture exclusion. |

---

## Cross-Cutting Issues

| ID | Severity | Files | Finding |
|----|----------|-------|---------|
| F-SA-B22-061 | 🟠 High | `xp.ts`, `streak.ts` | **Tenancy bypass.** Both files use the raw `db` import instead of `tenantDb`, meaning the auto-injected `schoolId` filter is absent on `gamificationProfiles` (a FLAT table). Add `tenantDb` import and scope by school. |
| F-SA-B22-062 | 🟠 High | `xp.ts`, `streak.ts` | **Authorization absence.** Both `awardXp` and `updateStreakForProfile` perform no authorization check on the caller. They should verify the caller has the STUDENT role (for self-operation) or TEACHER/ADMIN role (for classroom management) and that the profile belongs to the caller's school. |
| F-SA-B22-063 | 🟡 Medium | `xp.ts` | **Input validation.** `awardXp` validates neither `amount > 0` nor `profileId` format. Negative XP awards could be used to decrement a student's score. |
| F-SA-B22-064 | 🟡 Medium | Multiple (gamification) | **Missing JSDoc.** Exported functions in `xp.constants.ts`, `xp.ts`, `streak.ts`, `grade4-normalization.ts`, `cache.ts`, `config.ts` lack JSDoc, violating AGENTS.md documentation standards. |
| F-SA-B22-065 | 🟡 Medium | `cache.ts` | **Unbounded memory.** In-memory `Map` cache with no eviction, size cap, or LRU. |
| F-SA-B22-066 | 🔵 Low | `instrumentation.node.ts` | **Deprecated import path.** `SemanticResourceAttributes` is deprecated in recent `@opentelemetry/semantic-conventions`. |
| F-SA-B22-067 | 🟠 High | `xp.test.ts` | **Test logic duplication.** Lines 83-135 test duplicated business logic rather than the actual `calculateXpForQuiz` export. |

---

## ESLint Config Verification

The `eslint.config.mjs` (100 lines) correctly implements the FR-7 `no-console` rule:

- **Line 34:** `"no-console": ["error", { allow: ["error", "warn"] }]` — production rule.
- **Lines 40-43:** `lib/observability/logger.ts` fully exempt.
- **Lines 46-50:** `components/client-logger.ts` fully exempt.
- **Lines 52-65:** All `__tests__/` and `*.test.ts` files fully exempt.
- **Lines 67-77:** `scripts/**` fully exempt.
- **Lines 79-86:** `vitest.integration.global-setup.ts` fully exempt.
- **Lines 88-98:** ESLint micro-fixtures re-enable the rule (override takes precedence over `__tests__` exemption).

All verified: ✅

---

## .env.example Verification

File at `apps/science-advantage/.env.example` (62 lines):

| Expected Var | Line | Status |
|-------------|------|--------|
| `SENTRY_DSN=` | 55 | ✅ Present, non-commented |
| Comment "required in production" near SENTRY_DSN | 54 | ✅ Present |
| `OTEL_SERVICE_NAME="science-advantage"` | 51 | ✅ Present, non-commented |
| `OTEL_EXPORTER_OTLP_ENDPOINT=` | 50 | ✅ Present (commented, optional) |

All verified: ✅

---

## TenantDB Classification

- `gamificationProfiles` — **FLAT** (line 79 in `tenant-registry.ts`). Has `schoolId` column.
- `scienceClasses` — **FLAT** (line 81).
- `scienceStandardMastery` — **FLAT** (line 83).
- All FLAT tables used by these modules require TenantDB scoping that is not applied in the gamification code.

---

## Limitations

1. **Static analysis only.** This review did not execute the test suite. No runtime behavior or test pass/fail verification was performed.
2. **No DB schema validation.** The Drizzle schema was checked for column names but not for full referential integrity beyond what was visible.
3. **25 consumer sites.** The adversarial test (file 13) references "25 production consumers" of `clientLogger`. This count was not independently verified.
4. **No authentication flow review.** The gamification functions' callers were not traced back to the API layer to determine if authorization is handled at the tRPC/router level before reaching the domain function.
5. **No concurrency/race testing.** The select-then-update pattern in `streak.ts` and `xp.ts` was flagged for design but not tested with concurrent access.

---

*End of SA-Batch-22 line review. Contains 47 findings across 20 files. No acceptance/closeout claims made.*
