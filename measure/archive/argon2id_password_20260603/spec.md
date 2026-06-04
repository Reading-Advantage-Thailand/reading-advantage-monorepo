# Specification: Argon2id Migration + Auth Adapter Flatten

## Overview

Migrate `packages/auth/src/password.ts` from `bcryptjs` to `@node-rs/argon2` per AGENTS.md §4.4 ("Password hashing uses Argon2id (verify in `packages/auth`)"). Provide a one-shot migration path for existing bcrypt hashes (verify with bcrypt on the next successful login, re-hash with Argon2id in the same transaction). Update 3 science-advantage seed scripts that hand-roll `bcrypt.hash` to call the shared `hashPassword` instead. Remove `bcryptjs` from `apps/science-advantage/package.json` production deps. **Simultaneously flatten the local `apps/science-advantage/lib/auth/{session,server}.ts` wrapper** by deleting it and re-pointing the 22 callers to `@reading-advantage/auth` directly.

## Problem

Audited 2026-06-03. Three findings, all rooted in the same architectural gap:

### F-406 (Critical, shared)
- `packages/auth/src/password.ts:1,11,25` — `import bcrypt from "bcryptjs"`, `bcrypt.hash(password, SALT_ROUNDS)`, `bcrypt.compare(password, hash)`. `packages/auth/package.json:20` — `"bcryptjs": "^2.4.3"` in dependencies.
- AGENTS.md §4.4 explicitly requires Argon2id. `bcryptjs` is the highest-cost password hasher in common use; Argon2id is the modern standard.
- The same `password.ts` is consumed by 6 apps: reading-advantage, primary-advantage, www-reading-advantage, codecamp-advantage, advantage-games, science-advantage.
- One PR migrates the shared package and unblocks all 6 apps.

### F-402 (Critical)
- `apps/science-advantage/package.json:56` declares `"bcryptjs": "^3.0.2"` in `dependencies` (production). `package.json:82` has `@types/bcryptjs` in devDependencies.
- 3 seed scripts hand-roll `bcrypt.hash(password, 10)`:
  - `apps/science-advantage/scripts/seed-demo-users.ts:2,9`
  - `apps/science-advantage/scripts/seed/seed-demo-data.ts:2,36`
  - `apps/science-advantage/scripts/seed/seed-activity-data.ts:2,44`
- The scripts work today only because `packages/auth/src/password.ts` happens to use the same library with the same cost factor. If `packages/auth` migrates to Argon2id, all 3 break and produce hashes the verifier cannot parse.

### F-401 (Low)
- `apps/science-advantage/lib/auth/session.ts:93-118` defines `setSessionCookie`, `getSessionToken`, `deleteSessionCookie` — all call `cookies()` and set/get/delete `SESSION_COOKIE_NAME` (imported from `@reading-advantage/auth` on line 9).
- `apps/science-advantage/lib/auth/server.ts:1-40` defines `requireAuth`, `requireRole`, `hasRole`, `getSession`.
- Both files are a 1-to-1 mirror of the auth-adapter surface; they exist for ergonomic reasons but introduce a layer of indirection that can drift.

## Why

- AGENTS.md §4.4 has mandated Argon2id since the monorepo was scaffolded. This track is the implementation.
- A single package migration has 6× leverage across apps. The other 5 apps do not have `bcryptjs` as a direct dep, so they only need the `packages/auth` change.
- F-401 is the lowest-hanging fruit in the entire audit: 4 files, ~150 lines, no behavior change. Bundling the F-401 cleanup with the Argon2id migration is cheap (the same call sites are being touched).
- The flat `lib/auth/session.ts` / `lib/auth/server.ts` files confuse new contributors about which auth surface to use. Removing them clarifies the architecture.

## Functional Requirements

### FR-1: Add `@node-rs/argon2` to `packages/auth`

- Add `@node-rs/argon2` to `packages/auth/package.json` dependencies. Pin the version per AGENTS.md §Version Policy.
- Add `@node-rs/argon2` to the monorepo catalog (`pnpm-workspace.yaml`) so the version is consistent across consumers.

### FR-2: Replace `bcryptjs` with `@node-rs/argon2` in `packages/auth/src/password.ts`

- New implementation: `hashPassword(plain: string): Promise<string>` uses `argon2.hash(plain, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })`. These are the OWASP-recommended parameters (2024).
- `verifyPassword(plain: string, hash: string): Promise<boolean>` uses `argon2.verify(hash, plain)`. `@node-rs/argon2` natively detects the hash algorithm from the prefix (`$argon2id$`, `$2b$` for bcrypt) and dispatches accordingly.
- Export the constants `ARGON2ID_OPTS = { type, memoryCost, timeCost, parallelism }` for testability.
- Existing test fixtures (baked-in bcrypt hashes) must continue to verify — the `verifyPassword` function transparently handles both algorithms.

### FR-3: One-Shot Migration Path

- A new function `rehashOnLogin(userId, plain): Promise<void>`:
  - Verifies the password against the stored hash (works for bcrypt OR argon2id).
  - If the stored hash is a bcrypt hash (`$2b$` prefix) AND verification succeeds, re-hash with Argon2id and `UPDATE users SET password = <new_hash> WHERE id = userId`.
  - If the stored hash is already Argon2id, no-op.
  - Returns `{ migrated: boolean, hash: string }` so the caller can log the migration event.
- Wire this into the login flow at `packages/api/src/routes/auth/login.ts:36-132`: after a successful `verifyPassword`, call `rehashOnLogin` if the hash is a bcrypt hash. The rehash is in the same transaction as the session creation; failure to rehash does not block the login (logged for follow-up).

### FR-4: Update 3 Science-Advantage Seed Scripts

- `apps/science-advantage/scripts/seed-demo-users.ts:2` — replace `import bcrypt from 'bcryptjs'` with `import { hashPassword } from '@reading-advantage/auth'`. Replace `await bcrypt.hash(password, 10)` with `await hashPassword(password)`.
- `apps/science-advantage/scripts/seed/seed-demo-data.ts:2,36` — same.
- `apps/science-advantage/scripts/seed/seed-activity-data.ts:2,44` — same.
- Confirm the 3 scripts run end-to-end via `pnpm db:seed` and the resulting data shape is unchanged.

### FR-5: Remove `bcryptjs` from `apps/science-advantage/package.json`

- Remove `"bcryptjs": "^3.0.2"` from `dependencies`.
- Remove `"@types/bcryptjs": "^2.4.6"` from `devDependencies`.
- Verify no other file in `apps/science-advantage/` imports `bcryptjs`. Grep gate: `rg -l "bcrypt" apps/science-advantage/` returns 0 hits.

### FR-6: Delete `apps/science-advantage/lib/auth/{session,server}.ts`

- `lib/auth/session.ts` (118 lines): the 3 cookie helpers + the local `Session` type.
- `lib/auth/server.ts` (40 lines): the `requireAuth`/`requireRole`/`hasRole`/`getSession` HOFs.
- All 22 call sites in `apps/science-advantage/` that import from `@/lib/auth/...` are re-pointed to `@reading-advantage/auth` directly.
- Mapping:
  - `setSessionCookie` → already in `@reading-advantage/auth`; use the shared helper.
  - `getSessionToken` → already in `@reading-advantage/auth`.
  - `deleteSessionCookie` → already in `@reading-advantage/auth`.
  - `requireAuth` → already in `@reading-advantage/auth`.
  - `requireRole` → already in `@reading-advantage/auth`.
  - `getCurrentSession` (the in-app helper that the routes use) → replaced with the shared `getSession` from `@reading-advantage/auth`. The local `Session` type is dropped; the shared return type is used.
  - `hasRole` → `roleAtLeast(role, required)` from `@reading-advantage/auth`.

### FR-7: Test the Rehash Path

- Integration test: create a user with a bcrypt hash → call `verifyPassword(plain, bcryptHash)` → confirm it returns true → call `rehashOnLogin(userId, plain)` → confirm the user's `password` column is now an Argon2id hash → call `verifyPassword(plain, newHash)` → confirm it returns true.
- Test: create a user with an Argon2id hash → call `rehashOnLogin` → confirm `migrated: false` and the hash is unchanged.
- Test: bcrypt verify with wrong password → `rehashOnLogin` does NOT rehash.
- Test: 6 apps' integration tests still pass (smoke-test each app's login flow against the new `password.ts`).

## Non-Functional Requirements

- **Zero `bcrypt` / `bcryptjs` imports** anywhere in `packages/auth/`, `apps/science-advantage/`, or any of the 5 other apps. Grep gate: `rg -l "from ['\"]bcrypt" packages/ apps/` returns 0 hits (modulo archived files).
- **`@node-rs/argon2` runs in the same Node.js process as the rest of `packages/auth`.** It is a native Rust module (N-API), so deployment artifacts must include the prebuilt binary. Verify the monorepo's Docker base image includes it (the existing `Dockerfile` uses `node:20-bookworm-slim` which has the prebuilt wheels for x86_64 and arm64).
- **No regression in login latency.** Argon2id with the OWASP-recommended parameters is ~100-200ms per hash, comparable to bcrypt cost 10. A load test confirms P99 login latency is within 2× of the bcrypt baseline.
- **All 6 apps' existing test suites pass** after the migration.
- **Lint + type-check + build** green for `packages/auth` and all 6 consuming apps.

## Acceptance Criteria

1. `packages/auth/src/password.ts` uses `@node-rs/argon2` (not `bcryptjs`).
2. `verifyPassword` transparently verifies both bcrypt (`$2b$` prefix) and Argon2id (`$argon2id$` prefix) hashes.
3. `rehashOnLogin` migrates bcrypt → Argon2id on next successful login.
4. The login flow at `packages/api/src/routes/auth/login.ts:36-132` calls `rehashOnLogin` after `verifyPassword`.
5. 0 `bcrypt` / `bcryptjs` imports in `apps/science-advantage/`.
6. `apps/science-advantage/lib/auth/session.ts` deleted.
7. `apps/science-advantage/lib/auth/server.ts` deleted.
8. All 22 call sites in `apps/science-advantage/` re-pointed to `@reading-advantage/auth` (grep gate: `rg -l "from ['\"]@/lib/auth" apps/science-advantage/` returns 0 hits).
9. The 3 seed scripts use `hashPassword` from `@reading-advantage/auth`.
10. `pnpm turbo run test --filter=@reading-advantage/auth` exits 0 with new + existing tests.
11. `pnpm turbo run test --filter=science-advantage` exits 0.
12. `pnpm turbo run test --filter=reading-advantage --filter=primary-advantage --filter=www-reading-advantage --filter=codecamp-advantage --filter=advantage-games` exits 0.
13. Integration test: `verifyPassword(plain, bcryptHash)` succeeds; `rehashOnLogin` migrates; subsequent `verifyPassword(plain, newHash)` succeeds.
14. Load test: P99 login latency is within 2× of pre-migration baseline.

## Out of Scope

- Argon2id parameter tuning beyond OWASP-recommended defaults. A future track may benchmark against specific hardware.
- Migrating the 6 apps' own test fixtures (they may have baked-in bcrypt hashes; verify transparently).
- The 23 hand-rolled `role ===` checks in `apps/science-advantage/app/` — separate track (Track 1).
- Per-IP rate limiting + captcha escalation — separate track (Track 10).
- Audit log writes on login/logout/password change — separate track (Track 4).

## Constraints & Risks

- **Risk: `@node-rs/argon2` is a native module; deployment artifacts need the prebuilt binary.** Mitigation: verify the existing Dockerfile and Cloud Run config pick up the prebuilt wheel; add a CI step that runs `node -e "require('@node-rs/argon2')"` as a smoke test.
- **Risk: 6 apps' integration tests have baked-in bcrypt hashes.** Mitigation: `verifyPassword` transparently handles both algorithms; no test fixture change required. Document in `packages/auth/README.md`.
- **Risk: The `rehashOnLogin` write is in the same transaction as the session creation. If the rehash fails, the login is at risk.** Mitigation: rehash is wrapped in a try/catch; failure logs to the structured logger (Track 9) but does not block the login. The user can log in again later to retry the rehash.
- **Risk: AGENTS.md §4.4 says Argon2id is the "default"; bcrypt is an "acceptable fallback".** Mitigation: This track removes the fallback. If the maintainer wants to keep bcrypt as a verification fallback, that's an explicit deviation (this track does not propose that).
- **Risk: `lib/auth/session.ts` deletion touches 22 call sites; some may be in components/ or scripts/.** Mitigation: use `rg` to enumerate all call sites before the deletion; batch the re-pointing into a single PR.
- **Cross-track dependency**: F-401 (auth wrapper flatten) is bundled with the Argon2id migration because the same call sites are being touched. Track 1 (App → Domain) does not need to complete first; this track is independent of `packages/domain`.

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 4 (F-401, F-402, F-406) and §Section 2 (F-206)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 3
- `packages/auth/src/password.ts` (the file to migrate)
- `packages/api/src/routes/auth/login.ts:36-132` (the login flow)
- `apps/science-advantage/lib/auth/{session,server}.ts` (the files to delete)
- AGENTS.md §4.4: "Argon2id (verify in `packages/auth`)"
- OWASP Password Storage Cheat Sheet (2024): Argon2id parameters `{ type: argon2id, memoryCost: 19456 KiB, timeCost: 2, parallelism: 1 }`
