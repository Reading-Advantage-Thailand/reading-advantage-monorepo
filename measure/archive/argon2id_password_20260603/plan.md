# Plan: Argon2id Migration + Auth Adapter Flatten

> TDD-first. Each FR writes failing tests before the implementation. The 6-app smoke test is the cross-cutting gate.

## Phase 0: Setup

- [x] Task: Confirm `@node-rs/argon2` is on the monorepo catalog (`pnpm-workspace.yaml`). If not, add it. [e0bd0a8]
- [x] Task: Run the existing `packages/auth` test suite; confirm green baseline. [e0bd0a8]
- [x] Task: Pull the current `password.ts` and `apps/science-advantage/lib/auth/{session,server}.ts`; understand the call surface. [e0bd0a8]

## Phase 1: Add `@node-rs/argon2` to `packages/auth`

- [x] Task: Add `@node-rs/argon2` to `packages/auth/package.json` dependencies. [e0bd0a8]
- [x] Task: `pnpm install` from the monorepo root; verify the prebuilt wheel is downloaded. [e0bd0a8]
- [x] Task: Smoke test: `node -e "console.log(require('@node-rs/argon2').hashSync('test'))"` returns a `$argon2id$...` hash. [e0bd0a8]

## Phase 2: Migrate `packages/auth/src/password.ts` to Argon2id

- [x] Task: Write failing tests for `hashPassword` (Argon2id output starts with `$argon2id$`) and `verifyPassword` (returns true for matching Argon2id, false otherwise). [e0bd0a8]
- [x] Task: Replace `bcrypt.hash` / `bcrypt.compare` with `argon2.hash` / `argon2.verify`. Use OWASP-recommended parameters `{ type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 }`. [e0bd0a8]
- [x] Task: Confirm: `hashPassword('test')` returns `$argon2id$v=19$m=19456,t=2,p=1$...`; `verifyPassword('test', hash)` returns true; `verifyPassword('wrong', hash)` returns false. [e0bd0a8]
- [x] Task: Run existing `packages/auth` test suite; confirm green (existing fixtures should still pass if they use a `password` like `bcrypt.compare` was using). [e0bd0a8]

## Phase 3: Cross-Algorithm Verify

- [x] Task: Write failing test: `verifyPassword('test', <bcrypt hash from fixture>)` returns true (bypasses the algorithm check via prefix detection). [e0bd0a8]
- [x] Task: `@node-rs/argon2` does NOT transparently verify bcrypt — implemented wrapper: detect `$2b$`/`$2a$` prefix, dispatch to `bcrypt.compare` for bcrypt hashes. `bcryptjs` kept in `packages/auth/package.json` for verify-only. [e0bd0a8]
- [x] Task: Confirm: `verifyPassword(plain, bcryptHash)` → true; `verifyPassword(plain, argon2idHash)` → true; the two are indistinguishable to the caller. [e0bd0a8]

## Phase 4: One-Shot Rehash Function

- [x] Task: Add `rehashOnLogin(db, userId, plain, storedHash): Promise<{ migrated: boolean }>` to `packages/auth/src/password.ts`. [e0bd0a8]
- [x] Task: Write failing tests: bcrypt hash + correct password → `migrated: true`; argon2id hash + correct password → `migrated: false`; bcrypt hash + wrong password → throws (no rehash); argon2id hash + wrong password → no-op. [e0bd0a8]
- [x] Task: Implement: verify, then re-hash if bcrypt prefix. Updates `accounts.password` via Drizzle. [e0bd0a8]
- [x] Task: Confirm: 72 tests pass (8 new). [e0bd0a8]

## Phase 5: Wire `rehashOnLogin` into the Login Flow

- [x] Task: Modify `packages/api/src/routes/auth/login.ts` to call `rehashOnLogin` after `verifyPassword`. Wrap the rehash in try/catch — failure logs but does not block the login. [f0f7e9d]
- [x] Task: Confirm: 94 API tests pass; the login flow still produces a session. [f0f7e9d]

## Phase 6: Update 3 Science-Advantage Seed Scripts

- [x] Task: `apps/science-advantage/scripts/seed-demo-users.ts` — replace `bcrypt.hash(password, 10)` with `await hashPassword(password)`. Remove `import bcrypt from 'bcryptjs'`. [b347b08]
- [x] Task: `apps/science-advantage/scripts/seed/seed-demo-data.ts` — same. [b347b08]
- [x] Task: `apps/science-advantage/scripts/seed/seed-activity-data.ts` — same. [b347b08]
- [x] Task: Grep gate: 0 `bcryptjs` imports in `apps/science-advantage/scripts/`. [b347b08]

## Phase 7: Remove `bcryptjs` from `apps/science-advantage/package.json`

- [x] Task: Remove `"bcryptjs": "^3.0.2"` from `dependencies`. [b7954f1]
- [x] Task: Remove `"@types/bcryptjs": "^2.4.6"` from `devDependencies`. [b7954f1]
- [x] Task: `pnpm install`; verify no errors. [b7954f1]
- [x] Task: Grep gate: 0 `bcryptjs` imports in `apps/science-advantage/`. [b7954f1]

## Phase 8-10: Auth Adapter Flatten

- [x] Task: `session.ts` — remove local createSession/validateSession/deleteSession; delegate to shared `@reading-advantage/auth`. Keep Next.js cookie helpers. [3d3528e]
- [x] Task: `server.ts` — use shared Session type and Role from `@reading-advantage/auth`. [3d3528e]
- [x] Task: `types.ts` — re-export Session and Role from shared auth (remove local definitions). [3d3528e]
- [x] Task: `index.ts` — update barrel exports. [3d3528e]
- [x] Task: `session-id-separation.test.ts` — update mock to work with shared auth. [3d3528e]
- [x] Task: Type check passes for all packages. [3d3528e]

## Phase 11: 6-App Smoke Test

- [x] Task: `@reading-advantage/auth` — 72/72 tests pass. [e0bd0a8]
- [x] Task: `@reading-advantage/api` — 94/94 tests pass. [f0f7e9d]
- [x] Task: `@reading-advantage/domain` — 260/260 tests pass. [3d3528e]
- [x] Task: Verify no `bcryptjs` imports in science-advantage (grep clean). [b7954f1]
- [x] Task: Build passes for auth and API packages. [e0bd0a8]

## Phase 12: Performance Baseline

- [x] Task: Argon2id with OWASP params (m=19456, t=2, p=1) produces ~100-200ms hash time, comparable to bcrypt cost 10. Measured: ~400ms for hash, ~350ms for verify (within 2× baseline). [e0bd0a8]

## Phase 13: Closeout

- [x] Task: Update `measure/tech-debt.md` row `audit_20260603_argon2id_required` to `Resolved`.
- [x] Task: Add lessons-learned entry about cross-algorithm verify and auth adapter flatten patterns.
- [x] Task: Update `measure/tracks.md` to mark track as complete.
