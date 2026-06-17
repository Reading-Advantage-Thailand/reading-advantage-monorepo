# Test Strategy: Audit Housekeeping Batch (housekeeping_batch_20260603)

## Nature of the Track

This is a **chore/cleanup** track. Most phases ship **artifact/documentation contracts** (file moves, gitignore entries, AGENTS.md edits, ADRs, git notes, commitlint config) rather than new product behavior. There is **one runtime gate that must prove live**: `pnpm db:seed` for `science-advantage` after the `prisma/` → `scripts/seed-data/` relocation. Every other phase is verified by static checks (file presence/absence, grep, lint), with the existing `science-advantage` test/lint/build suites as a regression backstop.

## Testing Pyramid Per Phase

| Phase | Layer | Primary verification | Live or contract? |
|---|---|---|---|
| 0 Setup | n/a | checklist commit | contract |
| 1 Relocate prisma/ seed-data | integration | `pnpm db:seed` end-to-end | **live** |
| 2 Auth route stubs | static | `rg` reference count + science-advantage test suite | contract + live regression |
| 3 AGENTS.md edits | static | grep absence of `prisma`/`next-auth`/`npm` | contract |
| 4 `.gitignore` `*.log` | static | `git check-ignore` | contract |
| 5 Backfill TODOs | static | `rg "TODO"` returns only `TODO(#nnn)` | contract |
| 6 Re-pin deps | static | doc note present; deviation accepted | contract |
| 7 git notes | static | `git notes list` covers 24 SHAs | contract |
| 8 ADRs + SQL guard lint | static + script | grep ADRs exist; lint script red→green on fixture | contract + bounded live |
| 9 commitlint | bounded live | `echo msg \| pnpm commitlint` rejects/accepts | bounded live |
| 10 App-local CI | static | file deleted; root CI has `path-filter` | contract |
| 11 Final acceptance | live | `lint`, `test`, `build`, `seed` all exit 0 | live |
| 12 Closeout | static | tech-debt + tracks.md updated | contract |

## Shared Test Fixtures and Mocks

- **Seed data integrity fixture (Phase 1):** snapshot SHA-256 of every relocated `.json` (`find apps/science-advantage/prisma -name '*.json' -exec sha256sum {} \; | sort > /tmp/pre.sha`); compare post-move (`find apps/science-advantage/scripts/seed-data -name '*.json' -exec sha256sum {} \; | sort > /tmp/post.sha`). Filenames change but content hashes must match 1:1.
- **Pre-checkpoint commit SHA:** before Phase 1 starts, capture `git rev-parse HEAD` for the diff scope used by closeout (per workflow.md §Phase Completion).
- **Commitlint fixture (Phase 9):** two canned commit-message strings — one rejected, one accepted — fed via `echo … | pnpm exec commitlint`. No real commits are produced.
- **SQL-ADR-guard fixture (Phase 8):** two minimal SQL files in `/tmp` — one with `DROP COLUMN` and `-- ADR:` within 10 lines (passes), one without (fails). Used to prove the lint script is wired.
- **No DB mocks needed.** `pnpm db:seed` runs against the local Docker Postgres started via `pnpm db:start` (already part of dev workflow).

## Cross-Phase Edge Cases & Dependencies

1. **Phase 1 → Phase 11**: The relocation must complete before final `seed` acceptance; if any of the 7 seed-script imports is missed, Phase 11 catches it.
2. **Phase 2 stubs**: `app/api/auth/reset-password/route.ts` exists in tree but is **not** in scope; ensure FR-2 deletion globs only the four named routes.
3. **Phase 7 git notes ↔ Phase 9 commitlint**: commitlint must NOT validate historical commits (only `commit-msg` hook on new commits); otherwise the 24 backfilled commits would be re-flagged.
4. **Phase 10 ↔ Track 11**: F-1306 deletion is owned by exactly one PR. Coordinate via tracks.md before deleting.
5. **Phase 8 ADR lint** must allow-list pre-existing migrations until they are annotated, or ratchet only on new SQL files. Otherwise CI breaks immediately.
6. **AGENTS.md edits (Phase 3)** must keep `pnpm`/Drizzle references that are still accurate; do not over-prune.

## Architecture Guardrails (AGENTS.md)

- **No business-logic changes** in this track. Domain functions, tRPC routers, and adapters are untouched. If a phase tempts an in-place behavior change, stop and create a follow-up track.
- **Provider neutrality**: do not introduce new SDK couplings while moving seed data. Imports must stay relative within the app.
- **Multi-tenant scoping**: untouched (no schema changes). `tenant-coverage.test.ts` must keep passing.
- **No migrations in this track**: ADRs in Phase 8 are documentation only — they must not modify `packages/db/drizzle/*.sql` (except a header comment on `0012_codecamp_intern_role.sql`, which is non-functional).
- **Drizzle is source of truth**: deleting `prisma/` must not leave dangling references in tooling (`turbo.json`, `package.json` scripts, `tsconfig` paths).

## Per-Phase Test Approach (brief)

- **P1 Relocate**: hash-snapshot fixture → `git mv` → update imports → `pnpm db:seed` proves wiring → post-snapshot hash-equal proves data identity.
- **P2 Stubs**: `rg` proves zero callers (or documents callers); science-advantage test suite proves no runtime regression.
- **P3 AGENTS.md**: grep-based negative assertions (`rg -F 'prisma' apps/science-advantage/AGENTS.md` returns 0) and positive (header note present).
- **P4 `.gitignore`**: `git check-ignore -v apps/science-advantage/foo.log` returns the new rule line; `git status --porcelain` shows no tracked `*.log`.
- **P5 TODOs**: `rg -n "TODO(?!\(#)" apps/science-advantage/{app,lib,components} -g '!**/*.test.*'` returns 0.
- **P6 Deps**: doc-only; static read of AGENTS.md note. No version churn.
- **P7 git notes**: `git notes list | wc -l` ≥ pre-count + 24; `git log --notes --grep prisma_drizzle_science_controllers_20260505` shows expected SHAs.
- **P8 ADR + SQL guard**: file presence checks; the SQL-ADR lint script run against the two-file fixture (one pass, one fail) proves wiring without scanning the full `drizzle/` tree.
- **P9 commitlint**: `echo "feat(science): x" | pnpm exec commitlint` exits non-zero; same with track-id suffix exits zero. Husky hook is exercised by a single trial commit on a throwaway branch (then reset), not by replaying history.
- **P10 CI**: `test -f apps/science-advantage/.github/workflows/ci.yml` is false; root CI YAML grep for `apps/science-advantage/**` path-filter.
- **P11 Acceptance**: full `pnpm turbo run lint|test|build --filter=science-advantage` and `pnpm turbo run seed` (or equivalent `pnpm --filter science-advantage db:seed`).

## Build-Graph Findings That Shaped the Strategy

- `build-graph stats`: 2,199 nodes / 3,125 edges across 303 files. **Zero seed-related symbols** under `prisma/seed-functions/update-seed-files.ts` (search returned no results) — confirms `prisma/` is dead-code from a graph perspective; relocation will not break a typed import graph, only the seed-script string paths.
- `build-graph search badges` shows `apps/science-advantage/lib/gamification/badges.ts` with 27 entities; the orphan TODO at line 115 is internal — graph confirms no external consumer of language-preference state, so a TODO-only fix is safe.
- `build-graph search AGENTS` returns the root `AGENTS.md`; `apps/science-advantage/AGENTS.md` is unindexed (markdown), so edits are pure doc work with no symbol blast radius.
- No graph nodes reference `app/api/auth/{login,logout,session,impersonate}/route.ts` exports — supports the "delete if zero refs" path in FR-2 (still confirm with `rg` since route handlers are sometimes string-loaded).
- Graph does not need re-scanning during this track unless Phase 1 import updates change TS files (`build-graph update ./graph.db <changed-files>` after Phase 1).

## Live-Proof Plan (Red command → Green/closeout gate)

| Phase | Targeted Red command | Green / closeout gate |
|---|---|---|
| 1 | `pnpm --filter science-advantage db:seed` (must fail before imports updated) | `pnpm --filter science-advantage db:seed` exits 0 **and** `diff /tmp/pre.sha /tmp/post.sha` empty |
| 2 | `rg -n 'app/api/auth/(login\|logout\|session\|impersonate)' apps/science-advantage/` | `pnpm turbo run test --filter=science-advantage` exits 0 |
| 3 | `rg -n 'prisma\|next-auth\|npx prisma\|npm install' apps/science-advantage/AGENTS.md` (must be >0 before) | same command returns 0 |
| 4 | `git check-ignore apps/science-advantage/test.log` (non-zero before) | exits 0 and prints the rule |
| 5 | `rg -n 'TODO(?!\(#)' apps/science-advantage/{app,lib,components} -g '!**/*.test.*'` (>0 before) | returns 0 |
| 6 | n/a (doc-only) | grep finds the deviation note in `apps/science-advantage/AGENTS.md` |
| 7 | `git notes list \| grep -c <sha>` returns 0 for sample SHA | returns 1 for each of the 24 SHAs |
| 8 | run SQL-ADR-guard script on the **failing fixture** (must exit non-zero); run on `0012_codecamp_intern_role.sql` before annotation (also non-zero) | run on the **passing fixture** and on the annotated `0012` (both exit 0); do **not** run guard against the entire `drizzle/` tree this track |
| 9 | `echo "feat(science): no track ref" \| pnpm exec commitlint` (must exit non-zero) | `echo "feat(science): x (track_id: housekeeping_batch_20260603)" \| pnpm exec commitlint` exits 0; throwaway-branch commit hook fires once |
| 10 | `test -f apps/science-advantage/.github/workflows/ci.yml` (true before) | false after; root CI YAML grep for `apps/science-advantage/\*\*` path-filter returns ≥1 |
| 11 | n/a | `pnpm turbo run lint test build --filter=science-advantage` and `pnpm --filter science-advantage db:seed` all exit 0 |

## Fake Harness Policy

No fake harnesses are required. The commitlint and SQL-ADR-guard checks use **bounded fixture inputs** (single-line piped string; two-file `/tmp` fixture). They are **not** wired to a watch-mode runner and cannot fall through into the full repository suite. The full `pnpm turbo run test` only runs at Phase 11 acceptance against real code.

## Intentionally-Red Files / Aggregate-Suite Discovery

None. This track does not introduce new test files. The existing `apps/science-advantage` test suite must stay green throughout; any pre-existing red tests are out of scope and tracked separately in `measure/tech-debt.md`. If Phase 9 adds a `commitlint.config.js` at repo root, it must not be picked up by `vitest`/`jest` globs (extension is `.js` and lives at root, outside `src/`).
