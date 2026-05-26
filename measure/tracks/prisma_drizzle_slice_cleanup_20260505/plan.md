# Implementation Plan: Prisma → Drizzle Per-Feature Slice Cleanup

> **Status:** Unblocked 2026-05-26. Tracks 2 and 3 archived. Scope narrowed per 2026-05-26 decision: primary-advantage carved out into its own follow-up track.

## Phase 0: Pre-flight

- [ ] Task: Re-run repo-wide Prisma audit (`grep -rnE "@prisma|@/lib/prisma" apps packages --include='*.ts' --include='*.tsx' --include='*.mjs' --include='*.cjs' --include='*.js'` excluding `node_modules`, `.next`, `.turbo`, `tsbuildinfo`, `apps/primary-advantage`) and record baseline count in this plan.
- [ ] Task: Confirm reading-advantage and science-advantage builds are currently green on this machine (or defer to CI per existing tech-debt note about jest hangs).

## Phase 1: Comment-Only Surface Cleanup (FR-1)

- [ ] Task: Rewrite header comment in `apps/reading-advantage/lib/enums.ts` to point to `packages/db/src/schema/` as the enum source of truth; drop "Replaces @prisma/client" wording.
- [ ] Task: Rewrite header comment in `apps/science-advantage/lib/enums.ts` similarly; drop the "Track 3 removes `@prisma/client`" framing now that the track is archived.
- [ ] Task: Re-run audit grep; confirm both files no longer match `prisma` (case-insensitive).

## Phase 2: Doc Drift (FR-2)

- [ ] Task: Audit `apps/science-advantage/AGENTS.md` — currently instructs `npx prisma generate`, `npx prisma db push`, `npx prisma db seed`, references `prisma/` directory and Prisma fields. Rewrite to reflect Drizzle reality: `pnpm --filter @reading-advantage/db migrate`, `packages/db/src/schema/`, etc. Preserve the Drizzle-test-DB section (already correct).
- [ ] Task: Grep `apps/reading-advantage/` and `apps/codecamp-advantage/` `AGENTS.md` / `docs/` for Prisma references; correct any drift.
- [ ] Task: Re-run FR-2 audit command; confirm zero matches in non-primary apps and shared packages.

## Phase 3: Carve-Out (FR-4)

- [ ] Task: Create `measure/tracks/primary_advantage_drizzle_migration_20260526/` with `metadata.json`, `spec.md`, `plan.md` skeleton. Spec must (a) cite this track's carve-out decision, (b) inherit Track-2 shape (per-controller phases, schema unification reuse, test parity), (c) explicitly list the 56 Prisma-touching files baseline.
- [ ] Task: Add entry under "Pending Tracks" in `measure/tracks.md` linking the new track and noting it owns the remaining root `package.json` / lockfile Prisma removal.

## Phase 4: Tech-Debt Closeout (FR-3)

- [ ] Task: Move/rewrite any `Open` Prisma tech-debt entries in `measure/tech-debt.md` so they either (a) are marked `Resolved` if Tracks 1–3 closed them, or (b) explicitly name the new primary-advantage track as owner. Keep total file ≤ 50 lines.
- [ ] Task: Confirm no `Open` Prisma entries reference reading-advantage or science-advantage by name.

## Phase 5: Lessons-Learned Distillation (FR-3)

- [ ] Task: Condense the seven 2026-05-22 → 2026-05-24 Prisma→Drizzle entries in `measure/lessons-learned.md` into a single program-level entry covering: client-bundle leaks (server-only pattern), raw-SQL invisibility, implicit M:N tables, test-DB provisioning swap, postgres-js error shape, drizzle-zod losing constraints, and re-evaluating tech-debt on track close. Keep total file ≤ 50 lines.

## Phase 6: Final Eradication & Sign-Off

- [ ] Task: Run Phase 0 audit one more time; record final count (target: zero matches outside `apps/primary-advantage`).
- [ ] Task: Update Tracks 1–4 entries in `measure/tracks.md` so the Prisma→Drizzle program section reads as a single archived 4-track block plus the new follow-up track.
- [ ] Task: Measure - User Manual Verification 'Slice Cleanup' (Protocol in workflow.md): user confirms enums comments read cleanly, AGENTS.md instructions point to Drizzle, new primary-advantage track exists, tech-debt and lessons-learned files are at or under 50 lines.
- [ ] Task: Archive this track to `measure/archive/prisma_drizzle_slice_cleanup_20260505/`.
