# Specification: Dependency Upgrade Hardening and Alignment

## Overview

Harden and align the monorepo dependency graph using the live package audit captured
on 2026-06-07. Replace the vulnerable root `next@16.0.0` override, align shared
framework and test-tool versions, apply reviewed patch/minor upgrades in bounded
batches, resolve known peer conflicts, remove or replace deprecated direct
dependencies, and deduplicate the lockfile. Major ecosystem migrations are classified
and routed into dedicated follow-up tracks rather than mixed into this maintenance
change.

## Problem

The live audit found 116 outdated direct dependencies across 19 workspace projects:

| Upgrade class | Count |
|---|---:|
| Patch | 33 |
| Minor | 27 |
| Major | 54 |
| Same-version deprecated direct dependencies | 2 |

Five direct dependencies were explicitly reported as deprecated:
`@types/bcryptjs`, `@types/marked`, `@types/sharp`, `@types/uuid`, and
`fluent-ffmpeg`.

The root `pnpm.overrides` currently forces every app onto:

- `next@16.0.0`, which npm marks deprecated because of a security vulnerability.
- `react@19.2.5` and `react-dom@19.2.5`, behind the latest patch line.
- `vitest@4.1.5`, while `@vitest/ui@4.1.8` is already resolved in the workspace.
- `drizzle-orm@0.44.7`, behind `0.45.x` but intentionally held pending a dedicated
  ORM compatibility review.

The audit also found:

- `reading-advantage`: `react-day-picker@8.10.2` has an unmet peer requirement
  because the app resolves `date-fns@4.1.0`.
- `science-advantage`: `vitest@4.1.5` has an unmet peer requirement against
  `@vitest/ui@4.1.8`.
- `pnpm dedupe --check` reports lockfile deduplication opportunities.
- Direct manifests declare different Next, React, Vitest, TypeScript, Zod, AI SDK,
  ESLint, Jest, jsdom, Tailwind, and Zustand generations even where root overrides
  hide the drift.
- `pnpm audit --json` did not complete because registry requests stalled. Security
  audit results beyond the confirmed Next advisory remain unknown.

## Functional Requirements

### FR-1: Capture a Reproducible Upgrade Baseline

- Re-run and save the results of:
  - `pnpm outdated -r --format json`
  - `pnpm audit --json`
  - `pnpm dedupe --check`
  - `pnpm list -r --depth 0 --json`
- Record registry timeouts or incomplete results explicitly; do not treat missing
  audit output as a clean security result.
- Build an upgrade matrix with package, current, wanted, latest, dependent
  workspaces, risk class, decision, and validation scope.
- Confirm the working tree state before every dependency batch so unrelated
  in-flight Measure work is not included.

### FR-2: Repair Root Override and Manifest Drift

- Upgrade the vulnerable `next@16.0.0` root override to a currently patched stable
  Next 16 release. The audit baseline identified `16.2.7`; re-check the registry and
  advisory before implementation.
- Align every direct `next` and `eslint-config-next` declaration with the selected
  patched Next version unless a documented app-specific compatibility blocker
  requires a temporary exception.
- Upgrade and align `react` and `react-dom` to the selected React 19 patch release.
  The audit baseline identified `19.2.7`.
- Upgrade and align `vitest`, `@vitest/ui`, and `@vitest/coverage-v8` to one patch
  release. The audit baseline identified `4.1.8`.
- Keep `drizzle-orm@0.44.7` pinned in this track; Drizzle `0.45.x` is a separate
  compatibility migration.
- Preserve the dependency range policy owned by
  `housekeeping_batch_20260603` FR-6.

### FR-3: Apply Allowlisted Patch and Minor Upgrades

- Apply upgrades in small, reviewable batches rather than using an unrestricted
  recursive latest-version command.
- Patch batch candidates include Radix UI packages, React type packages,
  `@vitejs/plugin-react`, `baseline-browser-mapping`, `dayjs`, `hono`, `postcss`,
  `react-konva`, `ts-jest`, `turbo`, and other compatible patch releases from the
  refreshed matrix.
- Minor batch candidates include `@playwright/test`, `@tanstack/react-query`,
  `axios`, `date-fns`, `firebase-admin`, `framer-motion`, `jotai`, `pg`,
  `react-hook-form`, `tsx`, `typescript-eslint`, and `ws`.
- Tailwind CSS and `@tailwindcss/postcss` minor upgrades require dedicated visual
  smoke validation before acceptance.
- Any candidate with a breaking changelog, changed runtime contract, failed peer
  resolution, or failed quality gate moves to the major/follow-up queue.

### FR-4: Resolve Existing Peer Dependency Conflicts

- Align the Vitest family to resolve the `science-advantage` peer conflict.
- Resolve the `reading-advantage` `react-day-picker@8` / `date-fns@4` conflict.
  Prefer migrating the calendar components to the already-used
  `react-day-picker@9` contract over downgrading the shared date library.
- Add or strengthen focused tests for the affected calendar/date-range components
  before changing `react-day-picker`.
- End with `pnpm install --frozen-lockfile` and `pnpm dedupe --check` reporting no
  peer conflict for these two cases.

### FR-5: Remove or Replace Deprecated Direct Dependencies

- Remove redundant stub type packages after proving their owning libraries provide
  types:
  - `@types/bcryptjs`
  - `@types/marked`
  - `@types/sharp`
  - `@types/uuid`
- Replace unsupported `fluent-ffmpeg` in both audio generators with one tested
  internal FFmpeg process utility that invokes `ffmpeg`/`ffprobe`, preserves duration
  probing and MP3 concatenation behavior, handles non-zero exits, and avoids shell
  interpolation.
- Preserve `@types/fluent-ffmpeg` only until the implementation no longer imports
  `fluent-ffmpeg`, then remove both packages.
- Inventory other install-time deprecation warnings such as
  `react-tailwindcss-datepicker`, `uuid@10`, `recharts@2`, and ESLint 8. Upgrade them
  only if the refreshed matrix classifies the change as compatible; otherwise create
  a follow-up entry.

### FR-6: Deduplicate and Verify the Lockfile

- Run `pnpm dedupe` only after manifest changes are complete and reviewed.
- Review the lockfile diff for unexpected major changes, removed platform binaries,
  and peer-resolution changes.
- Verify `pnpm install --frozen-lockfile` succeeds from the committed manifests and
  lockfile.
- End with `pnpm dedupe --check` clean or document each intentional remaining
  duplication.

### FR-7: Route Major Migrations into Dedicated Follow-Up Tracks

- Produce a major-migration backlog from the refreshed matrix.
- At minimum, classify and separately track:
  - AI SDK/provider packages to the next major generation.
  - Zod 3 to Zod 4, coordinated with `zod_boundary_hardening_20260603`.
  - TypeScript 5 to TypeScript 6.
  - Jest 29 to Jest 30.
  - Zustand 4 to Zustand 5 for `reading-advantage`.
  - Drizzle ORM `0.44.x` to `0.45.x`.
  - pnpm 8 to pnpm 11, including CI/Corepack compatibility.
- Do not upgrade Prisma 6 to Prisma 7. `primary-advantage` is intended to migrate
  from Prisma to Drizzle; upgrading Prisma would deepen the wrong dependency.
- Do not combine major Next, AI SDK, Zod, TypeScript, Jest, Zustand, Drizzle, or pnpm
  migrations into this track unless the refreshed registry proves the selected
  release is not a major change.

## Non-Functional Requirements

- Dependency changes are applied in bounded batches with quality gates after each
  batch.
- Existing app behavior remains unchanged except for dependency compatibility fixes.
- No direct provider coupling or architecture changes are introduced during package
  replacement.
- No unrelated dirty-worktree files are staged or committed.
- The final dependency graph has no confirmed vulnerable `next@16.0.0` resolution.
- The final install has no known peer conflicts for Vitest or
  `react-day-picker`/`date-fns`.

## Acceptance Criteria

1. Root `next` override resolves to a registry-confirmed patched Next 16 release.
2. Direct Next and `eslint-config-next` manifests are aligned or have documented,
   tested exceptions.
3. React/React DOM and Vitest-family patch versions are aligned.
4. Allowlisted patch/minor batches pass their affected-workspace quality gates.
5. The two known peer conflicts are resolved.
6. `@types/bcryptjs`, `@types/marked`, `@types/sharp`, and `@types/uuid` are removed
   without type-check regressions.
7. `fluent-ffmpeg` and `@types/fluent-ffmpeg` are removed; audio duration and merge
   behavior have focused tests.
8. `pnpm install --frozen-lockfile` exits 0.
9. `pnpm dedupe --check` exits 0 or intentional exceptions are documented.
10. `pnpm turbo run lint`, `pnpm turbo run test`, `pnpm turbo run check-types`, and
    `pnpm turbo run build` are run; baseline failures are separated from
    upgrade-caused regressions.
11. A dedicated major-migration backlog exists and explicitly excludes Prisma 7.
12. `measure/tech-stack.md` reflects the selected shared framework/tool versions.

## Out of Scope

- Prisma 6 to Prisma 7.
- Implementing the major AI SDK, Zod, TypeScript, Jest, Zustand, Drizzle, or pnpm
  migrations.
- Changing dependency range policy or re-pinning all caret ranges; that belongs to
  `housekeeping_batch_20260603` FR-6.
- Unrelated application refactors discovered while testing upgrades.
- Treating a failed or timed-out `pnpm audit` as evidence of zero vulnerabilities.

## Constraints and Risks

- **Next is globally overridden.** A single root change affects all six apps and
  shared packages. Mitigation: validate each app separately before the monorepo-wide
  gate.
- **The worktree already contains unrelated Measure automation changes.** Mitigation:
  inspect staged and unstaged files before every commit and stage dependency-track
  files explicitly.
- **`reading-advantage` full Jest is known to hang on this hardware.** Mitigation:
  run focused calendar/audio suites and the known targeted Jest command; record the
  full-suite limitation without calling it an upgrade regression.
- **`fluent-ffmpeg` replacement touches production audio generation.** Mitigation:
  build one argument-array-based utility, mock process execution in unit tests, and
  run a local FFmpeg smoke test with fixture MP3 files.
- **Registry results drift.** Mitigation: re-run the baseline immediately before
  implementation and record exact selected versions in the upgrade matrix.

## References

- Root `package.json` `pnpm.overrides`
- All `apps/*/package.json` and `packages/*/package.json` manifests
- `pnpm-lock.yaml`
- `apps/reading-advantage/server/utils/generators/audio-generator.ts`
- `apps/primary-advantage/server/utils/genaretors/audio-generator.ts`
- `apps/reading-advantage/components/ui/calendar.tsx`
- `measure/tracks/housekeeping_batch_20260603/` FR-6
- `measure/tracks/zod_boundary_hardening_20260603/`
- `measure/tech-debt.md` React/React-Konva and primary-advantage Prisma rows
