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

## Non-Generalizable Surface List

Populated by track 1 audit (2026-05-22). Each entry is a surface that tracks 2/3 cannot consume from the shared schema cleanly.

| Surface | App | Reason | Proposed Handling |
|---------|-----|--------|-------------------|
| `StoryAssignment.articleId` (nullable FK) | reading-advantage | Article FK is optional; story FK is primary. Mixed reference. | Port as-is in `story_assignments` table — already in shared schema. |
| `UserWordRecord` FSRS fields | reading-advantage | 13 FSRS-specific fields (difficulty, due, lapses, etc.) — no science-app analogue | Ported to `user_word_records`; controllers must map old Prisma shape to new FSRS shape. |
| `UserSentenceRecord` FSRS+audio fields | reading-advantage | Similar to UserWordRecord — audio timepoint fields unique to reading-advantage | Ported to `user_sentence_records`; controller migration must handle old sentence_id→sentence rename. |
| `LessonRecord` phase1-phase14 jsonb | reading-advantage | 14-phase reading lesson state; science-advantage Lesson has no phase concept | Ported as `lesson_records`; no unification with `science_lessons`. |
| `AIInsight.content` field removal | reading-advantage | Old `content` col removed; replaced with `description`+`data jsonb` | Controllers using `insight.content` must switch to `insight.description`. |
| `GameRanking` score/level/completedAt removal | reading-advantage | Old cols dropped; replaced with `difficulty`+`total_xp` | Game controllers must use new shape. |

## Out of Scope

- Anything resolvable in the unified schema (track 1) or per-app cleanly (tracks 2/3).
