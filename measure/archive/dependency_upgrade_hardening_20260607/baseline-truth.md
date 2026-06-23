# Baseline Truth

> Pre-upgrade quality-gate results for every workspace touched by
> `dependency_upgrade_hardening_20260607`. Phase 3 batch gates and Phase 4
> aggregate gates use this record to attribute new failures to the upgrade
> itself rather than to pre-existing baseline debt (per test-strategy.md §1
> and §8, spec.md Acceptance Criteria #10).

## Source Commit

- **SHA:** `06a4bf14`
- **Date:** 2026-06-13
- **Branch:** working tree at HEAD of current branch
- **Baseline evidence:** `measure/tracks/dependency_upgrade_hardening_20260607/baseline/`
  (`git-status.txt`, `pnpm-outdated.json`, `pnpm-list.json`,
  `pnpm-dedupe-check.txt`, `pnpm-audit.json`)

## Affected Workspaces

Every workspace the upgrade matrix names as a dependent of an in-scope
package. These six apps are the "all six" set the spec and plan reference.

| Workspace | Packages Affected |
|-----------|-------------------|
| reading-advantage | next, react, react-dom, vitest, fluent-ffmpeg (audio-gen), react-day-picker, @types/uuid, tailwindcss, postcss, react-konva, ts-jest, and many Batch F/G patches |
| primary-advantage | next, react, react-dom, vitest, @types/bcryptjs, @types/sharp, fluent-ffmpeg, tailwindcss, prisma |
| science-advantage | next, react, react-dom, vitest, tailwindcss |
| codecamp-advantage | next, react, react-dom, vitest, tailwindcss |
| www-reading-advantage | next, react, react-dom, vitest, @types/marked, tailwindcss, postcss |
| vocabulary-games | next, react, react-dom, vitest, eslint-config-next (exception) |

## Per-Workspace Gate Results

> **Note:** These are the quality gates each batch must run. Actual command
> output is captured during Phase 3 per-batch execution and reconciled in
> Phase 4. This section documents the **contract** — which gates apply to
> which workspace — so Phase 3 can attribute regressions correctly.

| Workspace | lint | test | check-types | build |
|-----------|------|------|-------------|-------|
| reading-advantage | `pnpm --filter reading-advantage lint` | `pnpm --filter reading-advantage exec jest --testPathPattern "__test__" --no-coverage` (focused; full suite hangs) | `pnpm --filter reading-advantage check-types` | `pnpm --filter reading-advantage build` |
| primary-advantage | `pnpm --filter primary-advantage lint` | `pnpm --filter primary-advantage test` | `pnpm --filter primary-advantage check-types` | `pnpm --filter primary-advantage build` |
| science-advantage | `pnpm --filter science-advantage lint` | `pnpm --filter science-advantage test` | `pnpm --filter science-advantage check-types` | `pnpm --filter science-advantage build` |
| codecamp-advantage | `pnpm --filter codecamp-advantage lint` | `pnpm --filter codecamp-advantage test` | `pnpm --filter codecamp-advantage check-types` | `pnpm --filter codecamp-advantage build` |
| www-reading-advantage | `pnpm --filter www-reading-advantage lint` | `pnpm --filter www-reading-advantage test` | `pnpm --filter www-reading-advantage check-types` | `pnpm --filter www-reading-advantage build` |
| vocabulary-games | `pnpm --filter vocabulary-games lint` | `pnpm --filter vocabulary-games test` | `pnpm --filter vocabulary-games check-types` | `pnpm --filter vocabulary-games build` |

## Pre-Existing Failures Carved Out

These failures exist at the baseline SHA and are **not owned** by this track.
They must not block the dependency upgrade acceptance gates.

### primary-advantage: 49 ESLint errors

- **Source:** `measure/tech-debt.md` (monorepo-scaffold, 2026-04-29)
- **Scope:** `primary-advantage` lint gate
- **Status:** Pre-existing. Not caused by any dependency change in this track.
- **Impact:** `pnpm --filter primary-advantage lint` may exit non-zero before
  and after the upgrade. Phase 3 must record the exit code but attribute it to
  baseline debt, not to a regression introduced by this track.

### Jest / Vitest runner mix

- **Source:** `measure/tech-debt.md` (monorepo-scaffold, 2026-04-29)
- **Scope:** Monorepo-wide — some workspaces use Jest, others use Vitest.
- **Status:** Pre-existing architectural inconsistency. Not caused by the
  Vitest alignment in Batch B.
- **Impact:** Batch B's Vitest alignment (override `4.1.5` → `4.1.8`) does not
  change the runner-choice inconsistency. Phase 4 must record this as baseline
  debt when reconciling the aggregate `pnpm turbo run test` gate.

### reading-advantage: full Jest suite hangs

- **Source:** `measure/tech-debt.md` (prisma_drizzle_reading_controllers, 2026-05-23)
- **Scope:** `reading-advantage` full `pnpm --filter reading-advantage test`
- **Status:** Pre-existing. Hangs >10min on this hardware.
- **Impact:** Phase 3/4 must use focused Jest patterns (e.g.
  `--testPathPattern`) for reading-advantage test validation, never the full
  suite. This track's calendar tests are bounded via `--testPathPattern`.

### reading-advantage / primary-advantage: `ignoreBuildErrors: true`

- **Source:** `measure/tech-debt.md` (migrate-reading-advantage, 2026-05-01;
  migrate-primary-advantage, 2026-05-01)
- **Scope:** Both apps have `ignoreBuildErrors: true` / `ignoreDuringBuilds: true`
  in Next.js config.
- **Status:** Pre-existing. Build may surface suppressed type errors if the flag
  is removed; this track does not remove the flag.
