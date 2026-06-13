# Specification: Zustand 5 Major Migration

## Background

reading-advantage uses Zustand v4 while advantage-games already uses v5.
This migration aligns reading-advantage to Zustand 5, resolving the
version mismatch noted in tech-debt.md.

## Acceptance Criteria

1. Zustand upgraded from 4.x to 5.x in reading-advantage.
2. All store definitions updated for Zustand 5 API changes.
3. All existing tests pass (including game component tests that use store mocking).
4. Monorepo-wide Zustand version aligned to 5.x.
5. `pnpm outdated -r` shows Zustand at the target major version.
6. Documentation updated in `measure/tech-stack.md`.
