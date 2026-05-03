# Specification: Tech Debt Resolution

## Overview

Resolve all open tech-debt items from `measure/tech-debt.md` that are **not** covered by existing pending tracks (Reading-Advantage Build Remediation, Primary-Advantage Stabilization, ESLint v9 Migration, Science-Auth Migration). Prioritized by severity.

## Functional Requirements

### Phase 1: Critical Infrastructure Blockers (High)
- Generate Drizzle migration for unified auth schema
- Migrate reading-advantage controllers (user, license, generator) from Prisma to Drizzle

### Phase 2: App Build Configuration Cleanup (Medium)
- Remove `ignoreBuildErrors: true` from www-reading-advantage and fix underlying TS errors
- Fix advantage-games Difficulty type mismatches (~15 files) and remove `ignoreBuildErrors`
- Fix `prisma generate` build requirement for reading-advantage

### Phase 3: Schema Integrity (Medium)
- Document or fix `studentAnswers.questionId` polymorphic reference (dual FK pattern)
- Investigate and resolve `lessonProgress.lessonId` text vs UUID mismatch
- Migrate 7 Firestore no-op stub callers to Prisma/Drizzle or delete dead code
- Document primary-advantage dual Prisma schema boundary in packages/db/README.md

### Phase 4: App-Specific Cleanup (Medium-Low)
- Fix www-reading-advantage 2 Vite test suite failures
- Audit and clean up www revideo devDependencies
- Verify primary-advantage base64-js dependency status

### Phase 5: Shared Tooling & Dependencies (Low)
- Resolve react-konva peer dependency warning (upgrade React or suppress)
- Reduce advantage-games ESLint warnings from 6236 to <500
- Migrate 5 files off `configs/locale-config.ts` and delete if empty
- Add shared `Locale` type to `@reading-advantage/config`

## Acceptance Criteria

- All High and Medium items resolved or explicitly deferred with justification
- `pnpm turbo run build` passes for all affected apps without `ignoreBuildErrors`
- Tech debt registry updated: resolved items marked `Resolved`, new items documented
- No regressions in existing test suites
- Every rewritten function has corresponding tests

## Out of Scope

- Items covered by existing pending tracks:
  - reading-advantage: 128 lint warnings, 26 test suites (Build Remediation track)
  - primary-advantage: 49 lint errors, no test suite (Stabilization track)
  - ESLint v9 flat config migration (ESLint v9 track)
  - science-advantage auth Prisma→Drizzle (Science Auth track)
- New features or product changes
- Production deployment
