# Specification: Jest 30 Major Migration

## Background

The monorepo uses Jest for unit tests in reading-advantage and
advantage-games. Jest 30 introduces a new test runner, updated
configuration schema, and breaking changes to the mocking API.

## Acceptance Criteria

1. Jest upgraded from 29.x to 30.x in reading-advantage and advantage-games.
2. All Jest configuration files updated for the new schema.
3. Snapshot tests updated for any format changes.
4. All existing test suites pass under Jest 30.
5. Module resolution configuration compatible with the monorepo setup.
6. `pnpm outdated -r` shows Jest at the target major version.
7. Documentation updated in `measure/tech-stack.md`.
