# Plan: Audit Housekeeping Batch

> 10 small, isolated fixes. Each ships in its own commit (or a small batch) for easy review. Total: 1–2 days.

## Phase 0: Setup

- [x] Task: Create a checklist of the 10 items; mark off as each completes.
- [x] Task: Coordinate with Track 11 (CI Alignment) — F-1306 (app-local CI) is also addressed there. Pick one track to do the deletion (Track 11's PR); this track's PR skips FR-10.

### FR → Phase Checklist

| FR | Severity | Title | Phase | Status |
|----|----------|-------|-------|--------|
| F-205 | Medium | Relocate legacy `prisma/` seed-data | Phase 1 | [ ] |
| F-705 | Low | Verify/delete 4 auth `route.ts` stubs | Phase 2 | [ ] |
| F-1102 | Low | Update `AGENTS.md` (remove Prisma/npm refs) | Phase 3 | [ ] |
| F-1202 | Low | Add `*.log` to `.gitignore` | Phase 4 | [ ] |
| F-1305 | Low | Backfill 5 orphan in-code TODOs | Phase 5 | [ ] |
| F-1201 | Medium | Re-pin 51 `^`-ranged deps (or doc deviation) | Phase 6 | [ ] |
| F-1207 | Medium | Add `git notes` to 24 refactor commits | Phase 7 | [ ] |
| F-1301 | Medium | |
| F-503 | Medium | Add `docs/adr/` + SQL-ADR guard lint | Phase 8 | [ ] |
| F-1301 | Medium | Add `commitlint` config (subject-line track ref) | Phase 9 | [ ] |
| F-1306 | Medium | App-local CI workflow deletion | Phase 10 | [x] Deferred |

> **Track 11 coordination**: `ci_typecheck_alignment_20260603` is complete (`apps/science-advantage/.github/workflows/ci.yml` already absent). Phase 10 deferred — F-1306 resolved by Track 11. This track handles the remaining 9 findings.

### Graph Baseline (build-graph)

- `graph.db`: 2,199 nodes / 3,125 edges / 303 files (fresh)
- `prisma/`: Only 2 sentinel-probe field refs (string `"0013_prisma_drizzle_schema_unification"`) — zero code imports from `prisma/` directory; dead code confirmed.
- Auth stubs: `POST /api/auth/login` (science), `POST /api/auth/logout`, `GET /api/auth/session`, `POST /api/auth/impersonate` — all 4 have **zero graph callers**. Still confirm with `rg` (route handlers can be string-loaded).
- `badges.ts`: 27 entities; orphan TODO at line 115 is internal — no external consumer of language-preference state.

## Phase 1: Relocate Legacy `prisma/` Seed-Data

- [ ] Task: Create `apps/science-advantage/scripts/seed-data/{grade-4/{lessons,questions},curriculum-units,lessons,questions,standards}/` directories.
- [ ] Task: `git mv` the JSON files from `prisma/` to `scripts/seed-data/` (preserves history).
- [ ] Task: Move `prisma/seed-data/README.md` → `scripts/seed-data/README.md`.
- [ ] Task: Move `prisma/seed-functions/update-seed-files.ts` → `scripts/seed/update-seed-files.ts`.
- [ ] Task: `grep -rl "prisma/data\|prisma/seed-data\|prisma/seed-functions" apps/science-advantage/scripts/` — enumerate import paths to update.
- [ ] Task: Update import paths in the 7 seed scripts.
- [ ] Task: Run `pnpm db:seed` end-to-end; confirm the resulting data shape is unchanged.
- [ ] Task: `rm -rf apps/science-advantage/prisma/`.
- [ ] Task: Add a note to `apps/science-advantage/AGENTS.md`: "The `prisma/` directory must not exist at the app root. If you see it, it is a regression."

## Phase 2: Verify or Delete 4 Auth `route.ts` Stubs

- [ ] Task: `rg 'app/api/auth/(login|logout|session|impersonate)' apps/science-advantage/` — enumerate all references.
- [ ] Task: If 0 references: `rm apps/science-advantage/app/api/auth/{impersonate,login,logout,session}/route.ts`. Delete the empty `app/api/auth/` directory if no other files remain.
- [ ] Task: If references exist: add a comment to each stub explaining the delegation + the test that covers it.
- [ ] Task: Run `pnpm turbo run test --filter=science-advantage`; confirm green.

## Phase 3: Update `apps/science-advantage/AGENTS.md`

- [ ] Task: Read the current `AGENTS.md`.
- [ ] Task: Remove all references to `prisma`, `next-auth`, `npx prisma ...`, `npm install`, `npm run ...`.
- [ ] Task: Add a header note: "This file documents app-specific deviations from the monorepo `AGENTS.md`. For shared conventions (auth, packages, CI), see the monorepo root."
- [ ] Task: Update the test section to reference `pnpm test` (not `npm run test`).
- [ ] Task: Verify the file is consistent with the actual `package.json` scripts.

## Phase 4: Add `*.log` to `.gitignore`

- [ ] Task: Open `apps/science-advantage/.gitignore`.
- [ ] Task: Add `*.log` to the patterns (or a more specific pattern if other `*.log` files are intentional).
- [ ] Task: `git clean -f apps/science-advantage/{gemini_design_update,visual_refresh_track}.log`.
- [ ] Task: Verify: `ls apps/science-advantage/*.log` returns no files (or only intentional ones).

## Phase 5: Backfill 5 Orphan In-Code TODOs

- [ ] Task: File 1 GH issue for the language-preference tracking in `lib/gamification/badges.ts:115`.
- [ ] Task: File 1 GH issue for the i18n + lesson-slug TODOs (covers 4 in-code TODOs in `app/api/lessons/[lessonSlug]/route.ts` and `app/api/classes/[classId]/curriculum/route.ts`).
- [ ] Task: Update each in-code TODO with `// TODO(#<issue-number>): ...` reference.
- [ ] Task: Verify: `rg "TODO" apps/science-advantage/{app,lib,components}/ -g '!**/*.test.*' -g '!**/__tests__/**'` returns 0 orphan comments (or only intentionally-tracked ones).

## Phase 6: Re-Pin 51 `^`-Ranged Deps

- [ ] Task: Decide a pnpm `save-exact` policy: add `save-exact=false` to `.npmrc` (existing behavior; the 51 `^` ranges are grandfathered).
- [ ] Task: Document the decision in `apps/science-advantage/AGENTS.md`: "Dependencies use `^` ranges for flexibility. The pnpm-lock.yaml is the source of truth at install time."
- [ ] Task: If the maintainer wants strict pinning: run `pnpm --filter science-advantage add <pkg>@latest --save-exact` for each of the 51 deps. Verify `pnpm install --frozen-lockfile` still resolves.
- [ ] Task: For this track, default to the documented deviation; strict pinning is a follow-up.

## Phase 7: Add `git notes` to 24 `refactor(science):` Ports

- [ ] Task: Enumerate the 24 `refactor(science):` commits in the last 100 commits: `git log --oneline -100 -- apps/science-advantage/ | rg "refactor\(science\)"`.
- [ ] Task: For each commit, check the body to confirm it belongs to `prisma_drizzle_science_controllers_20260505`. (Most do; a few are independent refactors.)
- [ ] Task: For each confirmed commit: `git notes add -m "prisma_drizzle_science_controllers_20260505" <sha>`.
- [ ] Task: Verify: `git log --grep "prisma_drizzle_science_controllers" --notes -50` returns the 24 commits with the note attached.
- [ ] Task: Document the backfill in `measure/lessons-learned.md`.

## Phase 8: Add `docs/adr/` Directory

- [ ] Task: Create `packages/db/docs/adr/0001-use-drizzle-not-prisma.md` — reverse-engineer from the `prisma_drizzle_*` track plans.
- [ ] Task: Create `packages/db/docs/adr/0002-drop-jwt-era-accounts-columns.md` — explain the destructive `0003_slow_firebrand.sql` migration.
- [ ] Task: Create `packages/db/docs/adr/0003-add-intern-role.md` — explain the `0012_codecamp_intern_role.sql` migration.
- [ ] Task: Update `0012_codecamp_intern_role.sql` with a header comment referencing the ADR.
- [ ] Task: Add a CI lint: a script that grep-fails on `DROP TABLE` / `DROP COLUMN` lines not followed by an ADR reference within 10 lines. Wire into `scripts/ci/`.

## Phase 9: Add `commitlint` Config

- [ ] Task: Add `commitlint` + `@commitlint/config-conventional` + `husky` to the monorepo root `devDependencies`.
- [ ] Task: Create `commitlint.config.js`:
  ```js
  module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
      'subject-pattern': [2, 'always', /^(feat|fix|chore|docs|refactor|test|perf|build|ci|style)\([^)]+\)!?:\s.+\s\(?(?:track[_-]?id:?\s)?([a-z_]+_20260\d{4})?\)?/],
    },
  };
  ```
  (The exact regex enforces subject-line track reference for non-chore commits.)
- [ ] Task: Wire into a `commit-msg` husky hook in `.husky/commit-msg`.
- [ ] Task: Test: `git commit -m "feat(science): add a new feature"` (no track ID) — the commit is rejected.
- [ ] Task: Test: `git commit -m "feat(science): add a new feature (track_id: mytrack_20260603)"` — accepted.
- [ ] Task: Document in `AGENTS.md` that the rule applies to new commits; historical commits are not affected.

## Phase 10: App-Local CI Workflow (F-1306, also Track 11 FR-9) — DEFERRED

- [x] Task: **Skipped** — Track 11 (`ci_typecheck_alignment_20260603`) completed the deletion. `apps/science-advantage/.github/workflows/ci.yml` is already absent. F-1306 resolved by Track 11.

## Phase 11: Final Acceptance

- [ ] Task: `pnpm turbo run test --filter=science-advantage` exits 0.
- [ ] Task: `pnpm turbo run seed` runs end-to-end; the resulting data shape is unchanged.
- [ ] Task: `pnpm turbo run lint --filter=science-advantage` exits 0.
- [ ] Task: `pnpm turbo run build --filter=science-advantage` exits 0.
- [ ] Task: All 10 items in the FR list completed (or the F-1306 deletion deferred to Track 11).

## Phase 12: Closeout

- [ ] Task: Update `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` to `Resolved`. (F-1306 resolves to Track 11; this track resolves the other 9.)
- [ ] Task: Add a lessons-learned entry: "Batched housekeeping is the right pattern for Low/Medium findings — one PR with 10 small fixes is cheaper to review than 10 PRs."
- [ ] Task: Move track to `measure/archive/housekeeping_batch_20260603/` and update `measure/tracks.md`.
