# Implementation Plan: Auth Security Hardening

## Phase 1: Contract & Schema Definition

- [ ] Task 1: Register `0018_audit_events` in the Drizzle migration journal
    - [ ] Add missing entry (idx 18, tag `"0018_audit_events"`) to `packages/db/drizzle/meta/_journal.json` — omitted from `audit_log_infrastructure_20260603` due to non-TTY write (per lessons-learned)
    - [ ] Verify `drizzle-kit status` no longer treats 0018 as unknown

- [ ] Task 2: Write migration `0019_session_token_hash.sql`
    - [ ] Create `packages/db/drizzle/0019_session_token_hash.sql`:
      ```sql
      ALTER TABLE sessions ADD COLUMN token_hash TEXT;
      UPDATE sessions SET token_hash = encode(digest(token, 'sha256'), 'hex');
      ALTER TABLE sessions ALTER COLUMN token_hash SET NOT NULL;
      CREATE UNIQUE INDEX sessions_token_hash_unique ON sessions(token_hash);
      ```
    - [ ] Register entry in `packages/db/drizzle/meta/_journal.json` (idx 19, tag `"0019_session_token_hash"`)

- [ ] Task 3: Add `tokenHash` field to sessions schema in `packages/db/src/schema/users.ts`
    - [ ] Add `tokenHash: text("token_hash").notNull().unique()` to `sessions` table definition
    - [ ] Keep `token` column (drop deferred — out of scope)

- [ ] Task 4: Define `sha256Hex` helper in `packages/auth/src/session.ts`
    - [ ] Add `import { createHash } from "node:crypto";` at top
    - [ ] Add unexported module-level function:
      ```ts
      function sha256Hex(s: string): string {
        return createHash("sha256").update(s).digest("hex");
      }
      ```

- [ ] Task 5: Stub `revokeAllUserSessions` + extend `createSession` signature in `packages/auth/src/session.ts`
    - [ ] Add stub `export async function revokeAllUserSessions(db: Db, userId: string): Promise<{ revoked: number }>` (throws `new Error("not implemented")`)
    - [ ] Extend `createSession` to accept optional third arg `opts?: { ipAddress?: string; userAgent?: string }`
    - [ ] Export `revokeAllUserSessions` from `packages/auth/src/index.ts`

- [ ] Task 6: Create `packages/api/src/routes/auth/reset-password.ts` scaffold
    - [ ] Define `resetPasswordSchema = z.object({ userId: z.string().min(1), newPassword: z.string().min(8).max(128) })`
    - [ ] Stub `handleResetPassword` returning `501 Not Implemented`

- [ ] Task 7: Wire `handleResetPassword` into shared API barrel
    - [ ] Export `handleResetPassword` from `packages/api/src/routes/auth/index.ts`

- [ ] Task 8: Add `DUMMY_HASH` constant to `packages/api/src/routes/auth/login.ts`
    - [ ] Generate once: a pre-computed Argon2id hash of a static known string; hard-code as module-level const
    - [ ] Note: used by FR-4 to ensure unknown-username paths pay the same Argon2id cost as wrong-password paths

- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md)

---

## Phase 2: Test (Red Phase)

- [ ] Task 9: Failing tests — FR-1: session token hashing (`packages/auth/src/__tests__/session.test.ts`)
    - [ ] `createSession` inserts `tokenHash = sha256(token)`, NOT the raw token
    - [ ] `validateSession(db, rawToken)` looks up by sha256(rawToken) and returns the session
    - [ ] `validateSession(db, sha256(rawToken))` returns null (hash-of-hash not accepted)
    - [ ] `deleteSession(db, rawToken)` deletes by sha256(rawToken)
    - [ ] Confirm all fail (Red)

- [ ] Task 10: Failing tests — FR-8 & FR-10: ipAddress/userAgent + session cap (`packages/auth/src/__tests__/session.test.ts`)
    - [ ] `createSession(db, userId, { ipAddress: "1.2.3.4", userAgent: "UA" })` populates those columns
    - [ ] Inserting 11 sessions for same userId leaves exactly 10 rows (oldest deleted)
    - [ ] Confirm both fail (Red)

- [ ] Task 11: Failing tests — FR-2: `assertTenantAccess` (`packages/auth/src/__tests__/tenant.test.ts`)
    - [ ] ADMIN with `schoolId = null` does NOT throw (currently throws — order bug)
    - [ ] User with wrong school throws `AuthError` with code `"FORBIDDEN"` (currently throws bare `Error`)
    - [ ] Confirm both fail (Red)

- [ ] Task 12: Failing test — FR-3: `rehashOnLogin` provider filter (`packages/auth/src/__tests__/password.test.ts`)
    - [ ] Mock DB with two account rows for same userId (credential + google); verify only credential row's `password` is updated
    - [ ] Confirm fails (Red)

- [ ] Task 13: Failing test — FR-7a: `revokeAllUserSessions` (`packages/auth/src/__tests__/session.test.ts`)
    - [ ] Create 3 sessions; `revokeAllUserSessions(db, userId)` returns `{ revoked: 3 }`; subsequent `validateSession` calls return null for all 3 tokens
    - [ ] Confirm fails (Red — stub throws)

- [ ] Task 14: Failing tests — FR-4, FR-5, FR-6, FR-11 in `packages/api/src/__tests__/auth-routes.test.ts`
    - [ ] **FR-4**: When username not found, `verifyPassword` is called with `DUMMY_HASH` (spy verifies the call)
    - [ ] **FR-5**: When DB throws during user lookup, response status is 503 and `recordFailure` is NOT called
    - [ ] **FR-6**: `POST /register` with no `session_token` cookie returns 401
    - [ ] **FR-11**: `POST /impersonate` with `NODE_ENV=test` but `IMPERSONATION_ENABLED` unset returns 404
    - [ ] Confirm all fail (Red)

- [ ] Task 15: Failing tests — FR-7b: reset-password route (new file `packages/api/src/__tests__/reset-password.test.ts`)
    - [ ] No session → 401
    - [ ] STUDENT session → 403
    - [ ] TEACHER + target STUDENT in same school → 200, password updated, prior sessions revoked
    - [ ] TEACHER + target STUDENT in different school → 403
    - [ ] TEACHER + target TEACHER → 403
    - [ ] ADMIN + target STUDENT in any school → 200
    - [ ] ADMIN + target ADMIN → 403
    - [ ] Confirm all fail (Red — stub returns 501)

- [ ] Task 16: Failing tests — FR-9: login and password-reset audit events (new file `packages/api/src/__tests__/auth-audit.test.ts`)
    - [ ] Successful login → `recordAuditEvent` called with `action: "auth:login"`
    - [ ] Failed login (wrong password) → `recordAuditEvent` called with `action: "auth:login_failed"`
    - [ ] Password reset success → `recordAuditEvent` called with `action: "auth:password_reset"`
    - [ ] Confirm all fail (Red)

- [ ] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)

---

## Phase 3: Implement (Green Phase)

- [ ] Task 17: Implement FR-1 — hash session tokens (`packages/auth/src/session.ts`)
    - [ ] `createSession`: generate raw token → `tokenHash = sha256Hex(token)` → store `tokenHash` in DB; return raw token in result object (cookie gets raw token)
    - [ ] `validateSession`: hash incoming token → `.where(eq(sessions.tokenHash, sha256Hex(token)))`
    - [ ] `deleteSession`: hash incoming token → `.where(eq(sessions.tokenHash, sha256Hex(token)))`
    - [ ] Verify Task 9 tests pass (Green)

- [ ] Task 18: Implement FR-2 — fix `assertTenantAccess` (`packages/auth/src/tenant.ts`)
    - [ ] Move ADMIN/SYSTEM bypass before `!user.schoolId` check
    - [ ] Change `throw new Error(...)` → `throw new AuthError(..., "FORBIDDEN")`
    - [ ] Verify Task 11 tests pass (Green)

- [ ] Task 19: Implement FR-3 — fix `rehashOnLogin` provider filter (`packages/auth/src/password.ts`)
    - [ ] Add `eq(accounts.providerId, "credential")` to the UPDATE `.where()` clause via `and()`
    - [ ] Verify Task 12 test passes (Green)

- [ ] Task 20: Implement FR-4 — dummy-hash timing fix (`packages/api/src/routes/auth/login.ts`)
    - [ ] When user not found: call `await verifyPassword(password, DUMMY_HASH)` then return 401
    - [ ] When account not found / no password: call `await verifyPassword(password, DUMMY_HASH)` then return 401
    - [ ] Verify Task 14 FR-4 test passes (Green)

- [ ] Task 21: Implement FR-5 — remove `recordFailure` from DB error branches; return 503
    - [ ] Remove `recordFailure(lowerUsername)` from user-lookup catch block; status 503, body `{ message: "Service temporarily unavailable" }`
    - [ ] Remove `recordFailure(lowerUsername)` from account-lookup catch block; same 503 response
    - [ ] Verify Task 14 FR-5 test passes (Green)

- [ ] Task 22: Implement FR-6 — gate `handleRegister` behind teacher/admin session (`packages/api/src/routes/auth/register.ts`)
    - [ ] Add `await requireRole(db, request.cookies.get(SESSION_COOKIE_NAME)?.value, "TEACHER")` at top of handler
    - [ ] Verify Task 14 FR-6 test passes (Green)

- [ ] Task 23: Implement FR-7a — `revokeAllUserSessions` (`packages/auth/src/session.ts`)
    - [ ] Replace stub: `DELETE FROM sessions WHERE user_id = $userId`; return `{ revoked: result.length }` (Drizzle `.delete().returning()` count)
    - [ ] Verify Task 13 test passes (Green)

- [ ] Task 24: Implement FR-7b — `handleResetPassword` + app route wiring
    - [ ] Implement full handler in `packages/api/src/routes/auth/reset-password.ts`
    - [ ] Create `apps/science-advantage/app/api/auth/reset-password/route.ts`
    - [ ] Create `apps/codecamp-advantage/app/api/auth/reset-password/route.ts`
    - [ ] Create `apps/primary-advantage/app/api/auth/reset-password/route.ts`
    - [ ] Verify Task 15 tests pass (Green)

- [ ] Task 25: Implement FR-8 — wire `ipAddress`/`userAgent` into `createSession` callers
    - [ ] Implement opts storage in `createSession` DB insert
    - [ ] In `handleLogin`, `handleRegister`, `handleImpersonate`: extract `x-forwarded-for ?? x-real-ip` and `user-agent`; pass as `createSession` opts
    - [ ] Verify Task 10 ipAddress/userAgent tests pass (Green)

- [ ] Task 26: Implement FR-9 — audit events in `handleLogin` and `handleResetPassword`
    - [ ] `handleLogin` success: fire-and-forget `recordAuditEvent(db, ctx, { action: "auth:login" }).catch(() => {})`
    - [ ] `handleLogin` wrong-password: fire-and-forget `recordAuditEvent(db, ctx, { action: "auth:login_failed" }).catch(() => {})`
    - [ ] `handleResetPassword` success: fire-and-forget `recordAuditEvent(db, ctx, { action: "auth:password_reset", targetType: "user", targetId: userId }).catch(() => {})`
    - [ ] Verify Task 16 tests pass (Green)

- [ ] Task 27: Implement FR-10 — session cap at 10 in `createSession`
    - [ ] Before insert: count sessions for userId; if ≥ 10, delete oldest row by `createdAt`
    - [ ] Verify Task 10 session-cap tests pass (Green)

- [ ] Task 28: Implement FR-11 — `IMPERSONATION_ENABLED` gate in `handleImpersonate`
    - [ ] Add at top: if `process.env.IMPERSONATION_ENABLED !== "true"` return 404 (in addition to existing `NODE_ENV === "production"` guard)
    - [ ] Verify Task 14 FR-11 test passes (Green)

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

- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
