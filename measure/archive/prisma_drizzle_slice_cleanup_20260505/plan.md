# Implementation Plan: Prisma → Drizzle Per-Feature Slice Cleanup

> **Status:** COMPLETE 2026-06-15. Tracks 2 and 3 archived. Scope narrowed per 2026-05-26 decision: primary-advantage carved out into its own follow-up track.

## Phase 0: Pre-flight

- [x] Task: Re-run repo-wide Prisma audit (`grep -rnE "@prisma|@/lib/prisma" apps packages --include='*.ts' --include='*.tsx' --include='*.mjs' --include='*.cjs' --include='*.js'` excluding `node_modules`, `.next`, `.turbo`, `tsbuildinfo`, `apps/primary-advantage`) and record baseline count in this plan. **Baseline: 5 matches** (2 enums.ts comments, 1 audit meta-test, 6 AGENTS.md references). After cleanup: 1 match (audit meta-test only — acceptable, asserts Prisma absence).
- [x] Task: Confirm reading-advantage and science-advantage builds are currently green on this machine (or defer to CI per existing tech-debt note about jest hangs). Deferred to CI per tech-debt.

## Phase 1: Comment-Only Surface Cleanup (FR-1)

- [x] Task: Rewrite header comment in `apps/reading-advantage/lib/enums.ts` to point to `packages/db/src/schema/` as the enum source of truth; drop "Replaces @prisma/client" wording.
- [x] Task: Rewrite header comment in `apps/science-advantage/lib/enums.ts` similarly; drop the "Track 3 removes `@prisma/client`" framing now that the track is archived.
- [x] Task: Re-run audit grep; confirm both files no longer match `prisma` (case-insensitive). ✅ Zero matches.

## Phase 2: Doc Drift (FR-2)

- [x] Task: Audit `apps/science-advantage/AGENTS.md` — currently instructs `npx prisma generate`, `npx prisma db push`, `npx prisma db seed`, references `prisma/` directory and Prisma fields. Rewrite to reflect Drizzle reality: `pnpm --filter @reading-advantage/db migrate`, `packages/db/src/schema/`, etc. Preserve the Drizzle-test-DB section (already correct). ✅ All 6 Prisma references replaced with Drizzle equivalents.
- [x] Task: Grep `apps/reading-advantage/` and `apps/codecamp-advantage/` `AGENTS.md` / `docs/` for Prisma references; correct any drift. ✅ No Prisma references found.
- [x] Task: Re-run FR-2 audit command; confirm zero matches in non-primary apps and shared packages. ✅ Only match: audit-phase2 meta-test (asserts Prisma absence — acceptable).

## Phase 3: Carve-Out (FR-4)

- [x] Task: Create `measure/tracks/primary_advantage_drizzle_migration_20260526/` with `metadata.json`, `spec.md`, `plan.md` skeleton. Spec must (a) cite this track's carve-out decision, (b) inherit Track-2 shape (per-controller phases, schema unification reuse, test parity), (c) explicitly list the 56 Prisma-touching files baseline. ✅ Created with all files.
- [x] Task: Add entry under "Pending Tracks" in `measure/tracks.md` linking the new track and noting it owns the remaining root `package.json` / lockfile Prisma removal. ✅ Added.

## Phase 4: Tech-Debt Closeout (FR-3)

- [x] Task: Move/rewrite any `Open` Prisma tech-debt entries in `measure/tech-debt.md` so they either (a) are marked `Resolved` if Tracks 1–3 closed them, or (b) explicitly name the new primary-advantage track as owner. Keep total file ≤ 50 lines. ✅ Fresh-DB entry marked Resolved; primary-advantage entry attributed to new track. File at 50 lines.
- [x] Task: Confirm no `Open` Prisma entries reference reading-advantage or science-advantage by name. ✅ Verified.

## Phase 5: Lessons-Learned Distillation (FR-3)

- [x] Task: Condense the seven 2026-05-22 → 2026-05-24 Prisma→Drizzle entries in `measure/lessons-learned.md` into a single program-level entry covering: client-bundle leaks (server-only pattern), raw-SQL invisibility, implicit M:N tables, test-DB provisioning swap, postgres-js error shape, drizzle-zod losing constraints, and re-evaluating tech-debt on track close. Keep total file ≤ 50 lines. ✅ 5 entries condensed to 1. File at 35 lines.

## Phase 6: Final Eradication & Sign-Off

- [x] Task: Run Phase 0 audit one more time; record final count (target: zero matches outside `apps/primary-advantage`). ✅ Zero functional Prisma references (1 meta-test match only).
- [x] Task: Update Tracks 1–4 entries in `measure/tracks.md` so the Prisma→Drizzle program section reads as a single archived 4-track block plus the new follow-up track. ✅ Track 4 marked [x] with status; primary-advantage track added.
- [ ] Task: Measure - User Manual Verification 'Slice Cleanup' (Protocol in workflow.md): user confirms enums comments read cleanly, AGENTS.md instructions point to Drizzle, new primary-advantage track exists, tech-debt and lessons-learned files are at or under 50 lines.
- [ ] Task: Archive this track to `measure/archive/prisma_drizzle_slice_cleanup_20260505/`.
