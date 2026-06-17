# Plan: Migration Review Remediation

## Phase 1: Metadata & Doc Fixes (no code changes)

### Task 1.1 — Fix ai_sdk_major_migration metadata
- [x] Edit `measure/tracks/ai_sdk_major_migration/metadata.json`: change `status` from `in_progress` to `completed`.

### Task 1.2 — Fix drizzle045_major_migration metadata
- [x] Edit `measure/tracks/drizzle045_major_migration/metadata.json`: change `status` from `backlog` to `completed`.

### Task 1.3 — Fix test-strategy.md version doc
- [x] Edit `measure/tracks/drizzle045_major_migration/test-strategy.md` §7: change `drizzle-kit 0.32+` to `drizzle-kit ^0.31.7`.

### Task 1.4 — Drop stale stashes
- [x] Verify stash contents are superseded by recent commits.
- [x] Drop all 6 `preserve-jr-*` stashes.

## Phase 2: Fix check-types errors in drizzle test files

### Task 2.1 — Fix TS2352 in drizzle045-schema-compile.test.ts
- [x] Lines 356, 371, 385, 396: change `as Record<string, ...>` to `as unknown as Record<string, ...>` to satisfy PgTableWithColumns → Record cast under 0.45's stricter typing.

### Task 2.2 — Fix TS2345 in drizzle045-phase2-contracts-adversarial.test.ts
- [x] Line 575: change the parameter type from `{ users: Record<string, unknown> }` to use `unknown` first, then cast.

## Phase 3: Update tech-stack.md

### Task 3.1 — Add Drizzle and AI SDK rows to Selected Shared Versions table
- [x] Add `drizzle-orm | 0.45.2 | drizzle045_major_migration` row.
- [x] Add `drizzle-kit | ^0.31.7 | drizzle045_major_migration` row.
- [x] Add `drizzle-zod | ^0.7.0 | drizzle045_major_migration` row.
- [x] Add `ai | ^5.x | ai_sdk_major_migration` row.
- [x] Add `@ai-sdk/openai | ^2.x | ai_sdk_major_migration` row.
- [x] Add `@ai-sdk/google | ^2.x | ai_sdk_major_migration` row.
- [x] Add `@ai-sdk/google-vertex | ^3.x | ai_sdk_major_migration` row.

## Phase 4: Generate marketing migration

### Task 4.1 — Generate migration for marketing tables
- [x] Run `drizzle-kit generate` to produce the marketing migration.
- [x] Verify the generated SQL covers all marketing tables, enums, indexes, and FKs.
- [x] Commit the migration file.

## Phase 5: Run aggregate gate & create closure records

### Task 5.1 — Run aggregate gate
- [x] Run `pnpm turbo run lint test check-types build` and record results.

### Task 5.2 — Create phase4-aggregate-gate.md
- [x] Write closure record documenting the aggregate gate results.

### Task 5.3 — Create phase4-outdated-audit.md
- [x] Run `pnpm outdated -r` and `pnpm audit`.
- [x] Write closure record documenting outdated + audit results.

### Task 5.4 — Verify Phase 4 closure-gate test passes
- [x] Run `pnpm --filter @reading-advantage/db exec vitest run src/__tests__/drizzle045-phase4-closure-gates.test.ts`.

## Phase 6: Cleanup unrelated worktree changes

### Task 6.1 — Review and commit/revert unrelated changes
- [x] `apps/reading-advantage/lib/enums.ts` — commit or revert.
- [x] `apps/science-advantage/AGENTS.md` + `lib/enums.ts` — commit or revert.
- [x] `measure/tracks/prisma_drizzle_slice_cleanup_20260505/` deleted files — verify intentional.
