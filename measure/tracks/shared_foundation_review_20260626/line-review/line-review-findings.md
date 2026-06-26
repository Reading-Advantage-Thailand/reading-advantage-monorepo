# Shared Foundation Line-Review Findings

Generated during Phase 10 coverage verification for `shared_foundation_review_20260626`. This artifact synthesizes the 34 line-review findings from `line-review/evidence/*.md` without remediating source code and without claiming product-green.

## Verification Basis

- Source coverage ledger: `measure/tracks/shared_foundation_review_20260626/line-review/line-review-coverage.tsv`
- Evidence files: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/*.md`
- Mechanical verification: 516/516 inventory rows reviewed; reviewed ranges match `1-N`; all listed evidence files exist; `finding_count` values are numeric and sum to 34.

## Finding Counts by Severity

| Severity | Count |
|---|---:|
| Critical | 0 |
| High | 4 |
| Medium | 14 |
| Low | 16 |
| Unspecified | 0 |
| Total | 34 |

## Findings

### LR-packages-ai-001-001 — README omits the OpenRouter provider supported by the public contract

- Severity: High
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-ai-001.md`
- File/line evidence: `packages/ai/README.md:3`
- File/line evidence: `packages/ai/README.md:29-37`
- File/line evidence: `packages/ai/src/__tests__/phase-1-interface.test-d.ts:153`


- Evidence: The README opening paragraph (line 3) states the package "abstracts over OpenAI, Google Gemini, and a mock provider." The Provider Configuration table (lines 29-37) lists only OpenAI, Google, and Mock. However, the exported `AIProvider` type at `phase-1-interface.test-d.ts:153` is `"openai" | "google" | "openrouter" | "mock"`, and the OpenRouter provider implementation exists in `packages/ai/src/providers/openrouter.ts`. The README therefore does not document a supported public provider.
- Impact: Users of the package cannot discover OpenRouter support from the primary documentation, increasing the risk that application code continues to couple directly to the OpenRouter SDK instead of using the adapter. This undermines the AGENTS.md provider-neutrality goal.
- Recommendation: Add an OpenRouter row to the README Provider Configuration table, including its required env var (`OPENROUTER_API_KEY`) and default model, so the documented surface matches the exported `AIProvider` contract.

### LR-packages-ai-001-007 — Closeout test comments falsely claim assertions fail RED, but the suite passes

- Severity: High
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-ai-001.md`
- File/line evidence: `packages/ai/src/__tests__/phase-10-closeout.test.ts:35-38`
- File/line evidence: `packages/ai/src/__tests__/phase-10-closeout.test.ts:209-214`
- File/line evidence: `packages/ai/src/__tests__/phase-10-closeout.test.ts:282-290`


- Evidence: The file header (lines 35-38) describes Task 3 as "the active RED contract — the four sub-assertions fail today because the track has not yet been moved to archive and tracks.md still says `[~]` / `./tracks/...`." Individual assertion messages repeat the claim (lines 211-214: "Today this dir still exists"; lines 283-284: "Today it is `[~]`"; lines 288-290: "Today it points to `./tracks/...`"). However, the track is already archived (`measure/tracks/ai_adapter_package_20260603` does not exist; `measure/archive/ai_adapter_package_20260603` exists with the full artifact set), and `measure/tracks.md:139` shows `[x]` with an archive link. Running the targeted test file produced `11 passed`.
- Impact: A5 false-claim text vs. test reality. Stale RED commentary misrepresents the expected state of the codebase and makes it harder to tell whether the closeout work is complete.
- Recommendation: Remove or rewrite the RED-phase commentary to describe the current Green state, or convert the file into regression tests that document the completed closeout.

### LR-packages-domain-001-002 — 2-school acceptance test verifies Proxy activity but not the injected schoolId condition

- Severity: High
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-domain-001.md`
- File/line evidence: `packages/domain/src/__tests__/2-school-acceptance.test.ts:29-50`
- File/line evidence: `packages/domain/src/__tests__/2-school-acceptance.test.ts:75-87`


- Evidence: `createMockQueryBuilder` captures the WHERE clause in `state.whereClause`, but its `then()` method ignores the captured clause and resolves the full `results` array. The test titled "tenantDb.select().from() applies schoolId condition via Proxy" only asserts `expect(mockDb.select).toHaveBeenCalled()` and never inspects `state.whereClause` or the resolved value's filtering.
- Impact: This is a vacuous-pass risk (A4). The test passes even if the TenantDB proxy fails to inject the `schoolId` condition, giving false confidence in cross-school isolation.
- Recommendation: Make the mock query builder actually filter on the injected `schoolId` condition, or assert that `state.whereClause` references the correct tenant id before resolving.

### LR-packages-domain-001-004 — cross-tenant assignment tests use wrong-shape mocks that do not exercise the real tenant check

- Severity: High
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-domain-001.md`
- File/line evidence: `packages/domain/src/__tests__/assignments.test.ts:73-81`
- File/line evidence: `packages/domain/src/__tests__/assignments.test.ts:247-259`
- File/line evidence: `packages/domain/src/__tests__/assignments.test.ts:291-303`
- File/line evidence: `packages/domain/src/__tests__/assignments.test.ts:338-350`


- Evidence: `mockClassroomSelect` replaces `db.select` so that every call returns `queryResult([{ schoolId: "s2" }])`. In `updateAssignment`, `deleteAssignment`, and `submitAssignment`, the code first looks up the assignment row; under this mock the assignment lookup itself receives a classroom-shaped row, so the "different tenant" code path is never reached. The tests pass because the wrong-shape result causes an early throw rather than because tenant isolation works.
- Impact: These tests do not prove that cross-tenant assignments are rejected. A regression that removes the tenant check could still pass if the lookup shape happens to mismatch.
- Recommendation: Provide distinct mock return values for the assignment lookup and the classroom/school lookup so the tenant check is evaluated against the correct rows.

### LR-packages-ai-001-003 — Shared contract suite only exercises three of the six `AIClient` methods

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-ai-001.md`
- File/line evidence: `packages/ai/src/__tests__/contract-suite.ts:69-118`
- File/line evidence: `packages/ai/src/__tests__/phase-1-interface.test-d.ts:68-77`


- Evidence: `runAIClientContract` tests only `generateObject`, `generateImage`, and `generateText`. The exported `AIClient` interface (`phase-1-interface.test-d.ts:68-77`) also requires `generateObjectFromMedia`, `transcribeAudio`, and `streamText`. The suite's own header (lines 7-8) claims "every new provider must satisfy the same observable contract," but half of the contract is not exercised.
- Impact: A new provider could pass the shared suite while silently failing the un-tested methods, breaking callers that rely on the full interface. The comment at `phase-2-mock-provider.test.ts:141` explicitly states that Phases 3 and 4 will call `runAIClientContract`, so the gap propagates to real-provider tests.
- Recommendation: Extend `runAIClientContract` with fixture-driven tests for `generateObjectFromMedia`, `transcribeAudio`, and `streamText`, or split the suite and require providers to import the full contract harness.

### LR-packages-ai-001-004 — Phase 0 setup tests assume a non-hoisted package-local `node_modules` layout

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-ai-001.md`
- File/line evidence: `packages/ai/src/__tests__/phase-0-setup.test.ts:74-82`
- File/line evidence: `packages/ai/src/__tests__/phase-0-setup.test.ts:99-112`


- Evidence: The test at lines 74-82 asserts that `packages/ai/node_modules/vitest` and `packages/ai/node_modules/zod` exist. The test at lines 99-112 executes `./node_modules/.bin/tsc --noEmit` from `PKG_ROOT`. In this workspace `packages/ai/node_modules` contains only `@reading-advantage` and `.vite` directories; `vitest` and `zod` are not linked locally, and `tsc` is available only at the repository root (`node_modules/.bin/tsc`). Running these tests produces failures: "expected false to be true" at line 80 and "tsc exited 1; output: /bin/sh: 1: ./node_modules/.bin/tsc: not found" at line 112.
- Impact: The Phase 0 gate is not portable across pnpm install layouts. A CI runner or contributor using the default pnpm hoisted/hybrid linker will see spurious failures even though the package is correctly installed.
- Recommendation: Resolve `tsc` via `pnpm exec tsc` or by walking to the nearest `node_modules/.bin/tsc`. For the local node_modules assertion, either check root resolution instead or document the required pnpm linker configuration.

### LR-packages-ai-001-006 — Type-test file falsely claims `vitest --typecheck` is enabled in config

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-ai-001.md`
- File/line evidence: `packages/ai/src/__tests__/phase-1-interface.test-d.ts:6`
- File/line evidence: `packages/ai/vitest.config.ts:1-10`


- Evidence: The comment states the tests are "picked up by `vitest --typecheck` (enabled in `vitest.config.ts`)." `packages/ai/vitest.config.ts` does not contain a `typecheck` block. The package `test` script (`packages/ai/package.json:18`) is simply `vitest run`, which skips `.test-d.ts` files by default.
- Impact: A5 false-claim text vs. config reality. The type-level contract tests are not exercised by the standard CI test command, so type drift in the public AIClient surface will not fail the package gate.
- Recommendation: Either add `typecheck: { enabled: true }` to `vitest.config.ts` or update the comment to explain that typecheck must be run manually with `vitest --typecheck`.

### LR-packages-api-001-001 — route-audit.md migration-priority totals disagree with tier summary

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-api-001.md`
- File/line evidence: `packages/api/docs/route-audit.md:802-840`


- Evidence: Section 1.1 states Tier 1 = 92, Tier 2 = 37, Tier 3 = 132, and Tier 4 = 33 routes. Section 4 itemizes the same tiers as: Tier 1 = Auth 13 + User CRUD 39 + Classroom 45 + Assignment 9 + License 8 = 114; Tier 2 = Article content 26 + Flashcard/SRS 21 + Reports/XP 9 = 56; Tier 3 = Games 27 + Admin/System 14 + Goals 8 + Science curriculum 16 + Demo/Debug/Upload 9 = 74; Tier 4 = AI generation 16 + AI insights 5 + Translation 5 + Level test 2 + Story generation 3 = 31. None of these sums match the section 1.1 totals.
- Impact: The audit is used for migration planning and prioritization; inconsistent route counts undermine scope estimates and tier ordering decisions.
- Recommendation: Reconcile the detailed domain counts against the summary tables and correct either the section 1.1 totals or the section 4 narrative in a docs-fix track.

### LR-packages-api-001-003 — articles-router tests only assert output field stripping

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-api-001.md`
- File/line evidence: `packages/api/src/__tests__/articles-router.test.ts:59-111`


- Evidence: Every test mocks the domain function, calls the router procedure, and only asserts that one scalar field is correct and that `extraField` is absent. There are no cases covering unauthenticated callers, unauthorized roles, error propagation, or that inputs are forwarded correctly to `listArticles`, `getArticle`, `createArticle`, or `updateArticle`.
- Impact: The tests give false confidence in the router layer; regressions in auth wiring, input mapping, or error handling will not be caught.
- Recommendation: Expand the router test suite to cover authentication/authorization failures, input forwarding, and error paths.

### LR-packages-api-001-004 — assignments-router tests only assert output field stripping

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-api-001.md`
- File/line evidence: `packages/api/src/__tests__/assignments-router.test.ts:61-156`


- Evidence: All tests mock the domain layer and only verify that `extraField` is stripped or that a scalar value is returned. There is no coverage for unauthenticated or unauthorized callers, error propagation, or that inputs such as `classroomId`, `score`, and `assignmentId` are forwarded to the domain functions.
- Impact: Shallow router coverage hides regressions in auth gating, input transformation, and error mapping.
- Recommendation: Add tests for auth rejection, input forwarding, and error cases for `create`, `list`, `get`, `update`, `delete`, and `submit`.

### LR-packages-auth-client-001-001 — Login error message echoes server response verbatim (user enumeration)

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-auth-client-001.md`
- File/line evidence: `packages/auth-client/src/provider.tsx:71-72`


- Evidence: The `login` function's error path does:
  ```ts
  const err = await res.json().catch(() => ({ message: "Login failed" }));
  throw new Error(err.message ?? "Login failed");
  ```
  If the server's `/api/auth/login` endpoint returns distinguishing error messages for
  different failure modes (e.g., `"User not found"` vs `"Invalid password"`), the
  client propagates the distinction to the caller, which enables username enumeration.
  FR-4 of the auth security hardening track added a timing oracle defense on the
  server side, but the client remains an amplification point — a compromised or
  misconfigured server that leaks distinguishing messages would be echoed directly.
- Impact: Username enumeration through the client. Attackers can probe the login
  endpoint and read the error message to determine whether a username exists. The
  server-side defense (FR-4 timing oracle) mitigates this in the normal case, but
  defense-in-depth should also sanitize on the client.
- Recommendation: Replace the verbatim `err.message` propagation with a constant
  generic string (`"Invalid username or password"`) regardless of the server response.
  The server is responsible for returning a safe message; the client should not trust
  that it does. If distinguishing information is needed for debugging, log it to the
  console but never expose it through the thrown Error.

### LR-packages-db-001-003 — Migration 0003 may fail on users with multiple OAuth accounts

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-db-001.md`
- File/line evidence: `packages/db/drizzle/0003_slow_firebrand.sql:57-71`


- Evidence: The migration drops the OAuth-specific columns (`type`, `provider`, `provider_account_id`) and replaces them with a single `provider_id` column defaulting to `'credential'`, then immediately adds a unique constraint `accounts_user_provider_unique` on `(user_id, provider_id)`. The original `accounts` table in `0000_wide_vengeance.sql` had no unique constraint on `user_id`, so a user could have multiple provider rows. After the migration, all such rows become `(user_id, 'credential')` duplicates, causing the unique-constraint creation to fail.
- Impact: Any database with users linked to more than one OAuth provider (or with multiple account rows for any reason) cannot run `0003_slow_firebrand.sql` without manually removing or merging duplicate account rows first.
- Recommendation: Either deduplicate/merge accounts before adding the unique constraint, or add the constraint only after a data-cleaning step. Document this hazard in `MIGRATION_LEDGER.md`; for historical migrations, add a pre-flight check for duplicate `user_id` rows in `accounts` before applying this migration range.

### LR-packages-db-001-004 — Backfill in migration 0004 may violate unique constraints added earlier

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-db-001.md`
- File/line evidence: `packages/db/drizzle/0004_sturdy_forge.sql:3-19`


- Evidence: `0003_slow_firebrand.sql:25-27` already added `UNIQUE` constraints on `users.username` and `users.display_username`. Migration `0004_sturdy_forge.sql` backfills `username` from the email local part (`split_part(email, '@', 1)`). Because the original `users` table enforces unique emails but not unique email local parts, two users such as `user@gmail.com` and `user@example.com` would receive the same generated username. The active unique constraint then causes the `UPDATE` to fail with a unique-violation error. The same duplicate propagates to `display_username`, which also has a unique constraint.
- Impact: This is a production migration hazard: an environment with duplicate email local parts cannot run `0004_sturdy_forge.sql` without manual remediation, and the migration will fail partway through.
- Recommendation: Either (a) move the `UNIQUE` constraints from `0003` to after the backfill in `0004`, or (b) deduplicate generated usernames deterministically in the backfill (e.g., append a counter/suffix when a conflict is detected). Since historical migrations are normally immutable, document the hazard in `MIGRATION_LEDGER.md` and ensure any environment still on this migration range is pre-checked for duplicate email prefixes before applying.

### LR-packages-domain-001-003 — listArticles test ignores tenant-scoped WHERE clause

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-domain-001.md`
- File/line evidence: `packages/domain/src/__tests__/articles.test.ts:82-102`


- Evidence: The test wraps the database with `createTenantDB(db, tenant)` but asserts that the `where` mock is called with only the topic and CEFR filters. It does not account for the `schoolId` condition that `createTenantDB` is expected to inject into every scoped query.
- Impact: If tenant scoping is bypassed or broken in `listArticles`, this test still passes because it only verifies the two explicit user filters.
- Recommendation: Update the assertion to include the tenant `schoolId` condition, or verify the query builder received an additional `.where()` call with the injected tenant filter.

### LR-packages-domain-001-005 — submitAssignment success test mocks an unrealistic assignment row shape

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-domain-001.md`
- File/line evidence: `packages/domain/src/__tests__/assignments.test.ts:307-336`


- Evidence: The first mocked `select` call returns `[{ classroomId: "c1" }]`, which does not resemble an assignment or student-assignment row. The test then relies on `updateReturning` to produce the final result without asserting what the update `set` or `where` clauses received.
- Impact: The test does not reflect the real query flow and could mask bugs in how the assignment is identified before the score update.
- Recommendation: Mock a realistic assignment/student-assignment row (including `id`, `studentId`, `assignmentId`) and assert that the update call targets the correct record.

### LR-packages-domain-001-007 — listClasses tests do not verify teacher or admin scoping filters

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-domain-001.md`
- File/line evidence: `packages/domain/src/__tests__/classes.test.ts:45-127`


- Evidence: Tests for teacher and admin `listClasses` compare the result to the mocked rows and assert `db.select` was called, but no assertion inspects the WHERE clause. The test "filters by teacherId for teacher role" only checks `db.select` was called once.
- Impact: `listClasses` could omit the `teacherId` or `schoolId` filter and still pass these tests, undermining tenant isolation.
- Recommendation: Assert the actual WHERE conditions passed to the query, or use fixtures that would fail without proper role-based scoping.

### LR-packages-storage-001-001 — getSignedUrl signs PutObjectCommand (upload URL) instead of GetObjectCommand (download URL)

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-storage-001.md`
- File/line evidence: `packages/storage/src/drivers/s3.ts:77-81`


- Evidence: The `getSignedUrl` method constructs a `PutObjectCommand` and passes it to the `@aws-sdk/s3-request-presigner` `getSignedUrl` function. This produces a pre-signed URL that authorizes a PUT (upload) operation, not a GET (download) operation. The README example (`const signedUrl = await storage.getSignedUrl("private/report.pdf", 3600)`) and method JSDoc ("Generate a pre-signed URL for temporary access") suggest this should produce a download URL. The test in `s3-driver.test.ts:79-84` mocks `PutObjectCommand` resolution, confirming the command type is PUT. A caller expecting a download URL would receive an upload-only URL, breaking the documented contract.
- Impact: Callers using this method for generating temporary download links will receive non-functional URLs (PUT signed, not GET). This is a contract mismatch between the documented intent (download) and the implementation (upload).
- Recommendation: Replace `PutObjectCommand` with `GetObjectCommand` at line 77-80 to align implementation with documented download semantics. If both upload and download pre-signed URLs are needed, split into separate `getSignedUploadUrl` and `getSignedDownloadUrl` methods or add a `method` parameter.

### LR-packages-types-001-001 — Inconsistent role enum across schemas

- Severity: Medium
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-types-001.md`
- File/line evidence: `packages/types/src/index.ts:9`
- File/line evidence: `packages/types/src/index.ts:228`


- Evidence: `userResponseSchema` (line 9) defines `role` as `z.enum(["INTERN", "STUDENT", "TEACHER", "ADMIN", "SYSTEM"])` (5 values). `sessionResponseSchema` (line 228) defines `role` as `z.enum(["INTERN", "STUDENT", "USER", "TEACHER", "ADMIN", "SYSTEM", "SALES_REP", "SALES_ADMIN"])` (8 values). The session schema includes `"USER"`, `"SALES_REP"`, and `"SALES_ADMIN"` which are absent from `userResponseSchema`.
- Impact: A valid session with role `"SALES_REP"` or `"SALES_ADMIN"` cannot be passed through `userResponseSchema` without runtime validation failure. Downstream consumers that rely on `UserResponse.role` will reject roles that the session layer legitimately issues. This creates a contract mismatch between the auth layer and the user-response layer.
- Recommendation: Align the role enum across both schemas to the superset used in `sessionResponseSchema`, or define a shared `RoleEnum` constant and reference it in both schemas.

### LR-packages-ai-001-002 — `@ai-sdk/google-vertex` dependency is not reflected in the public provider contract or docs

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-ai-001.md`
- File/line evidence: `packages/ai/package.json:23`
- File/line evidence: `packages/ai/README.md:29-37`
- File/line evidence: `packages/ai/src/__tests__/phase-1-interface.test-d.ts:153`


- Evidence: `package.json` declares `@ai-sdk/google-vertex` as a direct dependency (line 23), but the README provider table and the exported `AIProvider` type (`phase-1-interface.test-d.ts:153`) do not mention a Google Vertex provider.
- Impact: If the dependency is used only internally or is dead weight, it enlarges the supply-chain surface without a corresponding public API. If it is intended to be public, the contract and docs are incomplete.
- Recommendation: Verify whether `packages/ai/src/providers/google.ts` (or another source file) consumes `@ai-sdk/google-vertex`. If it is required, expose `"google-vertex"` in `AIProvider` and document it; otherwise remove the dependency.

### LR-packages-ai-001-005 — Comment references archived track path for test-strategy.md

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-ai-001.md`
- File/line evidence: `packages/ai/src/__tests__/phase-0-setup.test.ts:87`


- Evidence: The inline comment cites `measure/tracks/ai_adapter_package_20260603/test-strategy.md`. The `ai_adapter_package_20260603` track has been moved to `measure/archive/ai_adapter_package_20260603/` (verified by `ls measure/archive/ai_adapter_package_20260603/test-strategy.md`).
- Impact: A9-class stale path reference. Future maintainers following the comment will look in the wrong directory.
- Recommendation: Update the comment to `measure/archive/ai_adapter_package_20260603/test-strategy.md`.

### LR-packages-api-001-002 — route-audit.md records probable typo in archived route path

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-api-001.md`
- File/line evidence: `packages/api/docs/route-audit.md:172`


- Evidence: The route path is listed as `/v1/classroom/[classroomId]/achived` rather than the expected `archived`.
- Impact: If the path is faithfully copied from the source app, the doc silently perpetuates a user-facing route typo; if it is a doc typo, the audit misrepresents the actual API surface.
- Recommendation: Verify the actual route file and fix the documentation (and the route if the typo is real) in a dedicated chore.

### LR-packages-auth-001-001 — Dual password-hashing library dependency with no documented sunset plan

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-auth-001.md`
- File/line evidence: `packages/auth/package.json:19,21`


- Evidence: `@node-rs/argon2` (line 19) and `bcryptjs` (line 21) are both direct dependencies. Source file `packages/auth/src/password.ts:1-2` imports both: `import argon2 from "@node-rs/argon2"; import bcrypt from "bcryptjs";`. The `verifyPassword` function (line 34-47) dispatches to `bcrypt.compare()` for legacy hashes matching `$2a$`/`$2b$` prefix and to `argon2.verify()` for `$argon2id$` hashes. `rehashOnLogin` (line 59-82) upgrades bcrypt hashes to Argon2id on successful login.
- Impact: Maintains two cryptographic dependency chains for password hashing. If the bcrypt→Argon2id migration is complete (no bcrypt-formatted hashes remain in production), `bcryptjs` is dead-weight dependency that enlarges the supply-chain audit surface unnecessarily. There is no documented sunset plan or migration-completion tracking date.
- Recommendation: Verify whether any production `accounts.password` rows still contain bcrypt (`$2a$`/`$2b$`) hashes. If none, remove `bcryptjs` and `@types/bcryptjs` from `package.json` in a dedicated cleanup commit. If bcrypt support must persist, add an explicit JSDoc sunset plan to `rehashOnLogin` (e.g., `@deprecated bcrypt legacy support; target removal YYYY-Qx`) and track it in `measure/tech-debt.md`.

### LR-packages-auth-001-002 — Unsafe process.env mutation without test isolation in audit-retention.test.ts

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-auth-001.md`
- File/line evidence: `packages/auth/src/__tests__/audit-retention.test.ts:11-22`
- File/line evidence: `packages/auth/src/__tests__/audit-retention.test.ts:24-31`


- Evidence: The test at line 11-22 mutates `process.env.AUDIT_RETENTION_DAYS = "1000"` and manually cleans up with an `if/else` block after the `expect()` assertion. If the assertion fails (line 16), the cleanup block (lines 17-21) is never reached, leaking the mutated value to subsequent tests in the same describe block. The test at lines 24-31 performs `delete process.env.AUDIT_RETENTION_DAYS` without any restoration, permanently removing the key from `process.env` for the remainder of the suite. The sibling test file `packages/auth/src/__tests__/audit-retention-config.test.ts:5-10` demonstrates the correct pattern: `beforeEach(() => { process.env = { ...originalEnv }; delete process.env.AUDIT_RETENTION_DAYS; })`.
- Impact: A single test assertion failure can corrupt `process.env` state for subsequent tests in the suite, causing them to silently pass or fail with misleading errors. While this is test hygiene rather than a production security defect, the audit retention module is security-sensitive (FERPA compliance, data purge correctness), and test result reliability is directly relevant to compliance confidence.
- Recommendation: Adopt the same `beforeEach` pattern used in `audit-retention-config.test.ts`: capture `const originalEnv = process.env` at module scope, reset `process.env = { ...originalEnv }` in `beforeEach`, and delete/set `AUDIT_RETENTION_DAYS` within each test. This ensures per-test isolation regardless of assertion outcome.

### LR-packages-db-001-001 — README lists stale Drizzle↔Prisma gaps

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-db-001.md`
- File/line evidence: `packages/db/README.md:39-44`


- Evidence: The "Drizzle ↔ Prisma Gap" section claims there is "No Drizzle equivalent" for the license system (`licenses`/`LicenseOnUser` tables) and for Story/Chapter tables. However, this same package already defines `src/schema/licenses.ts` and `src/schema/stories.ts`, which contain `licenses`, `licenseRenewals`, `stories`, and related tables.
- Impact: Product documentation is out of sync with the actual schema, misleading developers about feature availability and migration status.
- Recommendation: Update `README.md` to remove or correct the stale gap entries for licenses and stories after verifying current schema parity; track the doc fix in the review synthesis.

### LR-packages-db-001-002 — Migration 0001 comment does not match created tables

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-db-001.md`
- File/line evidence: `packages/db/drizzle/0001_thick_santa_claus.sql:1`


- Evidence: The leading comment says "Initial schema: flashcard_cards + flashcard_decks for spaced-repetition learning", but the migration also creates `multiple_choice_questions`, `short_answer_questions`, `student_answers`, `ai_insights`, `chapter_tracking`, `game_rankings`, `learning_goals`, `story_records`, and `xp_logs`.
- Impact: The comment misrepresents the migration scope, making it harder to identify which migration introduced which tables.
- Recommendation: Expand the comment to enumerate all table groups introduced by this migration (e.g., flashcards, questions/answers, analytics/story/xp) or replace it with a generic summary such as "Initial schema: flashcards, questions, and analytics tables".

### LR-packages-domain-001-001 — package.json devDependency version specifiers are not pinned

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-domain-001.md`
- File/line evidence: `packages/domain/package.json:91-98`


- Evidence: Runtime and dev dependencies use caret ranges: `"zod": "^3.25.76"`, `"@types/node": "^20.0.0"`, `"typescript": "^5.8.0"`, `"vitest": "^4.1.8"`. Only `drizzle-orm` is pinned to an exact version.
- Impact: Violates the repository Version Policy (`AGENTS.md`) which requires current stable versions to be pinned in `package.json` and lockfiles. Caret ranges allow unintended minor/patch drift across installs and CI caches.
- Recommendation: Pin all dependency versions to exact versions in this package.json.

### LR-packages-domain-001-006 — audit nextCursor test does not verify the returned event slice

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-domain-001.md`
- File/line evidence: `packages/domain/src/__tests__/audit.test.ts:51-74`


- Evidence: The test creates 51 events and asserts `result.events` has length 50 and `result.nextCursor` is `"e49"`. It does not assert that the returned events are `events.slice(0, 50)`.
- Impact: If `queryAuditEvents` returns the wrong 50 events (for example, events 1-51) while still setting `nextCursor` to `"e49"`, the test passes but pagination is broken.
- Recommendation: Add `expect(result.events).toEqual(events.slice(0, 50))` to ensure the cursor aligns with the returned page.

### LR-packages-storage-001-002 — exists() catches all errors, masking auth/permission failures as "not found"

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-storage-001.md`
- File/line evidence: `packages/storage/src/drivers/s3.ts:109-111`


- Evidence: The `exists` method wraps the `HeadObjectCommand` send in a try/catch that returns `false` for any thrown error (`catch { return false; }`). This indiscriminate catch converts authentication failures (InvalidAccessKeyId, SignatureDoesNotMatch), authorization failures (403 Forbidden), network errors, and genuine NotFound (404) into the same `false` result. The caller cannot distinguish between "object genuinely does not exist" and "the storage client is misconfigured."
- Impact: In production, a misconfigured S3 client or expired credentials would silently report all objects as non-existent, potentially causing data loss or incorrect application behavior (e.g., thinking an upload is needed when the object exists but credentials are wrong).
- Recommendation: Distinguish between `NotFound` (return `false`) and other errors (re-throw or return a typed error). The `@aws-sdk/client-s3` `HeadObjectCommand` throws with a `$metadata.httpStatusCode` property; check for `404` specifically and re-throw other status codes.

### LR-packages-storage-001-003 — Default put ACL is public-read; callers may accidentally expose objects

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-storage-001.md`
- File/line evidence: `packages/storage/src/drivers/s3.ts:56`


- Evidence: The `put` method sets `ACL: opts?.public !== false ? "public-read" : "private"`. The default ACL (when `opts` is omitted or `opts.public` is `true`/`undefined`) is `"public-read"`. While the JSDoc on `PutOptions.public` documents "Defaults to true", a default-public approach diverges from the principle of least privilege and increases the risk of accidental data exposure. All other comparable storage adapter conventions (e.g., AWS SDK defaults, `@aws-sdk/client-s3` default) use private-by-default.
- Impact: A developer calling `storage.put("avatars/user-123.jpg", buffer)` without specifying `public: false` will upload the object with public-read ACL, potentially exposing sensitive user data. This is especially risky if the storage bucket is not configured with a default bucket policy blocking public ACLs.
- Recommendation: Change the default to `"private"` and require explicit `public: true` for public objects. Update the `PutOptions.public` JSDoc accordingly. This is a one-line change at `s3.ts:56`: `ACL: opts?.public === true ? "public-read" : "private"`.

### LR-packages-types-001-002 — Loose string types for phase and status in codecamp schemas

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-types-001.md`
- File/line evidence: `packages/types/src/codecamp.ts:11-12`


- Evidence: `moduleResponseSchema` defines `phase: z.string()` and `status: z.string()`. These accept any arbitrary string value, whereas the codecamp domain uses a constrained set of phases (e.g., `z.enum(["A", "B", "C", "D"])` on line 326) and statuses. The `internAccountResponseSchema` (line 369) similarly uses `role: z.string()` rather than a constrained enum.
- Impact: Runtime validation does not reject invalid phase/status/role values. Consumers must manually validate these strings downstream, increasing the surface for invalid data propagation.
- Recommendation: Replace `z.string()` with `z.enum([...])` for `phase`, `status`, and `role` fields where the set of valid values is known and fixed.

### LR-packages-types-001-003 — Two divergent createClassSchema definitions

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-types-001.md`
- File/line evidence: `packages/types/src/index.ts:21`
- File/line evidence: `packages/types/src/contracts/class.ts:35`


- Evidence: `index.ts:21` defines `createClassSchema` with only `{ name: z.string().min(1).max(100) }`. `contracts/class.ts:35` defines a different `createClassSchema` with `{ name, gradeLevel, standardsAlignment }`. The latter is re-exported as `scienceCreateClassSchema` (line 269).
- Impact: The two schemas serve different products (reading-advantage vs. science-advantage) but share the same export name within the package. This is handled by the aliasing on re-export, but internal imports of `createClassSchema` from the barrel `index.ts` resolve to the simpler schema, which could confuse consumers expecting the richer science version.
- Recommendation: No immediate action required — the aliasing pattern is intentional. Document the distinction in JSDoc or move reading-advantage-specific schemas into a `contracts/reading.ts` module for symmetry.

### LR-packages-webhooks-001-001 — Environment variable not saved before mutation in `generateAppJWT` test block

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-webhooks-001.md`
- File/line evidence: `packages/webhooks/src/__tests__/github-client.test.ts:167-171`


- Evidence: The `generateAppJWT` test at line 167-171 deletes `process.env.GITHUB_APP_ID` and `process.env.GITHUB_PRIVATE_KEY` via `delete` without saving and restoring the original values. This is inconsistent with the `verifyWebhookSignature` test block at the same file (lines 74-82), which properly saves `const originalEnv = process.env.GITHUB_WEBHOOK_SECRET` in `beforeEach` and restores it in `afterEach`. While Vitest file isolation (default `--isolate`) mitigates cross-file pollution, within-file subsequent describe blocks (`getInstallationTokenForRepo` at line 179-182) re-set these env vars via their own `beforeEach`. The gap exists if a test between these blocks or a test-order change reads the deleted values.
- Impact: Potential for test flakiness if describe-block execution order changes or if a new test is inserted between the two blocks. The deleted env vars are not restored, so any test between line 172 and the `getInstallationTokenForRepo` `beforeEach` will see missing values.
- Recommendation: Adopt the save-then-restore pattern used by `verifyWebhookSignature` (lines 74 and 82). Wrap the `generateAppJWT` describe block with its own `beforeEach`/`afterEach` pair that saves, sets (or deletes), and restores the env vars.

### LR-packages-webhooks-001-002 — Environment variable deleted instead of restored in `afterAll`

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-webhooks-001.md`
- File/line evidence: `packages/webhooks/src/__tests__/github-review.test.ts:258,261,284-285`


- Evidence: The `beforeAll` at lines 258 and 261 sets `process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET` and `process.env.AI_PROVIDER = "mock"` without first saving the original values. The `afterAll` at lines 284-285 uses `delete process.env.GITHUB_WEBHOOK_SECRET` and `delete process.env.AI_PROVIDER` instead of restoring the originals. If either env var was set to a meaningful value before test execution, that value is permanently lost for subsequent test files (if Vitest is not running with per-file isolation or in a shared worker context).
- Impact: Potential for downstream test pollution if Vitest worker reuse or `--no-isolate` mode is used. Loss of `AI_PROVIDER` could cause other tests to silently use the wrong provider. Loss of `GITHUB_WEBHOOK_SECRET` could cause other webhook tests to see a missing-secret state.
- Recommendation: Save original values before `beforeAll` mutations: `const originalSecret = process.env.GITHUB_WEBHOOK_SECRET; const originalProvider = process.env.AI_PROVIDER;` and restore them in `afterAll` with `process.env.GITHUB_WEBHOOK_SECRET = originalSecret;` etc., falling back to `delete` only when the original was `undefined`.

### LR-packages-webhooks-001-003 — Environment variable deleted instead of restored in `afterAll`

- Severity: Low
- Evidence artifact: `measure/tracks/shared_foundation_review_20260626/line-review/evidence/packages-webhooks-001.md`
- File/line evidence: `packages/webhooks/src/__tests__/github-webhook.test.ts:66,74`


- Evidence: The `beforeAll` at line 66 sets `process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET` without saving the original value. The `afterAll` at line 74 uses `delete process.env.GITHUB_WEBHOOK_SECRET` instead of restoring the original. Same pattern as finding LR-packages-webhooks-001-002 but in a different test file.
- Impact: Same as LR-packages-webhooks-001-002 — potential downstream test pollution if Vitest worker reuse or `--no-isolate` mode is used.
- Recommendation: Save the original value before mutation and restore it in `afterAll`, falling back to `delete` only when the original was `undefined`.
