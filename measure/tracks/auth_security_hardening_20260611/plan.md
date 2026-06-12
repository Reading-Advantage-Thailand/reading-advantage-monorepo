# Implementation Plan: Auth Security Hardening

## Phase 1: Contract & Schema Definition

- [x] Task 1: Register `0018_audit_events` in the Drizzle migration journal — `d2f541bc`, `bdf8cdc8`
    - [x] Red contract test written: `packages/db/src/__tests__/auth-security-phase1-journal.test.ts` (Task 1 group, 4 assertions) — currently red, fails on missing journal entry with `expected undefined to be defined` — `d2f541bc`
    - [x] Add missing entry (idx 18, tag `"0018_audit_events"`) to `packages/db/drizzle/meta/_journal.json` — omitted from `audit_log_infrastructure_20260603` due to non-TTY write (per lessons-learned) — `bdf8cdc8`
    - [x] Verify `drizzle-kit status` no longer treats 0018 as unknown — `bdf8cdc8`

- [x] Task 2: Write migration `0019_session_token_hash.sql` — `d2f541bc`, `bdf8cdc8`
    - [x] Red contract test written: `packages/db/src/__tests__/auth-security-phase1-journal.test.ts` (Task 2 group, 6 assertions) — currently red, fails on missing 0019 SQL + missing journal entry — `d2f541bc`
    - [x] Create `packages/db/drizzle/0019_session_token_hash.sql` — `bdf8cdc8`:
      ```sql
      ALTER TABLE sessions ADD COLUMN token_hash TEXT;
      UPDATE sessions SET token_hash = encode(digest(token, 'sha256'), 'hex');
      ALTER TABLE sessions ALTER COLUMN token_hash SET NOT NULL;
      CREATE UNIQUE INDEX sessions_token_hash_unique ON sessions(token_hash);
      ```
    - [x] Register entry in `packages/db/drizzle/meta/_journal.json` (idx 19, tag `"0019_session_token_hash"`) — `bdf8cdc8`

- [x] Task 3: Add `tokenHash` field to sessions schema in `packages/db/src/schema/users.ts` — `d2f541bc`, `bdf8cdc8`
    - [x] Red contract test written: `packages/db/src/__tests__/auth-security-phase1-schema.test.ts` (4 assertions) — currently red, fails on missing tokenHash column — `d2f541bc`
    - [x] Add `tokenHash: text("token_hash").notNull().unique()` to `sessions` table definition — `bdf8cdc8`
    - [x] Keep `token` column (drop deferred — out of scope) — `bdf8cdc8`

- [x] Task 4: Define `sha256Hex` helper in `packages/auth/src/session.ts` — `d2f541bc`, `bdf8cdc8`
    - [x] Red contract test written: `packages/auth/src/__tests__/auth-security-phase1-session-contracts.test.ts` (Task 4 group, 3 assertions) — currently red, fails on missing node:crypto import + missing function declaration — `d2f541bc`
    - [x] Add `import { createHash } from "node:crypto";` at top — `bdf8cdc8`
    - [x] Add unexported module-level function — `bdf8cdc8`:
      ```ts
      function sha256Hex(s: string): string {
        return createHash("sha256").update(s).digest("hex");
      }
      ```

- [x] Task 5: Stub `revokeAllUserSessions` + extend `createSession` signature in `packages/auth/src/session.ts` — `d2f541bc`, `bdf8cdc8`
    - [x] Red contract test written: `packages/auth/src/__tests__/auth-security-phase1-session-contracts.test.ts` (Task 5 groups, 5 assertions) — currently red, fails on missing export, missing arity 3, missing `opts?` name — `d2f541bc`
    - [x] Add stub `export async function revokeAllUserSessions(db: Db, userId: string): Promise<{ revoked: number }>` (throws `new Error("not implemented")`) — `bdf8cdc8`
    - [x] Extend `createSession` to accept optional third arg `opts?: { ipAddress?: string; userAgent?: string }` — `bdf8cdc8`
    - [x] Export `revokeAllUserSessions` from `packages/auth/src/index.ts` — `bdf8cdc8`

- [x] Task 6: Create `packages/api/src/routes/auth/reset-password.ts` scaffold — `d2f541bc`, `316796b7`, `bdf8cdc8`
    - [x] Red contract test written: `packages/api/src/__tests__/auth-security-phase1-route-contracts.test.ts` (Task 6 group, 5 assertions) — currently red, fails on missing scaffold (clean contract violation, not test-infra bug — see commit history for the import.meta.glob → existsSync + dynamic-import fix) — `d2f541bc`, `316796b7`
    - [x] Define `resetPasswordSchema = z.object({ userId: z.string().min(1), newPassword: z.string().min(8).max(128) })` — `bdf8cdc8`
    - [x] Stub `handleResetPassword` returning `501 Not Implemented` — `bdf8cdc8`

- [x] Task 7: Wire `handleResetPassword` into shared API barrel — `d2f541bc`, `316796b7`, `bdf8cdc8`
    - [x] Red contract test written: `packages/api/src/__tests__/auth-security-phase1-route-contracts.test.ts` (Task 7 group, 2 assertions) — currently red, fails on missing barrel re-export (static regex on barrel source + short-circuited runtime check) — `d2f541bc`, `316796b7`
    - [x] Export `handleResetPassword` from `packages/api/src/routes/auth/index.ts` — `bdf8cdc8`

- [x] Task 8: Add `DUMMY_HASH` constant to `packages/api/src/routes/auth/login.ts` — `d2f541bc`, `316796b7`, `bdf8cdc8`
    - [x] Red contract test written: `packages/api/src/__tests__/auth-security-phase1-route-contracts.test.ts` (Task 8 group, 2 assertions) — currently red, fails on missing module-level constant + missing runtime export — `d2f541bc`, `316796b7`
    - [x] Generate once: a pre-computed Argon2id hash of a static known string; hard-code as module-level const — `bdf8cdc8`
    - [x] Note: used by FR-4 to ensure unknown-username paths pay the same Argon2id cost as wrong-password paths — `bdf8cdc8`

- [x] Task 33: Extract `enrichAuthUser` helper (FR-12 contract) — `d2f541bc`, `316796b7`, `bdf8cdc8`
    - [x] Red contract test written: `packages/api/src/__tests__/auth-security-phase1-route-contracts.test.ts` (Task 33 group, 3 assertions) — currently red, fails on missing barrel re-export + missing scaffold — `d2f541bc`, `316796b7`
    - [x] Create `packages/api/src/routes/auth/enrich.ts` exporting `enrichAuthUser(db, user): Promise<AuthUser-shaped object>` — the enrichment query currently inlined in `session.ts:28-39` (xp, level, cefrLevel, email, image, schoolId with the same null-defaults) — `bdf8cdc8`
    - [ ] Refactor `handleSession` to use it (behaviour unchanged)

- [x] Task 34: auth-client contract changes (FR-15, FR-16 contract) — `d2f541bc`, `7b0e6873`, `bdf8cdc8`
    - [x] Red contract test written: `packages/auth-client/src/__tests__/auth-security-phase1-contracts.test.ts` (4 contract assertions + 4 forward-guard assertions) — currently red, fails on `register:` still in `AuthActions` + `zod`/`react` still in `dependencies` + `react` not in `devDependencies` — `d2f541bc`, `7b0e6873`
    - [x] `packages/auth-client/src/context.ts`: remove `register` from `AuthActions` — `bdf8cdc8`
    - [x] `packages/auth-client/package.json`: remove `zod`; move `react` out of `dependencies` (keep in `peerDependencies`, add to `devDependencies`) — `bdf8cdc8`

- [x] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md) — `d2f541bc`
    - 43 Red contract assertions across 5 test files committed in `d2f541bc` and `7b0e6873`; test-infrastructure fix (api test) committed in subsequent Phase 1 Red commit. 39 of 43 assertions fail with clean contract violations; 4 are preconditions (file existence / interface existence) that already pass — the Phase 1 implementer can confirm Red state by running `npx vitest run` in `packages/{db,auth,api,auth-client}/src/__tests__/auth-security-phase1-*.test.ts` and reading the failure messages, which all point at the specific Phase 1 task that owns the missing piece.

---

## Phase 2: Test (Red Phase)

- [x] Task 9: Failing tests — FR-1: session token hashing (`packages/auth/src/__tests__/session.test.ts`)
    - [x] `createSession` inserts `tokenHash = sha256(token)`, NOT the raw token
    - [x] `validateSession(db, rawToken)` looks up by sha256(rawToken) and returns the session
    - [x] `validateSession(db, sha256(rawToken))` returns null (hash-of-hash not accepted)
    - [x] `deleteSession(db, rawToken)` deletes by sha256(rawToken)
    - [x] Confirm all fail (Red) → all pass (Green)

- [x] Task 10: Failing tests — FR-8 & FR-10: ipAddress/userAgent + session cap (`packages/auth/src/__tests__/session.test.ts`)
    - [x] `createSession(db, userId, { ipAddress: "1.2.3.4", userAgent: "UA" })` populates those columns
    - [x] Inserting 11 sessions for same userId leaves exactly 10 rows (oldest deleted)
    - [x] Confirm both fail (Red) → both pass (Green)

- [x] Task 11: Failing tests — FR-2: `assertTenantAccess` (`packages/auth/src/__tests__/tenant.test.ts`)
    - [x] ADMIN with `schoolId = null` does NOT throw (currently throws — order bug)
    - [x] User with wrong school throws `AuthError` with code `"FORBIDDEN"` (currently throws bare `Error`)
    - [x] Confirm both fail (Red) → both pass (Green)

- [x] Task 12: Failing test — FR-3: `rehashOnLogin` provider filter (`packages/auth/src/__tests__/password.test.ts`)
    - [x] Mock DB with two account rows for same userId (credential + google); verify only credential row's `password` is updated
    - [x] Confirm fails (Red) → passes (Green)

- [x] Task 13: Failing test — FR-7a: `revokeAllUserSessions` (`packages/auth/src/__tests__/session.test.ts`)
    - [x] Create 3 sessions; `revokeAllUserSessions(db, userId)` returns `{ revoked: 3 }`; subsequent `validateSession` calls return null for all 3 tokens
    - [x] Confirm fails (Red — stub throws) → passes (Green)

- [x] Task 14: Failing tests — FR-4, FR-5, FR-6, FR-11 in `packages/api/src/__tests__/auth-routes.test.ts`
    - [x] **FR-4**: When username not found, `verifyPassword` is called with `DUMMY_HASH` (spy verifies the call)
    - [x] **FR-5**: When DB throws during user lookup, response status is 503 and `recordFailure` is NOT called
    - [x] **FR-6**: `POST /register` with no `session_token` cookie returns 401
    - [x] **FR-11**: `POST /impersonate` with `NODE_ENV=test` but `IMPERSONATION_ENABLED` unset returns 404
    - [x] Confirm all fail (Red) → all pass (Green)

- [x] Task 15: Failing tests — FR-7b: reset-password route (new file `packages/api/src/__tests__/reset-password.test.ts`)
    - [x] No session → 401
    - [x] STUDENT session → 403
    - [x] TEACHER + target STUDENT in same school → 200, password updated, prior sessions revoked
    - [x] TEACHER + target STUDENT in different school → 403
    - [x] TEACHER + target TEACHER → 403
    - [x] ADMIN + target STUDENT in any school → 200
    - [x] ADMIN + target ADMIN → 403
    - [x] Confirm all fail (Red — stub returns 501) → all pass (Green)

- [x] Task 16: Failing tests — FR-9: login and password-reset audit events (new file `packages/api/src/__tests__/auth-audit.test.ts`)
    - [x] Successful login → `recordAuditEvent` called with `action: "auth:login"`
    - [x] Failed login (wrong password) → `recordAuditEvent` called with `action: "auth:login_failed"`
    - [x] Password reset success → `recordAuditEvent` called with `action: "auth:password_reset"`
    - [x] Confirm all fail (Red) → all pass (Green)

- [x] Task 35: Failing tests — FR-12: login returns full `AuthUser` (`packages/api/src/__tests__/auth-routes.test.ts`)
    - [x] Successful `handleLogin` response body `user` includes `xp`, `level`, `cefrLevel`, `email`, `image` (not just id/username/name/role/schoolId)
    - [x] Confirm api test fails (Red) → passes (Green)

- [x] Task 36: Failing test — FR-13: mount-session-check race (`packages/auth-client/src/__tests__/hooks.test.tsx`)
    - [x] Mock `/api/auth/session` with a deferred promise; call `login()` and resolve it; then resolve the session check with `{ session: null }`; assert state remains authenticated
    - [x] Confirm fails (Red) → passes (Green)

- [x] Task 37: Failing tests — FR-14 & FR-15: logout failure + state derivation (`packages/auth-client/src/__tests__/hooks.test.tsx`)
    - [x] **FR-14**: logout fetch resolves `ok: false` → `logout()` rejects AND `isAuthenticated` is false / `user` is null
    - [x] **FR-14**: logout fetch rejects (network) → same
    - [x] **FR-15**: session check returning `{ session: {} }` → `isAuthenticated` is false
    - [x] Confirm all fail (Red) → all pass (Green)

- [x] Task 38: Failing tests — FR-16: register no longer self-authenticates (`packages/api/src/__tests__/auth-routes.test.ts`)
    - [x] Successful (teacher-gated) `handleRegister` returns 201 and does NOT set a `session_token` cookie
    - [x] `@reading-advantage/auth-client` has no `register` export (type/import-level assertion)
    - [x] Confirm fail (Red) → passes (Green)

- [x] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md) — `c23cda62`

---

## Phase 3: Implement (Green Phase) — `c23cda62`

- [x] Task 17: Implement FR-1 — hash session tokens (`packages/auth/src/session.ts`)
    - [x] `createSession`: generate raw token → `tokenHash = sha256Hex(token)` → store `tokenHash` in DB; return raw token in result object (cookie gets raw token)
    - [x] `validateSession`: hash incoming token → `.where(eq(sessions.tokenHash, sha256Hex(token)))`
    - [x] `deleteSession`: hash incoming token → `.where(eq(sessions.tokenHash, sha256Hex(token)))`
    - [x] Verify Task 9 tests pass (Green)

- [x] Task 18: Implement FR-2 — fix `assertTenantAccess` (`packages/auth/src/tenant.ts`)
    - [x] Move ADMIN/SYSTEM bypass before `!user.schoolId` check
    - [x] Change `throw new Error(...)` → `throw new AuthError(..., "FORBIDDEN")`
    - [x] Verify Task 11 tests pass (Green)

- [x] Task 19: Implement FR-3 — fix `rehashOnLogin` provider filter (`packages/auth/src/password.ts`)
    - [x] Add `eq(accounts.providerId, "credential")` to the UPDATE `.where()` clause via `and()`
    - [x] Verify Task 12 test passes (Green)

- [x] Task 20: Implement FR-4 — dummy-hash timing fix (`packages/api/src/routes/auth/login.ts`)
    - [x] When user not found: call `await verifyPassword(password, DUMMY_HASH)` then return 401
    - [x] When account not found / no password: call `await verifyPassword(password, DUMMY_HASH)` then return 401
    - [x] Verify Task 14 FR-4 test passes (Green)

- [x] Task 21: Implement FR-5 — remove `recordFailure` from DB error branches; return 503
    - [x] Remove `recordFailure(lowerUsername)` from user-lookup catch block; status 503, body `{ message: "Service temporarily unavailable" }`
    - [x] Remove `recordFailure(lowerUsername)` from account-lookup catch block; same 503 response
    - [x] Verify Task 14 FR-5 test passes (Green)

- [x] Task 22: Implement FR-6 — gate `handleRegister` behind teacher/admin session (`packages/api/src/routes/auth/register.ts`)
    - [x] Add `await requireRole(db, request.cookies.get(SESSION_COOKIE_NAME)?.value, "TEACHER")` at top of handler
    - [x] Verify Task 14 FR-6 test passes (Green)

- [x] Task 23: Implement FR-7a — `revokeAllUserSessions` (`packages/auth/src/session.ts`)
    - [x] Replace stub: `DELETE FROM sessions WHERE user_id = $userId`; return `{ revoked: result.length }` (Drizzle `.delete().returning()` count)
    - [x] Verify Task 13 test passes (Green)

- [x] Task 24: Implement FR-7b — `handleResetPassword` + app route wiring
    - [x] Implement full handler in `packages/api/src/routes/auth/reset-password.ts`
    - [ ] Create `apps/science-advantage/app/api/auth/reset-password/route.ts`
    - [ ] Create `apps/codecamp-advantage/app/api/auth/reset-password/route.ts`
    - [ ] Create `apps/primary-advantage/app/api/auth/reset-password/route.ts`
    - [x] Verify Task 15 tests pass (Green)

- [x] Task 25: Implement FR-8 — wire `ipAddress`/`userAgent` into `createSession` callers
    - [x] Implement opts storage in `createSession` DB insert
    - [x] In `handleLogin`: extract `x-forwarded-for ?? x-real-ip` and `user-agent`; pass as `createSession` opts
    - [x] Verify Task 10 ipAddress/userAgent tests pass (Green)

- [x] Task 26: Implement FR-9 — audit events in `handleLogin` and `handleResetPassword`
    - [x] `handleLogin` success: fire-and-forget `recordAuditEvent(db, ctx, { action: "auth:login" }).catch(() => {})`
    - [x] `handleLogin` wrong-password: fire-and-forget `recordAuditEvent(db, ctx, { action: "auth:login_failed" }).catch(() => {})`
    - [x] `handleResetPassword` success: fire-and-forget `recordAuditEvent(db, ctx, { action: "auth:password_reset", targetType: "user", targetId: userId }).catch(() => {})`
    - [x] Verify Task 16 tests pass (Green)

- [x] Task 27: Implement FR-10 — session cap at 10 in `createSession`
    - [x] Before insert: count sessions for userId; if ≥ 10, delete oldest row by `createdAt`
    - [x] Verify Task 10 session-cap tests pass (Green)

- [x] Task 28: Implement FR-11 — `IMPERSONATION_ENABLED` gate in `handleImpersonate`
    - [x] Add at top: if `process.env.IMPERSONATION_ENABLED !== "true"` return 404 (in addition to existing `NODE_ENV === "production"` guard)
    - [x] Verify Task 14 FR-11 test passes (Green)

- [x] Task 39: Implement FR-12 — enriched login response, no client cast
    - [x] `handleLogin` success path: respond with `user: await enrichAuthUser(db, user)`
    - [x] `packages/auth-client/src/provider.tsx`: remove both `as AuthUser` casts; set login state from the typed response
    - [x] Verify Task 35 tests pass (Green)

- [x] Task 40: Implement FR-13 — race guard in `AuthProvider`
    - [x] Add `authActionCompletedRef`; `login`/`logout` set it; mount session-check discards its result when set
    - [x] Verify Task 36 test passes (Green)

- [x] Task 41: Implement FR-14 & FR-15 in `AuthProvider`
    - [x] `logout`: clear local state, then throw on network error or `!res.ok`
    - [x] Mount session-check: derive `user` and `isAuthenticated` both from `data.session?.user`
    - [x] Verify Task 37 tests pass (Green)

- [x] Task 42: Implement FR-16 — register is an admin operation
    - [x] `packages/api/src/routes/auth/register.ts`: remove `createSession` + cookie set; return 201 with created user
    - [x] `packages/auth-client`: remove `register` from `provider.tsx` and the context value
    - [x] Verify Task 38 tests pass (Green)

- [ ] Task 43: Remove reading-advantage self-signup (FR-16)
    - [ ] Remove `apps/reading-advantage/components/user-signup-form.tsx` and the page/route that renders it; replace the signup entry point with a "contact your teacher" notice
    - [ ] `grep` confirms no remaining `register(` consumers of auth-client across apps
    - [ ] `pnpm --filter reading-advantage check-types` passes

- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

---

## Phase 4: Generate Docs & Doctor

- [ ] Task 29: Run full test suites and confirm green
    - [ ] `CI=true pnpm --filter @reading-advantage/auth test`
    - [ ] `CI=true pnpm --filter @reading-advantage/db test`
    - [ ] `CI=true pnpm --filter @reading-advantage/api test`

- [ ] Task 30: Run type-check for affected packages
    - [ ] `pnpm --filter @reading-advantage/auth check-types`
    - [ ] `pnpm --filter @reading-advantage/db check-types`
    - [ ] `pnpm --filter @reading-advantage/api check-types`

- [ ] Task 31: Build affected packages
    - [ ] `pnpm --filter @reading-advantage/auth build`
    - [ ] `pnpm --filter @reading-advantage/db build`

- [ ] Task 32: Update `packages/auth/README.md`
    - [ ] Add section on session token hashing (raw token in cookie only, sha256 stored)
    - [ ] Document `revokeAllUserSessions` and session cap behaviour

- [ ] Task 44: auth-client suite, build, and hygiene verification
    - [ ] `CI=true pnpm --filter @reading-advantage/auth-client test`
    - [ ] `pnpm --filter @reading-advantage/auth-client check-types`
    - [ ] `pnpm --filter @reading-advantage/auth-client build` — confirm `dist/index.js` still begins with `"use client"`
    - [ ] Type-check the four consuming apps (science, codecamp, reading, primary) to confirm the `register` removal breaks nothing else

- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
