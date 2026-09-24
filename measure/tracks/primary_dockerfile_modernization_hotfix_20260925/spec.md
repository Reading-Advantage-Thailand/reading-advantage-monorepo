# Specification: Primary Dockerfile Modernization Hotfix

Track ID: `primary_dockerfile_modernization_hotfix_20260925`. Type: chore. App: `apps/primary-advantage`.

## Overview

The primary-advantage production deploy failed on 2026-09-25 (build a4e9cd21):
its Dockerfile predated the monorepo migration (npm ci, prisma:generate,
app-dir build context) and its cloudbuild.yaml lacked the `-f` Dockerfile path,
so the root-context submit could not find a Dockerfile. The app now builds
through pnpm workspaces and Drizzle like the other product apps.

## Functional Requirements

- FR-1: `apps/primary-advantage/Dockerfile` follows the monorepo pattern
  (pnpm install --frozen-lockfile at repo root, turbo build filter, standalone runner).
- FR-2: `apps/primary-advantage/next.config.ts` sets `output: "standalone"`,
  `outputFileTracingRoot` at the monorepo root, and `serverExternalPackages`
  for postgres and argon2.
- FR-3: `apps/primary-advantage/cloudbuild.yaml` builds with
  `-f apps/primary-advantage/Dockerfile` and no longer passes the literal
  `_DATABASE_URL` substitution as a build arg.

## Acceptance Criteria

- AC-1: The primary-advantage Cloud Build `build-image` step completes.
- AC-2: The deployed revision serves 2xx on the app route.
