# Line-by-line Review — `sa-batch-36` (FINAL BATCH)

- **Track:** `science_advantage_review_20260626`
- **Batch file:** `/tmp/opencode/sa-batch-36`
- **Scope:** Read-only line review. No app code edited.
- **Date:** 2026-06-27
- **Reviewer focus:** correctness, security/tenancy/auth, AGENTS compliance, test quality, architecture baseline / golden-path patterns.

## Files reviewed (18 / 18)

1. `apps/science-advantage/tests/api/student-classes.test.ts`
2. `apps/science-advantage/tests/lib/bilingual-schema.test.ts`
3. `apps/science-advantage/tests/lib/class-validations.test.ts`
4. `apps/science-advantage/tests/lib/display-preference.test.tsx`
5. `apps/science-advantage/tests/lib/from-zod.test.ts`
6. `apps/science-advantage/tests/lib/grade4-normalization.test.ts`
7. `apps/science-advantage/tests/lib/mastery-calculator.test.ts`
8. `apps/science-advantage/tests/lib/seed-validation.test.ts`
9. `apps/science-advantage/tests/seed-activity.integration.test.ts`
10. `apps/science-advantage/tsconfig.json`
11. `apps/science-advantage/vercel.json`
12. `apps/science-advantage/vitest.config.ts`
13. `apps/science-advantage/vitest.integration.config.ts`
14. `apps/science-advantage/vitest.integration.global-setup.ts`
15. `apps/science-advantage/vitest.integration.setup.ts`
16. `apps/science-advantage/vitest.scripts.config.ts`
17. `apps/science-advantage/vitest.unit.config.ts`
18. `apps/science-advantage/vitest.unit.setup.ts`

---

## Findings

### F-SA-B36-001 — Vercel build command invokes Prisma in a Drizzle-only app (HIGH)
**File:** `apps/science-advantage/vercel.json:3`
```json
"buildCommand": "npx prisma generate && npx prisma migrate deploy && next build",
```
This app has **no Prisma**: there is no `schema.prisma` anywhere under `apps/science-advantage`, no `prisma`/`@prisma/*` dependency in `package.json`, and no `prisma` binary in `node_modules`. The DB layer is Drizzle (`drizzle-orm ^0.44.0`, `pnpm seed` → `tsx scripts/seed.ts`).

Consequences:
- A real Vercel deploy would run `npx prisma generate` with no schema → Prisma errors out, **breaking the build/deploy** (or silently pulling an unrelated Prisma version on the fly).
- Directly contradicts the app `AGENTS.md` regression guard ("Drizzle is the source of truth; no Prisma runtime artifacts belong at the app root") and the monorepo migration direction.
- Migrations should run via the Drizzle migration runner (`@reading-advantage/db migrate`, as the integration global-setup already does), not `prisma migrate deploy`.

This is the most material defect in the batch: a production deployment config pointing at a non-existent toolchain. Recommend a follow-up track to replace the build command with the Drizzle equivalent (or `next build` plus the existing Drizzle migrate path).

---

### F-SA-B36-002 — `student-classes.test.ts` 403 case contradicts the route and the permission table (HIGH)
**File:** `apps/science-advantage/tests/api/student-classes.test.ts:40-56`
The test asserts that a `TEACHER` session yields HTTP `403` with body `{ error: 'Not authorized' }` and that `getStudentEnrolledClasses` is **not** called.

The actual route (`app/api/student/classes/route.ts:33`) authorizes via:
```ts
assertCan(session.user as unknown as UserContext, 'student:read:own');
```
and the permission table grants `student:read:own` to **STUDENT, TEACHER, ADMIN, SYSTEM** (`packages/auth/src/permissions.ts:116`). Therefore:
- A `TEACHER` **passes** `assertCan` (no `AuthError` thrown), so the route proceeds to call `getStudentEnrolledClasses` and returns `200` — the opposite of the test's expectation that the service is *not* called and a `403` is returned.
- Even on the genuine deny path, the route returns `{ error: error.message }` (the verbose `User <id> (<role>) lacks permission: ...` string from `assert.ts:20-23`), **not** the literal `'Not authorized'` the test asserts (route lines 42-46).

So this test encodes behavior that neither the route nor the auth layer implements. Run under the default config (see F-SA-B36-008) it would **fail**. It appears stale relative to the current `assertCan`-based golden path. Either the route is missing an explicit student-only role gate, or (more likely) the test was written against an earlier hand-rolled role check and never updated. Needs reconciliation — flag, do not silently trust.

> Note: the same file is in the `tsconfig.json` exclude list (F-SA-B36-003), so its type drift is also invisible to `check-types`.

---

### F-SA-B36-003 — `tsconfig.json` excludes many test files from type-checking (MEDIUM)
**File:** `apps/science-advantage/tsconfig.json:41-53`
A block of test files is added to `exclude`, including `tests/api/student-classes.test.ts:48`, several `*.integration.test.ts`, and `lib/auth/rate-limit.test.ts`. Excluding tests from `tsc --noEmit` means:
- Type errors and signature drift in those tests are never caught by `check-types`.
- It directly enabled F-SA-B36-002 to rot undetected (the test references a contract the route no longer honors).

This is test-quality / maintainability debt. Excluding a test from the type checker is a code smell that usually masks an underlying compile or contract problem rather than fixing it. Recommend tracking each exclusion with a reason and a removal plan.

---

### F-SA-B36-004 — Bilingual "Lesson Model Thai Fields" tests are tautological and reference Prisma (LOW)
**File:** `apps/science-advantage/tests/lib/bilingual-schema.test.ts:70-97`
These two cases define a local inline type `LessonWithTitleThai` and assert on a hand-constructed object literal. They validate nothing about the real Drizzle schema — they only confirm TypeScript object literals behave as written. The comment at line 72 ("validates that the Prisma schema includes the new fields") is **stale**: the app no longer uses Prisma (see F-SA-B36-001), and the test does not touch any schema. Low risk but misleading; should either assert against the actual schema/type export or be removed.

---

### F-SA-B36-005 — Mislabeled `splitBilingualField` test; also exercises a type-lie in source (LOW)
**File:** `apps/science-advantage/tests/lib/bilingual-schema.test.ts:50-54`
The case is named "should split a bilingual description" but the input `'What do scientists do? นักวิทยาศาสตร์ทำอะไร?'` contains no `' / '` delimiter, so `splitBilingualField` performs **no split** — it returns the whole string as `english` and `thai: null`. The assertion is correct, but the title misrepresents the behavior; a reader could believe Thai-by-language-detection splitting exists when it does not.

Related observation (source, not in batch): `lib/bilingual.ts:30` returns `english: null as unknown as string` for null input, which the test at lines 62-66 relies on (`expect(result.english).toBeNull()`). The `BilingualSplit.english` type is declared `string`, so this is a runtime/type contract mismatch the test silently blesses. Flagged for awareness; the source file is outside this batch.

---

### F-SA-B36-006 — Mastery-calculator tests assert undocumented magic constants (LOW)
**File:** `apps/science-advantage/tests/lib/mastery-calculator.test.ts:33,64,93`
Expected values such as `masteryLevel: 0.65` (even-split correct), `0.175` (recency decay on a wrong answer), and the clamp to `1` are asserted as bare literals with no reference to the weighting/decay formula. The tests are otherwise well-structured (clear cases: split weighting, decay, clamping, empty input, skipped-no-standards). Risk: any deliberate tuning of the algorithm forces opaque test edits, and an accidental formula regression that still lands on these constants would pass. Consider deriving expected values from documented formula constants. Behavior coverage itself is good.

---

### F-SA-B36-007 — `seed-activity.integration.test.ts` is fully skipped (coverage gap, documented) (LOW/INFO)
**File:** `apps/science-advantage/tests/seed-activity.integration.test.ts:33-37`
The entire suite is `describe.skip` with a placeholder body. The header (lines 1-30) documents the reason well: a pre-existing VOCABULARY_MATCH seed-data vs. Zod-validator drift (object vs. array shape) causing `seedQuestions` to `process.exit(1)`. The deferral is honest and attributed to track `prisma_drizzle_science_controllers_20260505`. Still a live coverage gap: `seedActivityData` has **no** executing integration coverage. Acceptable as documented tech-debt, but should remain on the deferral ledger until the validator/seed-data reconciliation lands.

---

### F-SA-B36-008 — Default `vitest.config.ts` runs the stale/failing test under `pnpm test` (INFO)
**File:** `apps/science-advantage/vitest.config.ts:13-32`
The default config (used by `pnpm test`) has no `include` filter, runs **all** tests in jsdom, and is DB-capable (uses the integration setup + globalSetup migrate). The unit config (`vitest.unit.config.ts:28-33`) only globs `app/**`, `components/**`, `lib/**` — it does **not** include `tests/**`. Consequently the `tests/api/student-classes.test.ts` file from F-SA-B36-002 executes under `pnpm test` but is invisible to the DB-free unit subset. This means the contract mismatch in F-SA-B36-002 would surface only in the full DB-capable run, and is otherwise easy to miss. Pure observation about the harness routing — no fix required, but it explains why the drift persisted.

---

### F-SA-B36-009 — Minor harness observations (INFO)
- `vitest.unit.config.ts:21` raises `testTimeout` to 15s for a single ESLint child-process contract test (FR-7). Reasonable, documented; just noting a global timeout bump driven by one slow test (could be scoped per-test instead).
- `vitest.unit.setup.ts:9-10` deletes `AI_RECOMMENDER_MODEL*` env vars globally. Sensible for determinism; harmless.
- `vitest.integration.setup.ts:14` and `global-setup.ts:18` cast `process.env` to a narrow shape and resolve the `_test` DB URL — correct isolation pattern, matches app `AGENTS.md` guidance. Migration runs once via Drizzle (`runDrizzleMigrate`), consistent with the no-Prisma direction (reinforces F-SA-B36-001's inconsistency: the integration harness already does this the right way, while `vercel.json` does not).
- `vitest.scripts.config.ts` reuses the unit setup and globs only `scripts/**/*.test.*` — clean separation, no concerns.

---

## Tests assessed as sound (no findings)

- `tests/lib/class-validations.test.ts` — covers happy path, string coercion + trim, invalid grade rejection, and partial update schema. Aligns with the Zod-at-the-boundary golden path. Good.
- `tests/lib/from-zod.test.ts` — covers default field derivation, enum→select inference, override ordering/visibility, and textarea threshold. Solid behavior coverage.
- `tests/lib/grade4-normalization.test.ts` — broad coverage of case/delimiter normalization, validity checks, file-level normalization, unknown-type warnings, structural-throw cases, and property preservation. Matches `lib/grade4-normalization.ts` behavior (verified, including the "unknown types pass through after uppercasing" semantics at source lines 63-68).
- `tests/lib/seed-validation.test.ts` — thorough: valid/invalid lessons & questions files, empty arrays, missing/required fields, structuredContent block validation, error path/lessonId propagation, formatter output, and direct `LessonContentSchema` checks. Strong contract coverage.
- `tests/lib/display-preference.test.tsx` — covers default, persistence to localStorage, load-on-mount, language visibility flags, and graceful handling of invalid stored values. Good React context coverage; uses `act()` correctly and resets storage/mocks per test.

---

## Cross-cutting / architecture notes

- **Auth golden path:** The one route touched by this batch's tests (`/api/student/classes`) correctly uses the shared `@reading-advantage/auth` `assertCan` + `AuthError` pattern and wraps the handler in `runWithRequestContext` with structured `logger` error reporting — consistent with AGENTS observability guidance. The defect is in the *test's* expectations (F-SA-B36-002), not the route's auth wiring.
- **Tenancy:** No `schoolId` scoping is asserted in `student-classes.test.ts`; the route delegates to `getStudentEnrolledClasses(session.user.id)` (service not in this batch). Tenant scoping for that service was not reviewable here — see limitations.
- **Prisma residue:** F-SA-B36-001 plus the stale comment in F-SA-B36-004 show lingering Prisma references despite the completed Drizzle migration. The `vercel.json` case is functional (deploy-breaking), not cosmetic.

---

## Limitations

- Read-only review; no app code modified, no tests executed. Assertions about pass/fail (F-SA-B36-002, F-SA-B36-008) are derived by reading the route, the auth package, and the permission table — not by running the suite.
- Service implementations behind the tests (`lib/services/classes/get-student-classes`, the mastery calculator source, the seed validator internals) were only spot-checked or out of scope; tenant-scoping correctness of `getStudentEnrolledClasses` was not verified.
- Vercel deploy behavior for F-SA-B36-001 is inferred from the absence of Prisma artifacts/deps, not from an actual deploy attempt.
- This is a line-level review only. **No acceptance or closeout claims are made**; reconciliation of F-SA-B36-001 and F-SA-B36-002 should be handled in their own remediation tracks.
