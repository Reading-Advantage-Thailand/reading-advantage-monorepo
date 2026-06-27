# Line Review: sa-batch-25

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-25 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns
- **File types**: Mastery service (2), test infrastructure (5), utility production (6), utility tests (4), validation schemas (3)

---

## Files Reviewed

1.  `apps/science-advantage/lib/services/mastery/standard-mastery.integration.test.ts`
2.  `apps/science-advantage/lib/services/mastery/standard-mastery.ts`
3.  `apps/science-advantage/lib/test/resolve-test-database-url.test.ts`
4.  `apps/science-advantage/lib/test/resolve-test-database-url.ts`
5.  `apps/science-advantage/lib/test/run-drizzle-migrate.test.ts`
6.  `apps/science-advantage/lib/test/run-drizzle-migrate.ts`
7.  `apps/science-advantage/lib/test/server-only-mock.ts`
8.  `apps/science-advantage/lib/utils.ts`
9.  `apps/science-advantage/lib/utils/class-format.test.ts`
10. `apps/science-advantage/lib/utils/class-format.ts`
11. `apps/science-advantage/lib/utils/clipboard.test.ts`
12. `apps/science-advantage/lib/utils/clipboard.ts`
13. `apps/science-advantage/lib/utils/date.test.ts`
14. `apps/science-advantage/lib/utils/date.ts`
15. `apps/science-advantage/lib/utils/generateJoinCode.integration.test.ts`
16. `apps/science-advantage/lib/utils/generateJoinCode.ts`
17. `apps/science-advantage/lib/utils/join-code-format.ts`
18. `apps/science-advantage/lib/validations/api-helpers.test.ts`
19. `apps/science-advantage/lib/validations/api-helpers.ts`
20. `apps/science-advantage/lib/validations/assignments.ts`

---

## File-by-File Findings

### File 1: `lib/services/mastery/standard-mastery.integration.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Moderate concern — test title misstates transaction behavior; student created without `schoolId` |
| **Security/tenancy** | Minor — student rows lack `schoolId`; tenancy assertions are implicit |
| **AGENTS.md compliance** | OK — integration test directly imports `db` which is standard pattern |
| **Test quality** | Good — covers upsert, unique constraint, clamping, evidence accumulation, cascades, ordering, concurrency |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 27–41 | `createStudent()` inserts a user with **no `schoolId`**. The `users.schoolId` column is nullable, but the corresponding mastery rows are inserted with `TEST_SCHOOL_ID`. This means student tenancy is unenforced in the test — the student might belong to a different school than the mastery data. Real code should derive the student's school from the auth context. | medium | F-SA-B25-001 |
| 73 | `describe` block title: `'standardMastery persistence (integration)'` — fine. | OK | — |
| 86–93 | `recordStandardMastery` is called with `db` directly (not a transaction). Uses `onConflictDoUpdate` which is atomic per statement, so the write is safe. | OK | — |
| 256 | Test title says **"Serializes concurrent writers via transaction"** but `recordStandardMastery` does NOT use a DB transaction (`db.transaction(...)`). It relies on `onConflictDoUpdate` which is atomic per statement, but "via transaction" is misleading — the function does not wrap the upsert in a transaction boundary. | medium | F-SA-B25-002 |
| 256–274 | `Promise.all(...)` fires 5 concurrent upserts. This tests the atomic upsert behavior, which is valid. The test body proves the point even though the title is inaccurate. | low | F-SA-B25-003 |
| 62–71 | `findOneMastery` uses raw `sql` template for the WHERE clause with interpolated bind params. This works correctly with postgres-js. | OK | — |
| 100–132 | Unique-constraint test inserts directly with `db.insert(...)` bypassing `recordStandardMastery`. Correct approach for testing the DB constraint itself. | OK | — |

---

### File 2: `lib/services/mastery/standard-mastery.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — clean upsert with `onConflictDoUpdate`, proper clamping, NaN guards |
| **Security/tenancy** | OK — `schoolId` is part of the insert values; no auth/authorization layer present |
| **AGENTS.md compliance** | Moderate gap — uses TypeScript types (not Zod) for input/output; no `auth` or `authorize` |
| **Architecture** | Acceptable as a low-level query/command, but does not meet the `command()` wrapper ideal |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 4–12 | `StandardMasteryWriteInput` uses TypeScript types, not Zod schema. Per AGENTS.md: "Every backend operation must define input schema and output schema using Zod." This module is a backend function but skips Zod contracts. | medium | F-SA-B25-004 |
| 18–27 | `clampMasteryLevel`: NaN check at line 20 uses `Number.isNaN(numeric)` after `Number(value)` conversion. The intermediate `numeric` variable is redundant — `Number.isNaN(value)` would work for the NaN check, and `Math.min/Math.max` coerce to number anyway. Minor style. | info | — |
| 45–77 | `recordStandardMastery` has no auth requirement or authorization check. AGENTS.md requires: "Authentication requirement, Authorization policy." This function can be called by any code path without verifying caller permissions. | medium | F-SA-B25-005 |
| 45 | Accepts a generic `client` parameter typed as `typeof db`. Clean dependency-injection pattern for testability. | OK | — |
| 69–70 | `evidenceCount: sql\`...\`` increments existing value on conflict — correct for cumulative evidence tracking. | OK | — |
| 71 | `updatedAt: new Date()` sets server timestamp. Good. | OK | — |

---

### File 3: `lib/test/resolve-test-database-url.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — all cases covered |
| **Security/tenancy** | N/A (test utility) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — exhaustive edge-case coverage |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| All | Seven test cases cover: explicit override, `_test` suffix, already-ends-with-`_test`, trailing slash, missing `DATABASE_URL`, malformed URL, precedence. Clean. | OK | — |

---

### File 4: `lib/test/resolve-test-database-url.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | N/A (test utility) |
| **AGENTS.md compliance** | OK — JSDoc present, well-factored |
| **Architecture** | Golden-path example |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 12–35 | Clean resolution logic with three-tier fallback. Handles trailing-slash, malformed URL, missing env. | OK | — |
| 12–13 | Default param `env = process.env as ...` — the cast `as { DATABASE_URL?: string; TEST_DATABASE_URL?: string }` is a lie-of-the-type-system since `process.env` is `Record<string, string | undefined>`. This is a pragmatic shortcut found across the codebase. | info | — |

---

### File 5: `lib/test/run-drizzle-migrate.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | N/A (test utility) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — dependency-injection for `spawn`, all exit paths covered |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| All | Four tests: success, non-zero exit, signal kill, env preservation. Proper `beforeEach`/`afterEach` env isolation. | OK | — |

---

### File 6: `lib/test/run-drizzle-migrate.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK — JSDoc with `@param`, `@throws` |
| **Architecture** | Clean — injectable `spawn`, single responsibility |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 19–47 | Clean DI pattern. `env: { ...process.env, DATABASE_URL: databaseUrl }` safely merges env without mutation. Error messages include the URL for debugging. | OK | — |

---

### File 7: `lib/test/server-only-mock.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |
| **Test quality** | Acceptable |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1–4 | Empty-export mock for `server-only`. Standard pattern. However, vitest conventionally locates mocks in `__mocks__/` directories for auto-mocking with `vi.mock('server-only')`. This file requires explicit import in test setup. Verify that the vitest config or global setup references this path. If not, it's dead code. | low | F-SA-B25-006 |

---

### File 8: `lib/utils.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | Barrel re-export of `cn` from `@reading-advantage/utils`. Clean. | OK | — |

---

### File 9: `lib/utils/class-format.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | N/A (pure formatting) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — both locales covered, zero/plural edge cases |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| All | Three test cases for three exported functions. `"en"` and `"th"` locales both tested. Coverage includes: zero-count, singular/plural, Thai overrides. | OK | — |

---

### File 10: `lib/utils/class-format.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — but unreachable fallback path |
| **Security/tenancy** | N/A (pure formatting) |
| **AGENTS.md compliance** | OK |
| **Architecture** | Clean i18n pattern with locale resolver |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 5–14 | `STANDARDS_LABEL` typed as `Record<StandardsAlignment, Record<Locale, string>>`. TypeScript enforces exhaustive key coverage — all `StandardsAlignment` values must be present. Good design. | OK | — |
| 29 | `return STANDARDS_LABEL[alignment]?.[resolvedLocale] ?? alignment` — the `?? alignment` fallback is **dead code** because `Record<StandardsAlignment, ...>` ensures `STANDARDS_LABEL[alignment]` is never undefined at compile time. If a new `StandardsAlignment` value were added without updating the map, TypeScript would catch it. Consider removing `?.[resolvedLocale]` and the `??` to simplify. | low | F-SA-B25-007 |
| 37–40 | Zero-count handling returns a full-sentence string rather than the formatted number. This is a UX choice — consistent with the expected output. | OK | — |
| 50–62 | `formatGradeLevel` uses `Intl.NumberFormat` with `maximumFractionDigits: 0`. Grade levels are integers, so this is correct. | OK | — |

---

### File 11: `lib/utils/clipboard.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — stubs global navigator, covers three paths |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| All | Three tests: clipboard available (succeeds), clipboard throws (returns false), clipboard absent (returns false). Proper `vi.unstubAllGlobals()` + `vi.restoreAllMocks()` in `afterEach`. | OK | — |

---

### File 12: `lib/utils/clipboard.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | OK — deprecated `execCommand` fallback is standard |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | Moderate concern — imports a React component module from a `lib/utils` file |
| **Architecture** | Two concerns: logger dependency coupling, deprecated API fallback |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 1 | `import * as clientLogger from '@/components/client-logger'` — this creates a **hard dependency on a React component** from a `lib/utils/` module. Per AGENTS.md separation of concerns, `lib/utils` should be pure and not depend on UI component modules. The logger should be injected or imported from a shared logging package. | medium | F-SA-B25-008 |
| 13–24 | `document.execCommand('copy')` fallback is **deprecated** by all major browsers. While it still works, it may be removed in future browser versions. Consider using the Async Clipboard API exclusively (with a graceful fallback to `navigator.clipboard` which all modern browsers support). | low | F-SA-B25-009 |
| 26 | Catches `error` (typed as `unknown` implicitly). Error is passed to `clientLogger.error(...)` with `{ error: error }` syntax — this correctly preserves the error object. | OK | — |
| 4 | `typeof navigator !== "undefined" && navigator.clipboard?.writeText` — correct guard against SSR/Node.js environments. | OK | — |

---

### File 13: `lib/utils/date.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — fake timers, deterministic, covers invalid dates |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| All | Three tests: English relative time, Thai relative time, invalid date fallback (`"—"`). Uses `vi.useFakeTimers()` + `vi.setSystemTime()` for determinism. `afterAll` restores real timers. | OK | — |

---

### File 14: `lib/utils/date.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Minor — dead fallback branch after loop |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK |
| **Architecture** | Good — uses `Intl.RelativeTimeFormat` |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 39–43 | Loop: `if (absDiff >= milliseconds || unit === 'second')` — the `|| unit === 'second'` guarantees the loop always executes the body for the last iteration, making line 46 `return formatter.format(0, 'second')` **dead code**. The function can never reach line 46. Either remove line 46 or simplify the loop exit condition. | low | F-SA-B25-010 |
| 14–21 | `toDate()` helper handles `Date`, `string`, `number` inputs. Null return for invalid dates is properly checked at call site. | OK | — |
| 37 | `Intl.RelativeTimeFormat(locale, { numeric: 'auto' })` — `numeric: 'auto'` correctly produces "yesterday" instead of "1 day ago" in supported locales. | OK | — |

---

### File 15: `lib/utils/generateJoinCode.integration.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — collision retry logic is correctly tested |
| **Security/tenancy** | OK — test-only file, uses fixed test school ID |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — clever `Math.random` spy for collision simulation |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 22–25 | `cleanupFixtures()` deletes **all** rows from `scienceClasses` (no WHERE clause) and prefix-scoped users. In integration tests this is acceptable because the test DB is dedicated. If parallel test execution is ever introduced, this will cause cross-test pollution. | low | F-SA-B25-011 |
| 98–124 | Collision-retry test controls `Math.random` via `vi.spyOn` with a queued-value system. Well-constructed — the random values are derived from `charset.indexOf(ch)` to produce specific codes deterministically. | OK | — |
| 139 | `await db.delete(scienceClasses).where(sql\`true\`)` — deletes ALL classes to set up the max-retries scenario. This is aggressive but acceptable within a single-test isolation model. | low | F-SA-B25-012 |
| 58–66 | `beforeEach`/`afterEach` both call `cleanupFixtures()` — correct double-cleanup for idempotent test run. | OK | — |

---

### File 16: `lib/utils/generateJoinCode.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — retry with collision check |
| **Security/tenancy** | OK — join-code uniqueness is global by design |
| **AGENTS.md compliance** | OK — utility function |
| **Architecture** | Gap: no write-time conflict resolution — assumes the caller handles the unique constraint |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 20 | `JoinCodeDb` type: `Pick<typeof defaultDb, 'select'>` — uses `defaultDb` purely for type inference; the runtime import is tree-shaken or unused. Acceptable. | OK | — |
| 47–74 | `generateUniqueJoinCode` performs a SELECT + return without a transaction. Between the SELECT and the caller's INSERT, another process could insert the same code. The DB's UNIQUE constraint on `join_code` protects against duplicates, but this function does not catch that constraint error. The caller must handle the `23505` duplicate violation. This is a documented design trade-off. | low | F-SA-B25-013 |
| 50 | Loop iterates `1..MAX_RETRIES` inclusive. The check `attempt === MAX_RETRIES` after a collision correctly throws on final failure. | OK | — |
| 72–73 | Final `throw` at line 73 (post-loop) is unreachable because the inner loop always returns or throws. The comment acknowledges this. | info | — |

---

### File 17: `lib/utils/join-code-format.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | N/A |
| **AGENTS.md compliance** | OK — re-exports canonical definitions |
| **Architecture** | Good — delegates to `@reading-advantage/types` |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 3–4 | JSDoc mentions "Prisma-dependent logic in server-only modules." This is a **stale reference** from before the Prisma-to-Drizzle migration (Track 3). The comment should be updated to remove "Prisma" references since the app no longer uses Prisma. | low | F-SA-B25-014 |
| 9–16 | Re-exports from `@reading-advantage/types/contracts/class`. Follows the golden path of canonical definitions in shared packages. | OK | — |
| 24–31 | `sanitizeJoinCodeInput` — clean, chainable implementation. | OK | — |

---

### File 18: `lib/validations/api-helpers.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | N/A (validation helpers) |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — comprehensive, covers error structure |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| All | `parseBody` (4 tests), `parseQuery` (3 tests), `parsePath` (3 tests), `ValidationError` (2 tests). Edge cases: empty body, invalid JSON, missing fields, negative numbers, non-UUIDs. Error shape assertions via `toJSON()`. | OK | — |

---

### File 19: `lib/validations/api-helpers.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | N/A — boundary validation helpers |
| **AGENTS.md compliance** | Golden path — Zod at every API boundary, typed generics |
| **Architecture** | Clean — each function handles one transport location (body/query/path) |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 41–43 | `body = await request.json()` with `try/catch` — properly wraps JSON parse. Throws `ValidationError` with a custom `ZodError` for malformed JSON. | OK | — |
| 74–86 | `parseQuery` iterates `url.searchParams.entries()` and keeps only the **first** value for duplicate keys via `if (!(key in raw))`. This silently discards duplicate params. Consider whether `z.coerce` + `.array()` should be supported for repeated query parameters (e.g., `?id=1&id=2`). | low | F-SA-B25-015 |
| 96–105 | `parsePath` accepts `Record<string, string | string[]>`. Next.js dynamic route params sometimes include string arrays for catch-all routes (`[...slug]`). The `schema.safeParse(params)` will reject arrays if the schema expects strings. This is correct behavior — the caller must provide matching types. | OK | — |
| 7–26 | `ValidationError` — well-encapsulated error class with `status`, `details`, `toJSON()`. `toJSON` maps paths to dot-notation strings. | OK | — |

---

### File 20: `lib/validations/assignments.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | Gap — no `schoolId` in schemas; relies on route handler injecting it from auth |
| **AGENTS.md compliance** | Good — Zod at boundary, typed exports |
| **Architecture** | Clean separation of create/delete schemas |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 7–10 | `createAssignmentSchema` validates `lessonId` (UUID) and `dueAt` (ISO datetime with offset). Missing `schoolId` field is intentional — `schoolId` should come from the authenticated user's session, never from the request body. This is **correct per AGENTS.md** tenancy rules ("Never trust tenant IDs from the frontend"). | OK | — |
| 18–20 | `deleteAssignmentSchema` validates only `assignmentId`. Route handler should independently verify the user owns/teaches the class before deleting. | OK | — |
| 9 | `z.string().datetime({ offset: true }).optional()` — allows ISO 8601 with timezone offset. Correct for `dueAt`. | OK | — |

---

## Summary of Findings

| ID | File | Severity | Description |
|----|------|----------|-------------|
| F-SA-B25-001 | 1 (integration test) | medium | `createStudent` omits `schoolId`; student tenancy unenforced |
| F-SA-B25-002 | 1 (integration test) | medium | Test title claims "via transaction" but no transaction used |
| F-SA-B25-003 | 1 (integration test) | low | Misleading test title (body is correct) |
| F-SA-B25-004 | 2 (mastery.ts) | medium | Input uses TypeScript types instead of Zod schema |
| F-SA-B25-005 | 2 (mastery.ts) | medium | Missing auth/authorization policy on backend function |
| F-SA-B25-006 | 7 (server-only-mock.ts) | low | Vitest `__mocks__/` convention not followed; possible dead code |
| F-SA-B25-007 | 10 (class-format.ts) | low | Unreachable fallback `?? alignment` in `STANDARDS_LABEL` lookup |
| F-SA-B25-008 | 12 (clipboard.ts) | medium | `lib/utils` imports React component module (`@/components/client-logger`) |
| F-SA-B25-009 | 12 (clipboard.ts) | low | Uses deprecated `document.execCommand('copy')` |
| F-SA-B25-010 | 14 (date.ts) | low | Dead `return formatter.format(0, 'second')` after loop |
| F-SA-B25-011 | 15 (integration test) | low | `cleanupFixtures` deletes all `scienceClasses`, not prefix-scoped |
| F-SA-B25-012 | 15 (integration test) | low | Aggressive `DELETE WHERE true` in retry-exhaustion test |
| F-SA-B25-013 | 16 (generateJoinCode.ts) | low | SELECT-then-insert race window; caller must handle constraint violation |
| F-SA-B25-014 | 17 (join-code-format.ts) | low | Stale "Prisma" reference in JSDoc |
| F-SA-B25-015 | 19 (api-helpers.ts) | low | `parseQuery` silently discards duplicate query param values |

**Severity distribution:** medium=4, low=9, info=2

**Cross-cutting themes:**
1. **Zod contracts on backend functions** (F-SA-B25-004, F-SA-B25-005): `recordStandardMastery` is a backend operation that skips the AGENTS.md golden-path pattern (Zod for input/output, auth requirement, authorization check). New backend functions should wrap via `command()` or at minimum use Zod schemas.
2. **Lib/utils purity** (F-SA-B25-008): a `lib/utils` file imports a React `components/` module, violating the clean layering principle. Logger injection should come from a shared package.
3. **Test isolation** (F-SA-B25-011, F-SA-B25-012): integration tests use unscoped `DELETE` statements that would collide under parallel execution. Acceptable today but a risk factor.

---

## Limitations

- This review is static analysis only. No runtime execution, type-check, or lint results are incorporated.
- Integration test quality assessment is based on test structure and assertions, not on actual pass/fail results.
- The review does not verify that the referenced DB schema (foreign keys, constraints, types) is in sync with migrations.
- Imports from `@/components/*` are noted but not traced into those components to verify their internal correctness.
- No assessment of overall test coverage percentages — only the quality of existing tests.
- The `schoolId` scoping analysis assumes the multi-tenant model described in AGENTS.md (tenant-registry with FLAT/EXEMPT/REFERENTIAL classification); actual enforcement depends on the caller's usage of `createTenantDB`.
