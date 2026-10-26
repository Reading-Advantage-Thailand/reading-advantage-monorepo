# Specification: Backend Auth Dependency Hotfix

Track ID: `backend_auth_dependency_hotfix_20260924`. Type: bug. Package: `packages/backend`.

## Overview

`packages/backend` imported `@reading-advantage/auth/company-identity` in
`src/modules/company-identity/postgres-dev-local-product-access.ts` without
declaring `@reading-advantage/auth` in its `package.json`. Turbo's `^build`
ordering therefore did not sequence `@reading-advantage/auth:build` before
`@reading-advantage/backend:build`, so the Docker image build raced and failed
with TS2307 on a clean checkout. Found during the 2026-09-24 production
redeploy (accounts build 5577dc39, step build-image).

## Functional Requirements

- FR-1: `packages/backend/package.json` declares `@reading-advantage/auth` as a
  workspace dependency.
- FR-2: `pnpm-lock.yaml` carries the matching importer entry.
- FR-3: `pnpm install --frozen-lockfile` validates and the accounts Cloud Build
  image step passes.

## Acceptance Criteria

- AC-1: Frozen-lockfile validation succeeds in a clean container.
- AC-2: The accounts Cloud Build `build-image` step completes.
