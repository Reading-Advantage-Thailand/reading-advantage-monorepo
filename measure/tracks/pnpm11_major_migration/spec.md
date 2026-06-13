# Specification: pnpm 11 Major Migration

## Background

The monorepo uses pnpm as its package manager with pnpm-workspace.yaml
for monorepo orchestration. pnpm 11 introduces breaking changes to the
lockfile format, workspace protocol, and dependency resolution.

## Acceptance Criteria

1. pnpm upgraded from 10.x to 11.x.
2. `pnpm-workspace.yaml` updated for any protocol changes.
3. Lockfile regenerated and `pnpm install --frozen-lockfile` passes.
4. All CI pipelines updated for pnpm 11.
5. `pnpm dedupe --check` passes after the upgrade.
6. All apps build and test correctly under pnpm 11.
7. Documentation updated in `measure/tech-stack.md`.
