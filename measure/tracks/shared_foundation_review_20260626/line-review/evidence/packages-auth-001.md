# Line Review Evidence: packages-auth-001

Reviewer: Measure Review B (security and data handling)
Files assigned: 10
Lines assigned: 1160

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| packages/auth/README.md | 1-76 | reviewed | 0 |
| packages/auth/eslint.config.mjs | 1-3 | reviewed | 0 |
| packages/auth/package.json | 1-34 | reviewed | 1 |
| packages/auth/src/__tests__/assert.test.ts | 1-56 | reviewed | 0 |
| packages/auth/src/__tests__/audit-retention-boundary.integration.test.ts | 1-330 | reviewed | 0 |
| packages/auth/src/__tests__/audit-retention-config.test.ts | 1-74 | reviewed | 0 |
| packages/auth/src/__tests__/audit-retention-job.integration.test.ts | 1-150 | reviewed | 0 |
| packages/auth/src/__tests__/audit-retention-job.test.ts | 1-68 | reviewed | 0 |
| packages/auth/src/__tests__/audit-retention.integration.test.ts | 1-331 | reviewed | 0 |
| packages/auth/src/__tests__/audit-retention.test.ts | 1-38 | reviewed | 1 |

## Findings

### LR-packages-auth-001-001 — Dual password-hashing library dependency with no documented sunset plan

- Severity: Low
- File: `packages/auth/package.json:19,21`
- Evidence: `@node-rs/argon2` (line 19) and `bcryptjs` (line 21) are both direct dependencies. Source file `packages/auth/src/password.ts:1-2` imports both: `import argon2 from "@node-rs/argon2"; import bcrypt from "bcryptjs";`. The `verifyPassword` function (line 34-47) dispatches to `bcrypt.compare()` for legacy hashes matching `$2a$`/`$2b$` prefix and to `argon2.verify()` for `$argon2id$` hashes. `rehashOnLogin` (line 59-82) upgrades bcrypt hashes to Argon2id on successful login.
- Impact: Maintains two cryptographic dependency chains for password hashing. If the bcrypt→Argon2id migration is complete (no bcrypt-formatted hashes remain in production), `bcryptjs` is dead-weight dependency that enlarges the supply-chain audit surface unnecessarily. There is no documented sunset plan or migration-completion tracking date.
- Recommendation: Verify whether any production `accounts.password` rows still contain bcrypt (`$2a$`/`$2b$`) hashes. If none, remove `bcryptjs` and `@types/bcryptjs` from `package.json` in a dedicated cleanup commit. If bcrypt support must persist, add an explicit JSDoc sunset plan to `rehashOnLogin` (e.g., `@deprecated bcrypt legacy support; target removal YYYY-Qx`) and track it in `measure/tech-debt.md`.

### LR-packages-auth-001-002 — Unsafe process.env mutation without test isolation in audit-retention.test.ts

- Severity: Low
- File: `packages/auth/src/__tests__/audit-retention.test.ts:11-22`
- File: `packages/auth/src/__tests__/audit-retention.test.ts:24-31`
- Evidence: The test at line 11-22 mutates `process.env.AUDIT_RETENTION_DAYS = "1000"` and manually cleans up with an `if/else` block after the `expect()` assertion. If the assertion fails (line 16), the cleanup block (lines 17-21) is never reached, leaking the mutated value to subsequent tests in the same describe block. The test at lines 24-31 performs `delete process.env.AUDIT_RETENTION_DAYS` without any restoration, permanently removing the key from `process.env` for the remainder of the suite. The sibling test file `packages/auth/src/__tests__/audit-retention-config.test.ts:5-10` demonstrates the correct pattern: `beforeEach(() => { process.env = { ...originalEnv }; delete process.env.AUDIT_RETENTION_DAYS; })`.
- Impact: A single test assertion failure can corrupt `process.env` state for subsequent tests in the suite, causing them to silently pass or fail with misleading errors. While this is test hygiene rather than a production security defect, the audit retention module is security-sensitive (FERPA compliance, data purge correctness), and test result reliability is directly relevant to compliance confidence.
- Recommendation: Adopt the same `beforeEach` pattern used in `audit-retention-config.test.ts`: capture `const originalEnv = process.env` at module scope, reset `process.env = { ...originalEnv }` in `beforeEach`, and delete/set `AUDIT_RETENTION_DAYS` within each test. This ensures per-test isolation regardless of assertion outcome.

## No-Finding Notes

- `packages/auth/README.md`: Line-by-line review complete. Documentation for audit retention policy, session management, token hashing, session revocation, and session cap. No security flaws; docs are accurate and consistent with source.
- `packages/auth/eslint.config.mjs`: Standard delegation to shared config. No findings.
- `packages/auth/src/__tests__/assert.test.ts`: Tests for `assertCan` role/permission enforcement. Correctly tests that SYSTEM role bypasses all permission checks (line 38-42). No findings.
- `packages/auth/src/__tests__/audit-retention-boundary.integration.test.ts`: Phase 6 boundary tests for exact UTC cutoff, off-by-one, self-audit recursion guard. Uses Drizzle parameterized queries (`sql` template) throughout — no SQL injection risk. `DIRECT_DATABASE_URL` is checked for presence only (line 64), value is never logged. No findings.
- `packages/auth/src/__tests__/audit-retention-config.test.ts`: Test for `retentionConfigSchema` Zod validation (min 365, default 2557). Properly uses `beforeEach` with env spread for isolation. No findings.
- `packages/auth/src/__tests__/audit-retention-job.integration.test.ts`: Test for advisory lock concurrency (`pg_try_advisory_lock`). Seeds expired rows and asserts single-winner invariant. Uses `vi.spyOn` and restores at line 148. `DIRECT_DATABASE_URL` is never logged. No findings.
- `packages/auth/src/__tests__/audit-retention-job.test.ts`: Unit tests for `AUDIT_RETENTION_LOCK_KEY` (BigInt stability) and `createAuditRetentionJob` lifecycle (idempotent start/stop, run-while-stopped returns `{ deleted: 0 }`). No findings.
- `packages/auth/src/__tests__/audit-retention.integration.test.ts`: Phase 2 integration tests for purge boundary (keep-at-cutoff, purge-before-cutoff), batch iteration (single and multi-batch), and audit self-recording. All SQL uses Drizzle parameterized `sql` template literals. `DIRECT_DATABASE_URL` presence check only (line 62). No findings.

## Anti-Pattern Checks

- **A2 (consent-blind publish gate):** Not applicable. Batch contains auth package test files only; no publish/status-change logic, no named subjects, no consent artifact requirements.
- **A6 (registry overstatement):** Checked `measure/tracks.md` lines 59-61 (Shared Foundation Review entry). The registry entry accurately states the track was "reopened 2026-06-27" for line-by-line review and does not claim any security state as "resolved." No overstatement.
