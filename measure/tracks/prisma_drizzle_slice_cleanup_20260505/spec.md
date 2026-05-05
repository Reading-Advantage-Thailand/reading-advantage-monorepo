# Specification: Prisma → Drizzle Per-Feature Slice Cleanup

## Overview

Final track in the Prisma → Drizzle migration program. Captures any feature surface that **could not** consume the unified Drizzle schema cleanly during tracks 2 and 3 — typically because the data shape was app-specific in ways the unified schema chose not to absorb.

This track exists so that tracks 2 and 3 can land **without forcing** every app-specific edge case to fit a shared shape; instead, they defer those edges here, where each is handled as its own slice with explicit shape decisions.

**Blocked on:** `prisma_drizzle_reading_controllers_20260505` and `prisma_drizzle_science_controllers_20260505`.

## Functional Requirements

### FR-1: Slice Triage
- At the end of tracks 2 and 3, every still-Prisma-using file is recorded here as a slice with: file path, reason for non-generalizability, and proposed handling (port-as-app-local Drizzle, drop, or domain-fork).

### FR-2: Per-Slice Migration
- Each slice migrates onto Drizzle with documented shape decisions. Slices may live as app-local Drizzle tables (under each app's own `db/` folder) when shared shape is wrong.

### FR-3: Final Prisma Eradication
- After all slices land, no Prisma packages remain anywhere in the monorepo (root or app `package.json`).
- `pnpm dedupe` clean; lockfile contains zero `@prisma/*` entries.

## Acceptance Criteria

1. Slice list populated by tracks 2/3 closure; each entry has a resolution note.
2. Repo-wide `grep -rln "@prisma\|@/lib/prisma" apps packages` returns zero.
3. Lockfile contains no `@prisma/client` or `prisma` entries.
4. CI green across all apps and packages.
5. Final tech-debt entries closed; lessons-learned distilled.

## Out of Scope

- Anything resolvable in the unified schema (track 1) or per-app cleanly (tracks 2/3).
