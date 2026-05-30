# Specification: JSDoc Comments for Shared Packages

## Overview

Add JSDoc comments to all exported functions in the shared packages (`domain`, `api`, `auth`, `db`, `webhooks`, `ui`, `auth-client`, `utils`) to improve developer experience, IDE tooltips, and onboarding. The build-graph knowledge graph will be used to track progress — functions with a `summary` field are considered documented.

**Current state:** 154 functions across 8 shared packages lack JSDoc comments (build-graph `summary IS NULL`).

## Functional Requirements

- **FR-1:** Every exported function in `packages/domain/src/` (69 functions) shall have a JSDoc comment with a one-line summary, `@param` tags for each parameter, and a `@returns` tag where applicable.
- **FR-2:** Every exported function in `packages/api/src/` (28 functions, excluding `__tests__/`) shall have a JSDoc comment.
- **FR-3:** Every exported function in `packages/auth/src/` (19 functions, excluding `__tests__/`) shall have a JSDoc comment.
- **FR-4:** Every exported function in `packages/db/src/` (15 functions) shall have a JSDoc comment.
- **FR-5:** Every exported function in `packages/webhooks/src/` (8 functions), `packages/ui/src/` (6 functions), `packages/auth-client/src/` (6 functions), and `packages/utils/src/` (3 functions) shall have a JSDoc comment.
- **FR-6:** A verification script shall exist that uses `build-graph query` to confirm zero functions with `summary IS NULL` in the target packages (excluding `__tests__/` directories).

## Non-Functional Requirements

- JSDoc comments must follow Google JSDoc style guide conventions
- Comments must not change runtime behavior
- Each package's existing tests must continue to pass after documentation changes
- Type checking must continue to pass (`pnpm turbo run check-types`)

## Acceptance Criteria

- `build-graph query` returns 0 for: `SELECT COUNT(*) FROM nodes WHERE type = 'function' AND summary IS NULL AND package_id IN ('domain','api','auth','db','webhooks','ui','auth-client','utils') AND file_path NOT LIKE '%__tests__%'`
- All existing tests pass (`pnpm turbo run test`)
- Type checking passes (`pnpm turbo run check-types`)
- Linting passes (`pnpm turbo run lint`)

## Out of Scope

- App-specific packages (reading-advantage, primary-advantage, science-advantage, advantage-games, www-reading-advantage, codecamp-advantage)
- Internal (non-exported) helper functions
- Test file functions (`__tests__/` directories)
- Schema, type, interface, and class documentation (functions only for this track)