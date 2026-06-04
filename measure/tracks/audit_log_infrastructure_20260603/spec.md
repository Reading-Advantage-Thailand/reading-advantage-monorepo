# Specification: Audit Log Infrastructure

## Overview

Add an append-only `audit_events` table to the shared schema, plus a `recordAuditEvent(action, ctx, payload)` helper, and wire it into the security-sensitive entry points in `packages/auth` (login, logout, password change) and the destructive route handlers in `apps/science-advantage/` (assignment create/delete, student remove from roster, class delete). Fulfills AGENTS.md §4.7 ("Audit log table exists and `auth.login`, `auth.logout`, `auth.changePassword` write to it"), §9.4 ("Audit events are written for: login, logout, password change, permission change, billing event, destructive action"), and §9.5 ("Audit log table is append-only — no UPDATE/DELETE grants"). Fulfills `docs/prd/requirements.md:NFR9` ("comprehensive audit logging for all user actions and data access").

## Problem

Audited 2026-06-03. Findings F-404 (Critical) + F-901 (Critical) merged:

- **No `auditLog` / `audit_log` table** anywhere in the monorepo. `rg -l 'auditLog\|audit_log' packages/db/src/schema/` returns 0 hits. The 2 hits in `packages/db/src/__tests__/schema-parity.test.ts:1` are a comment referencing a porting-decision doc.
- **No audit writes** in any of the auth surface. `packages/auth/src/password.ts:hashPassword/verifyPassword` and `session.ts:createSession/validateSession/deleteSession` do not call any audit insert. `packages/api/src/routes/auth/login.ts:36-132` (the full login flow) ends with `NextResponse.json({ success: true, user: ... })` — no audit row.
- **No audit writes** in any destructive route handler. The 4 destructive handlers in science-advantage (assignment create/delete in `app/api/classes/[classId]/assignments/route.ts:POST/DELETE`, student remove in `app/api/classes/[classId]/roster/route.ts:DELETE`, class delete in `app/api/classes/[classId]/route.ts:DELETE`) are silent on destructive actions.
- Historical Prisma-era references in `docs/archive/architecture/security-performance.md:262, 277` describe an aspirational `lib/audit.ts` and `prisma.auditLog.create({...})` — neither exists in current code.

**Consequences:**
- **SOC 2 / district procurement**: the science product cannot be procured by districts that require SOC 2-equivalent audit trails. SOC 2 CC7.2 requires "monitoring of system components" and "detection of security events."
- **GDPR data-access requests**: a data subject access request (DSAR) requires the ability to enumerate all data accesses for a user. Without an audit log, this is impossible.
- **CCPA / FERPA compliance**: the same applies for parental access requests and student record disclosures.
- **Security incident response**: if a teacher's account is compromised, there is no record of which classes were accessed, which students' data was viewed, or which assignments were modified.

## Why

- AGENTS.md §4.7 + §9.4 + §9.5 have mandated the audit log since the monorepo was scaffolded. This track is the implementation.
- `docs/prd/requirements.md:NFR9` is a hard product requirement. The science product cannot ship to enterprise customers without it.
- A shared `audit_events` table is reusable across all 6 apps; one PR lands the infrastructure.

## Functional Requirements

### FR-1: `audit_events` Schema

Add a new file `packages/db/src/schema/audit.ts`:

```ts
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),  // null for system actions
  actorRole: text('actor_role').$type<Role>(),                                                 // null for system actions
  action: text('action').notNull(),                                                            // 'login', 'logout', 'class:delete', etc.
  targetType: text('target_type'),                                                             // 'class', 'assignment', 'user', etc.
  targetId: text('target_id'),                                                                 // string for cross-table flexibility
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // No UPDATE / DELETE — append-only. Enforced at the migration level via REVOKE.
  actorIdx: index('audit_events_actor_idx').on(t.actorUserId, t.createdAt),
  actionIdx: index('audit_events_action_idx').on(t.action, t.createdAt),
  targetIdx: index('audit_events_target_idx').on(t.targetType, t.targetId),
}));
```

Add `auditEvents` to the `packages/db/src/schema/index.ts` barrel.

### FR-2: REVOKE UPDATE, DELETE (Append-Only)

The Drizzle migration creates the table and immediately issues:

```sql
REVOKE UPDATE, DELETE ON audit_events FROM <app_role>;
```

This enforces the §9.5 append-only requirement at the database level. Any attempt to update or delete a row raises a Postgres permission error.

Document the revocation in the migration file's header comment with a `-- ADR: append-only audit log; see AGENTS.md §9.5` line.

### FR-3: `recordAuditEvent` Helper

Add a new file `packages/auth/src/audit.ts`:

```ts
export interface AuditContext {
  actorUserId: string | null;
  actorRole: Role | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuditPayload {
  action: string;                  // 'login', 'logout', 'class:delete', etc.
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuditEvent(
  ctx: AuditContext,
  payload: AuditPayload
): Promise<void> {
  await db.insert(auditEvents).values({
    actorUserId: ctx.actorUserId,
    actorRole: ctx.actorRole,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    action: payload.action,
    targetType: payload.targetType,
    targetId: payload.targetId,
    metadata: payload.metadata ?? {},
  });
}
```

Re-export from `packages/auth/src/index.ts` so consumers can `import { recordAuditEvent } from '@reading-advantage/auth'`.

### FR-4: Wire into `packages/auth/src/{password,session}.ts`

- `createSession(userId, ctx)` → after the session insert, call `recordAuditEvent({ actorUserId: userId, actorRole: ctx.role, ipAddress: ctx.ip, userAgent: ctx.ua }, { action: 'login', targetType: 'user', targetId: userId })`.
- `deleteSession(sessionId, ctx)` → call `recordAuditEvent({ actorUserId: ctx.userId, ... }, { action: 'logout', targetType: 'session', targetId: sessionId })`.
- `hashPassword(plain, ctx)` → call `recordAuditEvent({ actorUserId: ctx.userId, ... }, { action: 'password:change', targetType: 'user', targetId: ctx.userId })` (NEW; not in the current API — add an overload that accepts ctx).
- The existing call sites that do not pass `ctx` continue to work (backward-compatible signature); new call sites pass `ctx`.

### FR-5: Wire into `packages/api/src/routes/auth/login.ts`

- After `createSession`, call `recordAuditEvent` with the user's IP, user-agent, role, and a `metadata: { sessionId }` payload.
- The `recordAuditEvent` call is wrapped in try/catch — failure to write an audit row does not block the login (the user is authenticated; the audit row is a derived concern). The failure is logged to the structured logger (Track 9 prerequisite; for now, `console.error`).

### FR-6: Wire into 4 Destructive Science-Advantage Handlers

- `app/api/classes/[classId]/assignments/route.ts:POST` → call `recordAuditEvent` with `action: 'assignment:create'`, `targetType: 'assignment'`, `targetId: <newAssignmentId>`, `metadata: { lessonId, dueAt }`.
- `app/api/classes/[classId]/assignments/route.ts:DELETE` → call `recordAuditEvent` with `action: 'assignment:delete'`, `targetType: 'assignment'`, `targetId: <deletedId>`.
- `app/api/classes/[classId]/roster/route.ts:DELETE` → call `recordAuditEvent` with `action: 'class:remove_student'`, `targetType: 'class'`, `targetId: <classId>`, `metadata: { studentId }`.
- `app/api/classes/[classId]/route.ts:DELETE` → call `recordAuditEvent` with `action: 'class:delete'`, `targetType: 'class'`, `targetId: <classId>`.

**Coordination with Track 1**: if Track 1 has migrated these handlers to domain functions, the `recordAuditEvent` calls land in the domain functions (`packages/domain/src/classes/{create,delete}-assignment.ts`, etc.). If Track 1 is not yet complete, the calls land in the route handlers (this track's plan handles both cases).

### FR-7: Admin Query Surface (Phase 1 — read-only)

- A new route handler `GET /api/admin/audit-events?actorUserId=...&action=...&from=...&to=...` returns paginated audit events.
- Access restricted to ADMIN role via the new `requirePermission('audit:read:all')` HOF (Track 1 introduces this; if Track 1 is not yet complete, gate via `requireRole('ADMIN')`).
- Returns 200 with `{ events: [...], nextCursor }`. Filters are Zod-validated.
- Rate-limited at 60 req/min per admin user (use the existing in-memory rate limiter; Track 10 will replace with Postgres-backed).

## Non-Functional Requirements

- **Append-only at the DB level**: `UPDATE` and `DELETE` on `audit_events` raise a permission error for the app role.
- **Async-by-default**: `recordAuditEvent` is awaited but not blocking the user's primary action. A 50ms slowdown on login is acceptable; a 5s slowdown is not.
- **No PII in `metadata`**: redact `password`, `email`, `phone`, `ssn`, etc. before insert. Add a `safeMetadata(obj)` helper that strips known PII fields.
- **Retention**: keep audit events for 7 years (FERPA-aligned). A periodic cleanup job (separate sub-track) drops rows older than 7 years; this is **not** in scope for this track.
- **Index coverage**: actor, action, and target indexes support the admin query surface (FR-7).
- **Lint + type-check + build** green for `packages/db`, `packages/auth`, `packages/api`, and `apps/science-advantage`.

## Acceptance Criteria

1. `audit_events` table exists in `packages/db/src/schema/audit.ts` with the columns from FR-1.
2. The Drizzle migration creates the table + indexes + the `REVOKE UPDATE, DELETE` statement.
3. The migration is reversible: a down migration drops the table.
4. `recordAuditEvent` is exported from `packages/auth/src/index.ts`.
5. `createSession`, `deleteSession`, `hashPassword` call `recordAuditEvent` after their primary action.
6. `packages/api/src/routes/auth/login.ts` calls `recordAuditEvent` with the user's IP, user-agent, role, and session id.
7. The 4 destructive science-advantage handlers call `recordAuditEvent` with the appropriate `action`, `targetType`, `targetId`, and `metadata`.
8. `GET /api/admin/audit-events` returns paginated events filtered by `actorUserId`, `action`, `from`, `to`.
9. Integration tests:
   - Login → audit row exists with `action='login'`, `actorUserId=<user>`, `ipAddress=<test>`, `userAgent=<test>`, `metadata={ sessionId }`.
   - Logout → audit row exists with `action='logout'`.
   - Assignment create → audit row exists with `action='assignment:create'`, `targetId=<id>`.
   - Assignment delete → audit row exists with `action='assignment:delete'`, `targetId=<id>`.
   - Class delete → audit row exists with `action='class:delete'`, `targetId=<id>`.
   - Roster remove → audit row exists with `action='class:remove_student'`, `metadata={ studentId }`.
10. Direct DB test: `UPDATE audit_events SET action = 'tampered' WHERE id = ...` raises a Postgres permission error.
11. Direct DB test: `DELETE FROM audit_events WHERE id = ...` raises a Postgres permission error.
12. `pnpm turbo run test --filter=@reading-advantage/auth --filter=@reading-advantage/db --filter=science-advantage` exits 0.
13. `pnpm turbo run build --filter=science-advantage` exits 0.

## Out of Scope

- A periodic retention/cleanup job (FERPA 7-year retention) — separate sub-track.
- A bulk-export endpoint for DSAR (data subject access requests) — separate sub-track.
- Real-time audit event streaming to Sentry / SIEM — depends on Track 9 (Observability Stack).
- Audit log search by free-text (e.g. "find all events mentioning `studentId=abc`") — depends on Track 9 (OTel traces) and a search infra; out of scope.
- Per-app audit log policies (different retention per app) — out of scope; one policy for the monorepo.
- Audit log write to a separate DB for compliance isolation — out of scope; same Postgres cluster.

## Constraints & Risks

- **Risk: The 4 destructive handlers may be in `apps/science-advantage/lib/services/*` (post-Track 1) or in the route handlers (pre-Track 1).** Mitigation: this track has two parallel paths (route-level audit calls OR service-level audit calls). The maintainer picks the one that matches the Track 1 state.
- **Risk: `recordAuditEvent` failures could mask security events.** Mitigation: failures are logged but do not block the primary action. A separate monitoring concern (Track 9) can alert on high rates of `recordAuditEvent` failures.
- **Risk: `actorUserId` may be `null` for unauthenticated actions (e.g. failed login attempt with non-existent username).** Mitigation: the schema allows `null`; the actor is logged as "anonymous" via the `metadata` field.
- **Risk: PII leakage via `metadata`.** Mitigation: `safeMetadata(obj)` helper that strips known PII fields; doc the safe-keys list in `packages/auth/src/audit.ts`.
- **Risk: The `REVOKE UPDATE, DELETE` may break the existing test cleanup pattern (`sql\`DELETE FROM audit_events WHERE ...\``).** Mitigation: tests use a separate `test_role` that retains DELETE permission; the production app role does not. Document in the migration file.
- **Cross-track dependency**: Track 1 introduces `requirePermission`; if Track 1 is not yet complete, this track gates the admin query surface via `requireRole('ADMIN')`. Either is acceptable.

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 4 (F-404) and §Section 9 (F-901)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 4
- AGENTS.md §4.7, §9.4, §9.5
- `docs/prd/requirements.md:NFR9` (audit logging requirement)
- `packages/db/src/schema/users.ts` (the `users` table that `audit_events.actorUserId` references)
- `packages/auth/src/session.ts` (the `createSession` / `deleteSession` to wire)
- `packages/api/src/routes/auth/login.ts:36-132` (the login flow to wire)
