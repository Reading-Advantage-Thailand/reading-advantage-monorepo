# Specification: Migration Review Remediation

## Background

The 2026-06-16 reviews of `ai_sdk_major_migration` and `drizzle045_major_migration`
identified several open items that prevent clean track closure. This chore track
addresses all of them in a single focused pass.

## Findings (from review-2026-06-16.md files)

### ai_sdk_major_migration

| ID | Finding | Severity |
|----|---------|----------|
| A1 | `metadata.json` status is `in_progress` but all Phase 4 tasks are `[x]` | Medium |
| A2 | 6 stale `preserve-jr-green-*` stashes in repo | Low |
| A3 | `ai` version pin inconsistent: `^5.0.201` in some manifests, `^5.0.95` in others | Low |
| A4 | `tech-stack.md` Selected Shared Versions table missing Drizzle row | Medium |

### drizzle045_major_migration

| ID | Finding | Severity |
|----|---------|----------|
| D1 | `metadata.json` status is `backlog` but Phases 1–3 are green | Medium |
| D2 | Marketing schema exported from barrel but no migration generated — schema/migration drift | High |
| D3 | `check-types` fails on 0.45's stricter `PgTableWithColumns` typing in test files | High |
| D4 | `test-strategy.md` §7 says `drizzle-kit >=0.32` but test asserts `>=0.31.7` (no stable 0.32) | Low |
| D5 | Phase 4 closure-gate test is red by design (10 fail / 2 pass) — implementation not started | High |
| D6 | `tech-stack.md` Selected Shared Versions table missing Drizzle row | Medium |
| D7 | `tech-stack.md` AI SDK row present but Drizzle row absent | Medium |

### Shared

| ID | Finding | Severity |
|----|---------|----------|
| S1 | Uncommitted worktree changes outside both tracks (enums.ts, AGENTS.md, deleted track dir) | Low |

## Acceptance Criteria

1. `ai_sdk_major_migration/metadata.json` status set to `completed`.
2. `drizzle045_major_migration/metadata.json` status set to `completed`.
3. All 6 stale stashes dropped (after verification they are superseded).
4. `ai` version pins normalized to a single version across all manifests.
5. Marketing schema migration generated and committed (or barrel export removed if schema is not production-ready).
6. `check-types` errors in drizzle045 test files fixed or explicitly excluded.
7. `test-strategy.md` §7 reconciled: `>=0.32` corrected to `>=0.31.7`.
8. `measure/tech-stack.md` Selected Shared Versions table includes rows for `ai ^5.x`, `@ai-sdk/*`, `drizzle-orm 0.45.2`, `drizzle-kit ^0.31.7`, and `drizzle-zod ^0.7.0`.
9. Unrelated worktree changes committed under their owning context or reverted.
10. Phase 4 drizzle045 closure-gate tests pass (12/12).
