# Specification: Prisma → Drizzle Per-Feature Slice Cleanup

## Overview

Final track in the Prisma → Drizzle migration program. Closes out the program for the three apps that completed migration (reading-advantage, science-advantage, codecamp-advantage / shared backend) and **explicitly carves out primary-advantage** into its own follow-up track.

Originally framed as repo-wide eradication. Post-Track-2/3 audit (2026-05-26) shows the residual Prisma surface in completed apps is **two comment-only references** in `lib/enums.ts` files. The only remaining live Prisma surface is the entire primary-advantage app — a Track-2/3-sized migration that does not fit the "slice cleanup" framing.

**Status:** Unblocked. Tracks 2 (reading-advantage controllers) and 3 (science-advantage controllers) archived 2026-05-23 and 2026-05-26 respectively.

## Scope

### In Scope
- reading-advantage `lib/enums.ts` — remove or rewrite Prisma-referencing comments now that the schema source of truth is `packages/db`.
- science-advantage `lib/enums.ts` — same.
- Any other comment-only or doc-only Prisma references discovered repo-wide in apps **other than primary-advantage**.
- Repo-wide audit confirming no Prisma references remain in reading-advantage, science-advantage, codecamp-advantage, www-reading-advantage, advantage-games, or shared `packages/*`.
- Closeout of remaining Prisma-related tech-debt entries that pertain to the migrated apps.
- Program-level lessons-learned distilled from Tracks 1–3.
- `apps/science-advantage/AGENTS.md` Prisma references corrected (post-Track-3 doc drift).

### Out of Scope
- primary-advantage Prisma → Drizzle migration (carved out as new track `primary_advantage_drizzle_migration_*`). primary-advantage retains its own Prisma schema, NextAuth, and `@prisma/client` runtime until that track lands.
- Root `package.json` `onlyBuiltDependencies` containing `prisma`/`@prisma/client` — required until primary-advantage migration lands; removal deferred to that track's closeout.
- Lockfile `@prisma/*` entries — likewise deferred.

## Functional Requirements

### FR-1: Comment-Only Surface Cleanup
- `apps/reading-advantage/lib/enums.ts` and `apps/science-advantage/lib/enums.ts` no longer reference `@prisma/client`, the Prisma schema, or prisma-zod artifacts in comments. Comments instead point to `packages/db/src/schema/` as the source of truth for enum values.

### FR-2: Migrated-Apps Eradication Audit
- `grep -rnE "@prisma|@/lib/prisma" apps packages --include='*.ts' --include='*.tsx' --include='*.mjs' --include='*.cjs' --include='*.js'` excluding `node_modules`, `.next`, `.turbo`, `tsbuildinfo`, and `apps/primary-advantage` returns **zero**.
- Documentation (`AGENTS.md`, `docs/`) in non-primary apps does not instruct new contributors to use Prisma.

### FR-3: Program Closeout
- All Prisma-related tech-debt entries for reading-advantage and science-advantage marked `Resolved` or closed. Entries pertaining to primary-advantage moved/created under the new primary-advantage migration track.
- Tracks registry shows Tracks 1–4 of the Prisma → Drizzle program archived. A new entry for the primary-advantage migration track is added under "Pending Tracks" with explicit cross-link to this track's carve-out decision.
- `measure/lessons-learned.md` retains at most one program-level distillation entry (existing per-track entries pruned to make room, total file ≤ 50 lines).

### FR-4: Carve-Out Documentation
- This spec records the carve-out rationale (above) and links to the new primary-advantage track's id.
- The new track's spec links back here as the upstream decision.

## Acceptance Criteria

1. FR-1 satisfied: `grep -n "prisma" apps/reading-advantage/lib/enums.ts apps/science-advantage/lib/enums.ts` returns zero matches (case-insensitive).
2. FR-2 audit command (above) returns zero with the documented exclusions.
3. FR-3: `measure/tech-debt.md` contains no `Open` Prisma entries that name reading-advantage or science-advantage; primary-advantage entries explicitly attributed to the new follow-up track.
4. FR-4: New primary-advantage migration track created in `measure/tracks/` with metadata, spec, and plan stubs; tracks.md updated.
5. CI green on reading-advantage, science-advantage, and shared `packages/*` after changes (primary-advantage CI status unchanged — outside scope).

## Non-Generalizable Surface List (carry-over from original spec)

These were resolved during Tracks 2/3 and are retained here as historical record:

| Surface | App | Reason | Resolution |
|---------|-----|--------|------------|
| `StoryAssignment.articleId` | reading-advantage | Optional article FK, primary story FK | Ported as-is in `story_assignments` (Track 2). |
| `UserWordRecord` FSRS fields | reading-advantage | 13 FSRS-specific cols, no science analogue | Ported to `user_word_records` (Track 2). |
| `UserSentenceRecord` FSRS+audio | reading-advantage | Audio timepoints unique to reading | Ported to `user_sentence_records` (Track 2). |
| `LessonRecord` phase1–14 jsonb | reading-advantage | 14-phase state, no science analogue | Ported to `lesson_records` (Track 2). |
| `AIInsight.content` removal | reading-advantage | Replaced with `description`+`data jsonb` | Controllers switched (Track 2). |
| `GameRanking` shape change | reading-advantage | `score/level/completedAt` → `difficulty/total_xp` | Controllers switched (Track 2). |
| Prisma implicit M:N tables (`_LessonToStandard` etc.) | science-advantage | Invisible to schema audit | Migration 0015 added 4 explicit junctions (Track 3). |
