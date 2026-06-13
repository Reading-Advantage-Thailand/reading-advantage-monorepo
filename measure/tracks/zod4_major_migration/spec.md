# Specification: Zod 4 Major Migration

## Background

The monorepo uses Zod 3 for input validation on all tRPC procedures, form
schemas, and environment variable validation. Zod 4 introduces breaking
changes to the parsing API, error formatting, and schema composition.

This migration is coordinated with `zod_boundary_hardening_20260603`,
which owns the hardening of env/schema validation coverage. That track's
work (100% env coverage, `parseBody`/`parseQuery`/`parsePath` helpers,
43 unit tests) provides the validation surface that this track migrates
to Zod 4.

## Acceptance Criteria

1. Zod upgraded from 3.x to 4.x across all workspaces.
2. All `z.object()`, `z.string()`, `z.number()`, `z.array()` schemas
   compile against the Zod 4 API.
3. `.parse()` / `.safeParse()` error handling updated for Zod 4 format.
4. All tRPC procedures validate correctly with Zod 4 schemas.
5. Environment validation in `lib/env.ts` works with Zod 4.
6. All apps compile with `check-types` clean.
7. All existing validation tests pass (43 from zod_boundary_hardening + others).
8. `pnpm outdated -r` shows Zod at the target major version.
9. `pnpm audit --json` shows no new advisories.
10. Documentation updated in `measure/tech-stack.md`.
11. Cross-link: this track's plan.md references
    `zod_boundary_hardening_20260603` as the source of the hardened
    validation surface being migrated.
