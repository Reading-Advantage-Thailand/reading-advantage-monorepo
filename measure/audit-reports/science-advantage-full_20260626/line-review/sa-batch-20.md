# Line-by-Line Review: sa-batch-20

**Track:** `science_advantage_review_20260626`  
**Review Date:** 2026-06-27  
**Reviewer:** Line-review subagent  
**Scope:** 20 files from `/tmp/opencode/sa-batch-20`  
**Focus:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline/golden-path patterns  
**Constraint:** No app code edits; report only. No acceptance/closeout claims.

---

## Summary

20 files reviewed across 2 modules:
- **`lib/auth/` (9 files)** — app-local auth wrappers around `@reading-advantage/auth`
- **`lib/bilingual.ts` (1 file)** — bilingual title/field split utility
- **`lib/ci-gates/` (10 files)** — CI regression gate tests for track `ci_typecheck_alignment_20260603`

**Findings count:** 20 total (8 ERROR, 10 WARN, 2 INFO)  
**Security-critical:** 0  
**Tenancy scope violations:** 0  
**AGENTS.md pattern violations:** 1  

---

## Files Reviewed

1. `apps/science-advantage/lib/auth/constants.ts`
2. `apps/science-advantage/lib/auth/index.ts`
3. `apps/science-advantage/lib/auth/rate-limit.test.ts`
4. `apps/science-advantage/lib/auth/server.integration.test.ts`
5. `apps/science-advantage/lib/auth/server.ts`
6. `apps/science-advantage/lib/auth/session-id-separation.test.ts`
7. `apps/science-advantage/lib/auth/session.integration.test.ts`
8. `apps/science-advantage/lib/auth/session.ts`
9. `apps/science-advantage/lib/auth/types.ts`
10. `apps/science-advantage/lib/bilingual.ts`
11. `apps/science-advantage/lib/ci-gates/ci-gates.test.ts`
12. `apps/science-advantage/lib/ci-gates/phase-1-jest-dom-types.test.ts`
13. `apps/science-advantage/lib/ci-gates/phase-10-monorepo-root-ci-paths-filter.test.ts`
14. `apps/science-advantage/lib/ci-gates/phase-11-react-hooks-immutability.test.ts`
15. `apps/science-advantage/lib/ci-gates/phase-12-unused-vars-warnings.test.ts`
16. `apps/science-advantage/lib/ci-gates/phase-12b-remaining-lint-blockers.test.ts`
17. `apps/science-advantage/lib/ci-gates/phase-12c-build-resolves.test.ts`
18. `apps/science-advantage/lib/ci-gates/phase-13-final-acceptance.test.ts`
19. `apps/science-advantage/lib/ci-gates/phase-14-closeout.test.ts`
20. `apps/science-advantage/lib/ci-gates/phase-3-auth-test-siblings.test.ts`

---

## Finding Index

| ID | File | Severity | Summary |
|----|------|----------|---------|
| F-SA-B20-001 | `bilingual.ts:29-32` | ERROR | `null as unknown as string` type escape hatch lies to callers |
| F-SA-B20-002 | `rate-limit.test.ts:4` | ERROR | Imports `./rate-limit` module that does not exist |
| F-SA-B20-003 | `server.ts:9-14` | WARN | `requireAuth` uses `redirect()` as return; hides `never` type from TS |
| F-SA-B20-004 | `session.ts:17-18` | INFO | JSDoc description clarifies delegation pattern; no actionable issue |
| F-SA-B20-005 | `session.ts:30` | WARN | `secure` cookie flag conditionally disabled in dev; acceptable but flag for review |
| F-SA-B20-006 | `session.integration.test.ts` | WARN | Test uses real DB; no `schoolId` scoping verified in session operations |
| F-SA-B20-007 | `server.integration.test.ts:31-44` | WARN | `toSessionUser` hardcodes `schoolId: null`; all test users have no schoolId |
| F-SA-B20-008 | `server.integration.test.ts:275-288` | INFO | Role-route map test is trivially asserting constants; low coverage value |
| F-SA-B20-009 | `session-id-separation.test.ts` | WARN | Complex mock chain fragile if shared session interface changes |
| F-SA-B20-010 | `server.ts:20-25` | WARN | `redirect()` fallback `|| '/signin'` masks missing ROLE_ROUTES entries |
| F-SA-B20-011 | `ci-gates.test.ts:44` | WARN | `runGate` assumes `corepack` is on PATH; may fail in constrained CI runners |
| F-SA-B20-012 | `phase-1-jest-dom-types.test.ts:66` | WARN | Uses `npx tsc` instead of workspace-aware `pnpm check-types` |
| F-SA-B20-013 | `phase-10-*.test.ts:165-182` | WARN | Hardcoded shared-paths list lacks `apps/*/package.json` guard for cross-app deps |
| F-SA-B20-014 | `phase-11-*.test.ts:346-353` | WARN | Invokes `./node_modules/.bin/eslint` directly; fragile under pnpm strict isolation |
| F-SA-B20-015 | `phase-12b-*.test.ts` | WARN | Same `./node_modules/.bin/eslint` concern as Phase 11; replicated across 5 file groups |
| F-SA-B20-016 | `phase-12c-*.test.ts:120-123` | WARN | Build error fragments list may not cover all Turbopack error signatures |
| F-SA-B20-017 | `phase-13-*.test.ts:597-687` | WARN | Build "umbrella gate" is file-content only; does not assert build actually exits 0 |
| F-SA-B20-018 | `phase-14-closeout.test.ts:207-218` | ERROR | `findTableRow` splits on `|`; will break if notes column contains pipe chars |
| F-SA-B20-019 | `phase-14-closeout.test.ts:239` | ERROR | Hardcoded column index `cells[5]` assumes exact 6-column table; fragile |
| F-SA-B20-020 | `phase-3-*.test.ts` | ERROR | `tsc --noEmit` spawned via `npx` bypasses workspace package resolution |

---

## Detailed Findings

### File 1: `lib/auth/constants.ts`

**Review:** Thin re-export shim. Re-exports `ROLE_HIERARCHY`, `ROLE_ROUTES` and `Role` from `@reading-advantage/auth`. Clean, minimal, no logic.

**Findings:** None.

---

### File 2: `lib/auth/index.ts`

**Review:** Barrel re-export file. Re-exports types and functions from `./types`, `./session`, and `./server`. All exports are from the same module, so no circular dependency risk.

**Findings:** None.

---

### File 3: `lib/auth/rate-limit.test.ts`

**F-SA-B20-002** — **ERROR** — Line 4: `import { LoginRateLimiter } from './rate-limit';`  
The module `./rate-limit` does not exist at `apps/science-advantage/lib/auth/rate-limit.ts`. This import causes a TS2307 error. The test defines good unit tests (timers, per-user isolation, window expiry, success reset), but cannot run as-is. Per the Phase 3 gate test, the recommended resolution is a tsconfig exclude for this file or creating the missing module. This is a known gap flagged by the track test strategy.

**Test quality assessment:** The test itself is well-structured — uses `vi.useFakeTimers()`, tests edge cases (per-user isolation, window expiry), has clear assertions. Would be high quality once the missing module exists.

---

### File 4: `lib/auth/server.integration.test.ts`

**F-SA-B20-007** — **WARN** — Lines 31-44: `toSessionUser` hardcodes `schoolId: null`  
All four seeded test users lack a `schoolId`. The `Session.user.schoolId` field allows `null`, so this passes type checks. But in a multi-tenant codebase per AGENTS.md ("Every query must be scoped by `schoolId`"), auth tests should exercise `schoolId` propagation rather than always testing with null. Adding a schoolId to fixture users would improve coverage of the tenancy contract.

**F-SA-B20-008** — **INFO** — Lines 275-288: "Role Routes" test block  
This test asserts that constants `'STUDENT' → '/student'` etc. are mapped. The assertions are trivially testing hardcoded string literals defined right above them (`const roleRouteMap = { STUDENT: '/student', ... }`). This provides no regression value because a wrong route would be obvious from the code. Recommendation: test the actual `ROLE_ROUTES` import from `@reading-advantage/auth` instead.

**Other notes:**
- Line 26: Cleanup order (`sessions` → `accounts` → `users`) is correct to avoid FK violations.
- The `hasRole` test matrix (lines 150-198) is thorough — covers all 4 roles × 4 required roles = 16 combinations.
- `requireAuth` / `requireRole` tests properly mock `next/navigation` and `next/headers`.

---

### File 5: `lib/auth/server.ts`

**F-SA-B20-003** — **WARN** — Lines 9-14: `requireAuth` returns `redirect()`  
`redirect()` from `next/navigation` throws a `Redirect` error internally and its return type is `never`. This function's declared return type is `Promise<Session>`, but one code path calls `return redirect('/signin')` which never actually returns. TypeScript does not catch this because `redirect()` returns `never`, which is assignable to anything. If a future refactor changes `redirect()` behavior, this path could return `undefined` at runtime instead of `Session`. Consider `redirect('/signin'); return undefined as never;` or restructuring to throw explicitly.

**F-SA-B20-010** — **WARN** — Lines 20-25: `redirect(ROLE_ROUTES[session.user.role] || '/signin')`  
The fallback `|| '/signin'` masks the case where `session.user.role` is not found in `ROLE_ROUTES`. Currently all `Role` variants are present in `ROLE_ROUTES`, so the fallback is dead code. However, if a new role is added to the `Role` type but not to `ROLE_ROUTES`, this fallback would silently redirect to `/signin` instead of failing loud. A `??` (nullish coalescing) would be equivalent here, but the safest pattern is a type-level assertion object that exhaustiveness-checks the role union.

**Other notes:**
- `getSession()` (line 38-39) is a thin wrapper around `getCurrentSession()`, which itself wraps `sharedGetSession(db, token)`. This layering is clear.
- `hasRole()` (line 31-33) delegates to `roleAtLeast` from shared auth, keeping authz logic centralized.

---

### File 6: `lib/auth/session-id-separation.test.ts`

**F-SA-B20-009** — **WARN** — Lines 6-47: Complex mock chain  
The mock replaces `@reading-advantage/db` with a deeply nested mock object (`db.insert().values().returning()`, `db.select().from().where().limit()`). This mock structure is fragile: any change to the shared Drizzle query builder API (e.g., adding a required chained method) would silently produce `undefined` errors rather than type errors. Consider using `vi.mock('@reading-advantage/db', async () => { ... })` with `@reading-advantage/db`'s actual types to avoid silent breakage.

**Other notes:**
- The test correctly verifies `id !== token` (line 86), `id` is a UUID (line 96), and `token` is a 64-char hex string (line 104). These are valuable security invariants.
- The mock's `select().from().where().limit()` return includes `cefrLevel: 'A1-'` (with trailing dash), which is a non-standard CEFR value. Harmless for mock, but unusual.

---

### File 7: `lib/auth/session.integration.test.ts`

**F-SA-B20-006** — **WARN** — No `schoolId` verification in session operations  
The integration test validates create/validate/delete session flows and the 10-session cap (via the shared `createSession`), but never verifies that `session.user.schoolId` is correctly returned from the DB. In a multi-tenant app, a regression that drops or mis-fetches `schoolId` would silently pass these tests. Add an assertion that `session.user.schoolId` matches the seeded user's schoolId (or null, if testing without tenancy).

**Other notes:**
- Line 127: `validateSession(db,createdSession.token!)` — missing space after comma. Cosmetic, but inconsistent with the rest of the codebase's formatting.
- Lines 102-106: "non-existent user" test correctly expects `createSession` to throw.
- Lines 286-297: Token uniqueness test generates 10 sessions sequentially. Good coverage.
- The test imports `validateSession` and `deleteSession` from `@reading-advantage/auth`, which matches the shared interface `(db, token)`.

---

### File 8: `lib/auth/session.ts`

**F-SA-B20-005** — **WARN** — Line 30: `secure: env.NODE_ENV === 'production'`  
The secure cookie flag is conditionally disabled in development. This is standard practice (dev runs on HTTP), but is worth flagging for review: if a developer tests auth flows locally over HTTP and then deploys to production, the cookie `Secure` flag flips, which could reveal HTTPS-dependent bugs that weren't caught in dev. Consider adding a loud console.warn in dev when secure cookies are disabled.

**Other notes:**
- Line 60-61: `setRequestContextUserId(session.user.id)` — observability integration is correctly injected at the auth session boundary.
- The three cookie helpers (`setSessionCookie`, `getSessionToken`, `deleteSessionCookie`) correctly use `await cookies()` (Next.js 15+ async cookies API).
- The session duration constant `SESSION_DURATION_SECONDS` (line 12) matches the shared auth's 7 days used in `createSession`.

---

### File 9: `lib/auth/types.ts`

**Review:** Single-line re-export of `Session` and `UserRole` (aliased from `Role`) from `@reading-advantage/auth`. Clean and minimal.

**Findings:** None.

---

### File 10: `lib/bilingual.ts`

**F-SA-B20-001** — **ERROR** — Lines 29-32: `null as unknown as string` type escape  
When `splitBilingualField` receives `null` or `undefined`, it returns `{ english: null as unknown as string, thai: null }`. This force-casts `null` to `string`, which lies to every caller. At runtime, `result.english` will be `null`, potentially causing `.trim()`, `.toLowerCase()`, or other string method calls to throw. The return type `BilingualSplit` declares `english: string`, which is false in the null case.

**Recommended fix:** Change `BilingualSplit.english` to `string | null` and remove the cast, or require callers to pass only defined strings and remove the null-handling branch.

**Other notes:**
- Line 12-13: `parseBilingualTitle` has a minor phrasing issue: "using the 'English / Thai' convention" — this is clear.
- The two functions have near-identical delimiter-splitting logic. `parseBilingualTitle` is a subset of `splitBilingualField` (just tighter input type). Consider consolidating or having `parseBilingualTitle` delegate to `splitBilingualField` with a type assertion.
- Line 31: `english: null as unknown as string` is the only `as unknown` cast in the file and signals a design mismatch.

---

### File 11: `lib/ci-gates/ci-gates.test.ts`

**F-SA-B20-011** — **WARN** — Line 44: `runGate` uses `corepack pnpm`  
`spawnSync("corepack", ["pnpm", ...args])` assumes `corepack` is on PATH. In monorepo CI setups where pnpm is installed globally via `npm i -g pnpm` (not corepack), the `corepack` binary may not be available. The comment says corepack "forwards transparently when pnpm is on PATH", but this is not universally true — some Node.js distributions ship corepack as opt-in. Consider checking `corepack` availability or using a `resolve-from` pattern.

**Other notes:**
- Line 97-100: The `Role` type guard test correctly verifies `ROLES.INTERN` exists. This is a good regression guard for the role-widening contract.
- Line 52: `GATE_TIMEOUT_MS = 600_000` is appropriately generous for TypeScript type-checking.
- Lines 54-88: The describe block correctly documents the Red-phase failure expectations.
- The `runGate` wrapper spawns a child process which exercises the real `tsc` and `eslint` — this is the correct pattern for CI gate tests.

---

### File 12: `lib/ci-gates/phase-1-jest-dom-types.test.ts`

**F-SA-B20-012** — **WARN** — Line 66: Uses `npx tsc` instead of `pnpm check-types`  
`runTscNoEmit` spawns `npx tsc --noEmit`. This bypasses the workspace's `tsconfig.json` chain and `pnpm`'s dependency resolution. If the workspace depends on `tsconfig-paths` or composite project references (common in monorepos), `npx tsc` may not resolve the correct config. Prefer `pnpm --filter science-advantage check-types` (which invokes `tsc --noEmit` via the workspace's turbo pipeline) or explicitly pass `--project tsconfig.json`.

**Other notes:**
- Lines 45-57: `JEST_DOM_MATCHERS` is well-documented with the correct matcher names.
- Lines 119-176: The red-phase assertions correctly document expected failure counts.
- Lines 110-115: The major-version check `toMatch(/^\^?[6-9]\./)` is reasonable but could produce a false negative if `@testing-library/jest-dom` ever reaches v10+.

---

### File 13: `lib/ci-gates/phase-10-monorepo-root-ci-paths-filter.test.ts`

**F-SA-B20-013** — **WARN** — Lines 165-182: Shared-paths list lacks cross-app guards  
`REQUIRED_SHARED_PATHS` includes `packages/**`, `.github/workflows/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `turbo.json`. However, it does NOT include `apps/*/package.json` or `config/*`. If a change to another app's `package.json` (e.g., `apps/reading-advantage/package.json`) introduces a dependency that affects the shared lockfile, the science-advantage CI gate would not trigger. This is an acceptable scoping choice per the track spec, but worth noting as a gap in the shared-path coverage.

**Other notes:**
- Lines 232-251: The regex `pull_request:[\s\S]{0,2000}?paths:` is well-crafted to anchor the `paths:` block to `pull_request:`. The 2000-char lookahead window is generous.
- Lines 403-441: The turbo.json `check-types` block check is thorough, using both a loose block-match regex and a precise `dependsOn` match.
- Lines 362-400: Regression guards for `pull_request`, `Build`, `Lint`, `Test` are correctly preserved.

---

### File 14: `lib/ci-gates/phase-11-react-hooks-immutability.test.ts`

**F-SA-B20-014** — **WARN** — Lines 346-353: Direct `./node_modules/.bin/eslint` invocation  
The file-scoped ESLint gate invokes `./node_modules/.bin/eslint` directly rather than via `pnpm exec eslint` or `npx eslint`. Under pnpm's strict node_modules structure (`.pnpm` store with symlinks), the binary path works, but only if `node_modules` is at the package root. In CI environments using `--frozen-lockfile` with `--ignore-scripts`, the binary symlink may not exist. Prefer `pnpm exec eslint` which always resolves through pnpm's PATH.

**Other notes:**
- Lines 166-182: The regex patterns for `useCallback` detection are thorough and well-documented.
- Lines 268-301: The `useEffect` dep array extraction regex correctly handles inline comments with `.replace()`.
- Lines 398-432: The regression guard for `StudentLessonDetailAnalytics` export correctly allows both `export function` and `export const` forms.
- The `beforeAll` timeout of 30s (line 366) is tight for cold-cache ESLint but reasonable on warm cache.

---

### File 15: `lib/ci-gates/phase-12-unused-vars-warnings.test.ts`

**Review:** Well-structured file-scoped lint gate. The test correctly identifies the root cause (eslint config override dropping the `_`-prefix escape hatch) and documents the three fix options. The variable `UNUSED_VARS_RULE` on line 172 correctly pins the rule identifier.

**Other notes:**
- Lines 160-162: `WARNING_USERID_PATTERN` and `WARNING_TRIGGEREVENT_PATTERN` use word-boundary-anchored patterns that correctly isolate the two variables.
- Lines 382-422: The two-argument signature check is appropriately lenient (allowing whitespace, optional type annotations, destructured args).
- **No standalone findings** beyond those shared with Phase 11 (`./node_modules/.bin/eslint` usage).

---

### File 16: `lib/ci-gates/phase-12b-remaining-lint-blockers.test.ts`

**F-SA-B20-015** — **WARN** — Duplicated `./node_modules/.bin/eslint` pattern  
Same concern as F-SA-B20-014, replicated across 5 file groups (3 analytics files × 1 ESLint invocation each + 1 image-generator file). Each `beforeAll` block at lines 319-338 and 521-540 uses `./node_modules/.bin/eslint`. If the binary path issue is resolved in one place, it must be fixed in all 6 call sites. Consider extracting an `eslintFile()` helper function.

**Other notes:**
- Lines 204-223: `ANALYTICS_TARGETS` config array is well-designed — parameterizes deps, component names, and paths so adding a new target is a one-line change.
- Lines 263-273: `buildUseCallbackDepsRegex` correctly handles multi-dep arrays with flexible whitespace.
- Lines 546-581: The image-generator gate correctly checks both `@ts-expect-error` presence AND `@ts-ignore` absence (two-way check).
- The file is the largest in this batch at 642 lines, but the loop structure keeps it maintainable.

---

### File 17: `lib/ci-gates/phase-12c-build-resolves.test.ts`

**F-SA-B20-016** — **WARN** — Lines 119-123: Build error fragments list  
`ARGON2_BUILD_ERROR_FRAGMENTS` contains 3 entries: `"@node-rs/argon2"`, `"non-ecmascript placeable asset"`, `"Module not found"`. These are the known error signatures from the install state (2026-06-07). However, Turbopack error messages change across versions. If Next.js or Turbopack updates change the error phrasing (e.g., "non-ecmascript placeable asset" → "non-ecma asset"), this test's fragment check (test 6, line 338-363) would pass silently even though the build still fails, because the new error no longer contains any of the listed fragments. Consider matching on the general resolution-failure pattern rather than specific strings.

**Other notes:**
- Lines 203-226: The dependency declaration check correctly reads both app and auth `package.json`.
- Lines 247-269: The semver-match assertion uses strict equality (`appArgon2 === authArgon2`). This is correct — both should use the same range `^2.0.2`.
- Lines 298-364: The `beforeAll` scoping means the expensive build only runs when the "end-to-end build gate" describe block is selected. Good performance design.
- Line 307: The "completed" sanity check correctly guards against null status (timeout/execa crash).

---

### File 18: `lib/ci-gates/phase-13-final-acceptance.test.ts`

**F-SA-B20-017** — **WARN** — Lines 597-687: Build umbrella gate is file-content only  
The "umbrella gate 4 — build" describe block does NOT actually run `pnpm --filter science-advantage build`. It only asserts:
- `package.json` declares a `build` script (line 599-613)
- The script references `next` (line 615-634)
- `next.config.ts` has `ignoreBuildErrors: false` (line 636-687)

The comment at line 263 acknowledges this limitation: "The full `next build` takes 3+ minutes". While this is a pragmatic trade-off to keep the test suite fast, calling this an "umbrella gate" is misleading — it's a file-content smoke check, not a gate. A regression that breaks the build (e.g., a syntax error in a page component) would pass this "gate".

**Other notes:**
- Lines 344-420: The `check-types` and `lint` umbrella gates are genuine — they spawn the actual commands.
- Lines 422-592: The `test` umbrella gate runs a single fast test file as a "smoke verification". This is a reasonable middle ground given the full suite takes 9+ minutes.
- Lines 691-799: Regression guards for CI workflow integrity are thorough and correctly assert all 4 named gates, path filters, and turbo task dependencies.
- Lines 645-686: The `next.config.ts` check correctly asserts both that `true` is absent AND that if `ignoreBuildErrors` exists, it must be `false`.

---

### File 19: `lib/ci-gates/phase-14-closeout.test.ts`

**F-SA-B20-018** — **ERROR** — Lines 207-218: `findTableRow` splits on `|`  
The helper iterates lines and checks `line.startsWith("|")` and `line.includes("| ${trackValue} |")`. This breaks if:
- The notes column contains a `|` character (e.g., inline code, a URL with parameters, or a pipe in a prose description).
- The markdown table has leading/trailing whitespace variations.
- A cell contains a pipe character escaped as `\|`.

If the track value appears in a different column (e.g., in the "Item" column), this produces a false positive.

**F-SA-B20-019** — **ERROR** — Line 239: Hardcoded column index `cells[5]`  
`split("|").map(cell => cell.trim())` followed by `cells[5]` assumes the table always has exactly 6 columns in a fixed order. If:
- A new column is added to the tech-debt table
- Columns are reordered
- A column is removed

...the status cell index shifts silently, producing an incorrect assertion (possibly a false negative or, worse, a false positive). A column-index approach should be validated against the markdown table header row, or use a header-driven lookup.

**Other notes:**
- Lines 262-294: The "6 root causes" narrative check uses flexible regex including multiple number patterns (`360`, `617`, `~370`) and phrase variants. Good tolerance for text drift.
- Lines 311-390: The per-F-ID resolution checks correctly use a 60-character lookahead window and case-sensitive `Resolved` marker. The case sensitivity is intentional to distinguish from lowercase "resolved" in the group-resolution clause.
- Lines 400-420: The lessons-learned entry check correctly requires three signals (lead-in + "type-safety hole" + "6 root causes") rather than a single phrase.
- Lines 440-508: The archive-move checks correctly verify existence, file contents, and tracks.md checkbox convention.

---

### File 20: `lib/ci-gates/phase-3-auth-test-siblings.test.ts`

**F-SA-B20-020** — **ERROR** — `npx tsc --noEmit` bypasses workspace resolution  
Same concern as F-SA-B20-012 but with higher impact because the test specifically filters TS2307 errors for `lib/auth/*` relative imports. Using `npx tsc` instead of the workspace's `pnpm check-types` may cause tsc to resolve modules differently than the actual build pipeline, potentially:
- Reporting missing-module errors that the workspace pipeline would resolve correctly (false positive)
- Not reporting errors that the workspace pipeline would catch (false negative)

The test also does not configure `--project` to point at the science-advantage `tsconfig.json`.

**Other notes:**
- Lines 80-99: The `./rate-limit` error filter correctly anchors on the module specifier (`/['"]\.\/rate-limit['"]/`) to avoid matching other paths.
- Lines 114-132: The `./password` error filter serves as a regression guard for a future Track 3 import. Good forward-looking design.
- Lines 146-153: The cohort filter correctly scopes to `lib/auth/` AND relative imports (`/['"]\.\//`).

---

## Cross-Cutting Concerns

### AGENTS.md Compliance

**Pattern: "Backend function pattern" and "Contract-driven"**
- The `lib/auth/` module follows the golden path: it delegates to `@reading-advantage/auth` for all core logic (session creation, validation, password hashing, rate limiting). The app-local code is thin wrappers that add Next.js-specific cookie handling. This aligns with AGENTS.md's requirement to keep business logic in backend packages.
- The `bilingual.ts` utility is a pure string function with no side effects or backend dependencies. This is acceptable for a view-layer formatting helper.

**Pattern: "Authentication vs Authorization"**
- Auth functions (`requireAuth`, `requireRole`) correctly separate authentication (validate session) from authorization (check role). The `hasRole` function delegates to `roleAtLeast` from the shared auth package, keeping authz logic centralized.

**Pattern: "Provider Neutrality"**
- All auth operations go through `@reading-advantage/auth` adapters. No direct SDK usage.

**Pattern: "Multi-tenancy" — Partial gap**
- The `session.user` object includes `schoolId` (propagated from the shared auth), which is the tenancy key. However:
  - No test in this batch verifies that `schoolId` is correctly propagated through the session pipeline.
  - The `server.integration.test.ts` fixtures all seed users with `schoolId: null` (implicitly).
  - While the session layer correctly fetches `schoolId` from the users table, there is no end-to-end assertion that a tenant-scoped query would receive the correct schoolId.

  **Risk:** Low, because the shared auth's `createSession` and `validateSession` both select `schoolId` from the users table (verified in `packages/auth/src/session.ts` lines 87 and 173), so the data is present on the `Session.user` object. The risk is that a future refactor of the shared auth could silently drop `schoolId` from the user selection, and this batch's tests would not catch it.

### Test Quality

**Strengths:**
- CI gate tests use real `spawnSync` invocations of tsc, eslint, and pnpm commands — not mocked. This gives high confidence in the CI pipeline.
- File-content regression guards are precise, well-documented, and include the matched content in failure messages.
- Integration tests properly clean up fixtures between runs (truncate-and-reseed pattern).
- The session test suite covers creation, validation, deletion, token security (hex, length, uniqueness), expiration, and role variations.

**Weaknesses:**
- Several tests depend on `npx` or `./node_modules/.bin` for tool invocation, which may behave differently than `pnpm exec` in strict monorepo setups.
- The `findTableRow` helper in `phase-14-closeout.test.ts` uses `|`-splitting which is fragile for markdown tables.
- The Phase 13 build "gate" is file-content only and does not actually run the build.

**Coverage gaps:**
- No test verifies `schoolId` propagation through the session pipeline.
- The bilingual utility has no tests at all in this batch.
- Rate-limit integration tests exist but cannot run because the referenced module is missing.

### Architecture / Design

- The `lib/auth/` module design is a clean example of the "thin wrapper" pattern advocated by AGENTS.md. Each function is < 10 lines, delegates to shared auth, or handles Next.js-specific I/O.
- The CI gate tests are unusually thorough for a test suite. The heavy documentation (file headers, inline JSDoc, verbose failure messages) makes the intent clear but also creates maintenance burden — every change to the tracked files requires updating regex patterns in the test files.
- The `bilingual.ts` type-unsafe cast is the most actionable code-quality finding in this batch.

---

## Limitations

1. **No app code edits** — This review examines files as-is. No fixes were applied.
2. **No runtime verification** — Findings are based on static analysis of the code. Issues that only manifest at runtime (e.g., race conditions, timing bugs, DB constraint violations) may not be captured.
3. **No cross-batch dependency analysis** — Files in this batch may depend on or conflict with files in other batches (sa-batch-1 through 19). Those dependencies are not traced here.
4. **No test execution** — Tests were not run. Red-phase assertions expected to fail today are not distinguished from legitimate regressions.
5. **Shared auth package reviewed minimally** — The correctness of app-local wrappers depends on the `@reading-advantage/auth` interface, which was spot-checked but not exhaustively reviewed.
6. **CI gate tests assume install state** — Many assertions reference specific line numbers, error counts, and file content snapshots from 2026-06-06/07. These will drift as the codebase evolves and may produce false positives.

---

*End of report. 20 files reviewed. No acceptance or closeout claims made.*
