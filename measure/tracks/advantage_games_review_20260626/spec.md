# Specification: Advantage Games Review

## Overview

Review `apps/advantage-games`, the reusable educational game platform used to create games for import into Reading Advantage and Primary Advantage. The app is about six months old and should be reviewed as both a standalone game gallery and an embeddable product inventory.

## Scope

Primary scope: `apps/advantage-games`.

Known baseline:

- 289 TypeScript graph files.
- 1,700 graph nodes.
- 600 functions.

Review surfaces:

- Every implemented game.
- Shared game shell/runtime.
- Scoring, XP, leaderboards, progress, and difficulty systems.
- Importability into Reading and Primary apps.
- Asset loading, audio, performance, mobile support, and browser compatibility.
- Accessibility and age-appropriate UX.
- Test coverage, E2E helpers, and game-specific regressions.

## Required Artifacts

Create `measure/audit-reports/advantage-games_20260626/` containing:

- `00-inventory.md`
- `game-readiness-matrix.md`
- `workflow-map.md`
- `checklist.md`
- `findings.md`
- `migration-tracks.md`
- `test-gaps.md`
- `executive-summary.md`

## Non-Goals

- Do not redesign games in this review track.
- Do not import games into Reading or Primary during review.
- Do not treat visual polish issues as equivalent to correctness/accessibility issues.

## Acceptance Criteria

- Every game has a readiness row with status, blockers, test coverage, mobile/accessibility notes, and import readiness.
- Shared runtime findings are separated from per-game findings.
- Import-contract gaps for Reading and Primary are explicitly documented.
