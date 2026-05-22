# Implementation Plan: Prisma → Drizzle Per-Feature Slice Cleanup

> **Blocked on** tracks 2 and 3. Slice list populated by those tracks; this plan expands when slices are known.
>
> This is a **closeout track, not a standalone unit of work** — it has no concrete tasks until Tracks 2 and 3 finish and hand over their non-generalizable leftovers. Do not schedule or staff it before then.

## Phase 1: Slice Triage

- [ ] Task: Collect non-generalizable slices from track 2 closure notes
- [ ] Task: Collect non-generalizable slices from track 3 closure notes
- [ ] Task: For each slice, decide handling: app-local Drizzle | drop | domain-fork
- [ ] Task: Measure - User Manual Verification 'Slice Triage' (Protocol in workflow.md)

## Phase 2: Per-Slice Migration

- [ ] Task: Migrate each triaged slice (sub-tasks added per slice once known)
- [ ] Task: Measure - User Manual Verification 'Per-Slice Migration' (Protocol in workflow.md)

## Phase 3: Final Eradication

- [ ] Task: Confirm repo-wide zero Prisma references (`grep -rln "@prisma\|@/lib/prisma" apps packages`)
- [ ] Task: Run `pnpm dedupe`; verify lockfile has no `@prisma/*` entries
- [ ] Task: CI sweep across all apps and packages
- [ ] Task: Close all remaining Prisma-related tech-debt entries
- [ ] Task: Distill program-level lessons-learned (≤50 line cap)
- [ ] Task: Measure - User Manual Verification 'Final Eradication' (Protocol in workflow.md)
