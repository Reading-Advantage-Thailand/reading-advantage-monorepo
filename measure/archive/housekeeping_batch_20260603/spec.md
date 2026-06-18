# Specification: Audit Housekeeping Batch

## Overview

Batched Low-priority cleanup of 10 findings surfaced by the 2026-06-03 science-advantage audit. Each item is a small, isolated fix; the whole batch ships in 1–2 days. Cross-references: F-1306 and F-1203 are also addressed by Track 11 (CI Alignment) — coordinate the deletion.

## Problem

Audited 2026-06-03. 10 Low/Medium findings batched for one cleanup PR:

| Finding | Severity | Title |
|---------|----------|-------|
| F-205 | Medium | Legacy `apps/science-advantage/prisma/` directory still present (56 files, no `schema.prisma`) |
| F-503 | Medium | Most destructive migration is well-commented inline but has no formal ADR; `0012_codecamp_intern_role.sql` has zero comments |
| F-705 | Low | 4 auth `route.ts` stubs at `app/api/auth/*/route.ts` (6 lines each) — verify if dead code |
| F-1102 | Low | App-local `AGENTS.md` references Prisma and `npm` |
| F-1201 | Medium | 51/57 deps are `^`-ranged; only 6 are pinned |
| F-1202 | Low | Stray `.log` files at app root not in `.gitignore` |
| F-1207 | Medium | 7/50 commits reference a track ID (all in body, 0/50 in subject) |
| F-1301 | Medium | 3 of 5 largest refactors ship without any track reference |
| F-1305 | Low | 5 orphan in-code `TODO` comments in non-test source files |
| F-1306 | Medium | App-local CI workflow uses `npm` + `package-lock.json` (overlaps with Track 11) |

## Why

- The 10 findings are individually Low/Medium but cumulatively clutter the codebase. One batched PR clears them.
- The legacy `prisma/` directory is a footgun for new contributors (looks like Prisma is in use; it isn't).
- Orphan TODOs decay into noise; backfilling them with GH issues is the right maintenance pattern.
- Commit-hygiene backfill preserves the audit trail for the recent 50 commits that lost their track references during the Prisma→Drizzle migration.

## Functional Requirements

### FR-1: Relocate Legacy `prisma/` Seed-Data

- `apps/science-advantage/prisma/data/content/grade-4/lessons/` (10 .json) → `apps/science-advantage/scripts/seed-data/grade-4/lessons/`.
- `apps/science-advantage/prisma/data/content/grade-4/questions/` (10 .json) → `apps/science-advantage/scripts/seed-data/grade-4/questions/`.
- `apps/science-advantage/prisma/data/content/grade-4/standards-mapping.json` → `apps/science-advantage/scripts/seed-data/grade-4/standards-mapping.json`.
- `apps/science-advantage/prisma/seed-data/curriculum-units/` (2 .json) → `apps/science-advantage/scripts/seed-data/curriculum-units/`.
- `apps/science-advantage/prisma/seed-data/lessons/` (16 .json) → `apps/science-advantage/scripts/seed-data/lessons/`.
- `apps/science-advantage/prisma/seed-data/questions/` (12 .json) → `apps/science-advantage/scripts/seed-data/questions/`.
- `apps/science-advantage/prisma/seed-data/standards/` (2 .json) → `apps/science-advantage/scripts/seed-data/standards/`.
- `apps/science-advantage/prisma/seed-data/README.md` → `apps/science-advantage/scripts/seed-data/README.md`.
- `apps/science-advantage/prisma/seed-functions/update-seed-files.ts` → `apps/science-advantage/scripts/seed/update-seed-files.ts`.
- Update all import paths in the 7 seed scripts (`scripts/seed/seed-*.ts`, `scripts/seed-demo-users.ts`, `scripts/migrate-lesson-content.ts`).
- Delete `apps/science-advantage/prisma/` entirely.
- Add a `CODEOWNERS` rule (or `apps/science-advantage/AGENTS.md` note) that no app may have a `prisma/` dir at root.

### FR-2: Verify or Delete 4 Auth `route.ts` Stubs

- `apps/science-advantage/app/api/auth/{impersonate,login,logout,session}/route.ts` (6 lines each).
- `rg 'app/api/auth/(login|logout|session|impersonate)'` — enumerate all references.
- If 0 references: delete the 4 files.
- If references exist: add a comment explaining the delegation and the test that covers it.

### FR-3: Update `apps/science-advantage/AGENTS.md`

- Remove all references to `prisma`, `next-auth`, `npx prisma ...`, `npm install`.
- Add a note pointing to the monorepo `AGENTS.md` for shared conventions.
- The app-local `AGENTS.md` is now an app-specific supplement, not a top-level guide.

### FR-4: Add `*.log` to `.gitignore`

- `apps/science-advantage/.gitignore:61` — add `*.log` to the patterns list.
- `git clean -f` the 2 stray log files (`gemini_design_update.log`, `visual_refresh_track.log`).

### FR-5: Backfill 5 Orphan In-Code TODOs

- `lib/gamification/badges.ts:115` (`// TODO: Requires language preference tracking — not yet implemented`) — file a GH issue; add `// TODO(#<issue-number>): ...` reference.
- `app/api/lessons/[lessonSlug]/route.ts:125` (`slug: lesson.id, // TODO: Replace with dedicated slug when available`) — same.
- `app/api/lessons/[lessonSlug]/route.ts:144` (`descriptionThai: standard.description, // TODO: Provide Thai translation when available`) — same.
- `app/api/classes/[classId]/curriculum/route.ts:135` (`titleThai: unit.title, // TODO: Thai translations when schema supports it`) — same.
- `app/api/classes/[classId]/curriculum/route.ts:142` (`slug: lesson.id, // TODO: Use slug field when schema supports it`) — same.

The 4 "slug" / "Thai translation" TODOs are thematically related (i18n + lesson slug schema); a single GH issue can cover all 4.

### FR-6: Re-Pin 51 `^`-Ranged Deps

- `apps/science-advantage/package.json` L22-96 — 51 of 57 deps use `^` (caret). The 6 pinned: `next@16.0.0`, `react@19.2.0`, `react-dom@19.2.0`, `eslint-config-next@16.0.0`, `@types/react@19.2.2`, `@types/react-dom@19.2.2`.
- Decide a pnpm `save-exact` policy: add to `.npmrc` at the monorepo root (`save-exact=true` for new packages; existing `^` ranges are grandfathered).
- For the 51 `^` ranges: leave as-is (practical risk is low; lockfile is the source of truth at install time). Document the decision in a 1-line `apps/science-advantage/AGENTS.md` note.
- **Acceptance:** if the maintainer wants strict pinning, run `pnpm --filter science-advantage add <pkg>@latest` for each (a larger change). For this track: document the deviation.

### FR-7: Add `git notes` to 24 `refactor(science):` Ports

- The 24 `refactor(science):` ports under the archived `prisma_drizzle_science_controllers_20260505` track lost their track references during the 2026-05-23 migration.
- `git notes add -m "prisma_drizzle_science_controllers_20260505" <sha>` for each.
- Document the backfill in a lessons-learned entry.

### FR-8: Add `docs/adr/` Directory

- `packages/db/docs/adr/0001-use-drizzle-not-prisma.md` — reverse-engineer from `0003_slow_firebrand.sql` and the `prisma_drizzle_*` track plans.
- `packages/db/docs/adr/0002-drop-jwt-era-accounts-columns.md` — explain the destructive `0003` migration.
- `packages/db/docs/adr/0003-add-intern-role.md` — explain the `0012_codecamp_intern_role.sql` migration.
- Update the `0012_codecamp_intern_role.sql` file with a header comment referencing `0003-add-intern-role.md`.
- Add a CI lint that fails on a `DROP TABLE` / `DROP COLUMN` line that isn't followed within 10 lines by a comment starting with `-- ADR:` or `-- Why:`.

### FR-9: Add `commitlint` Config

- Add `commitlint` + `husky` to the monorepo root `devDependencies`.
- Add `commitlint.config.js` with the `cz-conventional-changelog` preset.
- Enforce subject-line track reference for non-chore commits: the subject must contain a `_2026\d{4}\d{2}\d{2}` pattern.
- Wire into a `commit-msg` husky hook.
- **Note:** this affects the entire monorepo, not just science-advantage. Coordinate with the other apps.

### FR-10: App-Local CI Workflow (F-1306, also Track 11 FR-9)

- This FR is also covered by Track 11 (CI Alignment) FR-9. Coordinate the deletion so it happens once.
- Delete `apps/science-advantage/.github/workflows/ci.yml` (the dead/drifted workflow).
- Verify the monorepo root CI has a `path-filter: apps/science-advantage/**` (Track 11 FR-10).

## Non-Functional Requirements

- **No functional regressions**: all seed scripts run end-to-end via `pnpm db:seed`; all existing tests pass.
- **The 5 orphan TODOs have GH issue references** before the track closes.
- **`git notes` are attached** to the 24 commits; `git log --grep prisma_drizzle_science_controllers_20260505` returns them.
- **Lint + type-check + build** green for `apps/science-advantage`.

## Acceptance Criteria

1. `apps/science-advantage/prisma/` directory deleted; seed-data relocated to `scripts/seed-data/`.
2. 4 auth stubs verified (alive) or deleted.
3. `apps/science-advantage/AGENTS.md` references Drizzle + pnpm only.
4. `*.log` added to `apps/science-advantage/.gitignore`; 2 stray log files cleaned.
5. 5 orphan TODOs have GH issue references.
6. 51 `^`-ranged deps re-pinned (or deviation documented).
7. 24 `refactor(science):` ports have `git notes`.
8. `docs/adr/` directory created with 3 ADRs.
9. `commitlint` config added; commit-msg hook enforces subject-line track reference.
10. App-local `ci.yml` deleted (or merged into monorepo root path-filtered job).
11. `pnpm turbo run test --filter=science-advantage` exits 0.
12. `pnpm turbo run seed` runs end-to-end; the resulting data shape is unchanged.

## Out of Scope

- The `commitlint` config affects the entire monorepo, not just science-advantage. Coordinate with the other apps' teams; do not force the change in this track.
- New `CODEOWNERS` rules (the AGENTS.md note is sufficient).
- Renaming `scripts/seed-data/` to `seed-content/` (or similar) — separate naming track.
- Migrating the 24 `refactor(science):` commits to add the track ID in the subject line (would require rewriting history; `git notes` is the right pattern).

## Constraints & Risks

- **Risk: The `prisma/` relocation touches 7+ seed scripts; an import path miss breaks `pnpm db:seed`.** Mitigation: run the seed end-to-end after the relocation; document the new paths in `apps/science-advantage/scripts/seed-data/README.md`.
- **Risk: `git notes` requires Git's notes ref to be initialized.** Mitigation: `git config --global core.notesRef refs/notes/commits`; the monorepo's existing config should already have this.
- **Risk: The `commitlint` config is a monorepo-wide change.** Mitigation: ship the config; the existing 50/50 Conventional Commits compliance means the new rule (subject-line track reference) won't reject historical commits; it only affects new commits.
- **Risk: Some of the 24 `refactor(science):` ports may not belong to the archived `prisma_drizzle_science_controllers_20260505` track.** Mitigation: review the body of each before adding the note; only attach the note if the body confirms the parent track.

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 2 (F-205), §Section 5 (F-503), §Section 7 (F-705), §Section 11 (F-1102), §Section 12 (F-1201, F-1202, F-1207), §Section 13 (F-1301, F-1305, F-1306)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 12
- `apps/science-advantage/prisma/` (the directory to delete)
- `apps/science-advantage/AGENTS.md` (the file to update)
- `apps/science-advantage/.github/workflows/ci.yml` (the file to delete; also Track 11)
- `packages/db/drizzle/0003_slow_firebrand.sql` (the source for ADR 0002)
- `packages/db/drizzle/0012_codecamp_intern_role.sql` (the source for ADR 0003)
- AGENTS.md §13.5 (no orphan TODOs), §12.2 (no rogue scripts), §12.7 (track refs in commits)
