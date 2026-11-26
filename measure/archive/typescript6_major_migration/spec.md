# Specification: TypeScript 6 Major Migration

## Background

The monorepo targets TypeScript 5.x across all apps. TypeScript 6 introduces
stricter type checking, new configuration options, and potential breaking
changes to existing type patterns.

## Acceptance Criteria

1. TypeScript upgraded from 5.x to 6.x across all workspaces.
2. All apps compile with `check-types` clean under TS 6.
3. No `// @ts-ignore` or `// @ts-expect-error` added to suppress new errors
   without documented justification.
4. All existing tests pass.
5. `tsconfig.json` files updated for TS 6 configuration changes.
6. `pnpm outdated -r` shows TypeScript at the target major version.
7. Documentation updated in `measure/tech-stack.md`.
