# ADR 0003: Add INTERN Role

**Date:** 2026-06

**Status:** Accepted

**Context**

The CodeCamp Advantage app required a new role below `TEACHER` for interns who need limited access to the platform. The existing role enum only had `SUPER_ADMIN`, `ADMIN`, `TEACHER`, `STUDENT`, and `SYSTEM` (added in `0003_slow_firebrand.sql`).

Adding `INTERN` as a role requires an `ALTER TYPE` statement because the `role` column uses a PostgreSQL enum, not a reference table.

**Decision**

We added `INTERN` to the `role` enum via migration `0012_codecamp_intern_role.sql`. The role sits below `TEACHER` in the hierarchy defined in `packages/auth/src/roles.ts`.

The migration uses `ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'INTERN'` — the `IF NOT EXISTS` guard ensures idempotency if the migration is re-run.

**Consequences**

- The `role` enum now includes `INTERN`.
- Intern accounts are created via the CodeCamp admin panel using `internAccountInputSchema` (see `packages/types/src/codecamp.ts`).
- The role hierarchy in `packages/auth/src/roles.ts` was updated to include `INTERN` with appropriate route access.
- No additional migration is needed unless new roles are added.

**References**

- Migration: `packages/db/drizzle/0012_codecamp_intern_role.sql`
- Role hierarchy: `packages/auth/src/roles.ts` (`ROLE_HIERARCHY.INTERN`)
- Intern schema: `packages/types/src/codecamp.ts` (`internAccountInputSchema`)
