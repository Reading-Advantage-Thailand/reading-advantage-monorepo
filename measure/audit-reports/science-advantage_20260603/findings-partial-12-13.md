# Findings — Sections 12 + 13

> **App:** `apps/science-advantage/`
> **Audit date:** 2026-06-03
> **Scope:** §12 Monorepo Hygiene (F-1201..F-1207) and §13 Workflow & Tooling (F-1301..F-1306)
> **Companion artifact:** `checklist-partial-12-13.md`
> **Severity scheme:** Critical | High | Medium | Low (per `measure/agents-md-audit-protocol.md`)

---

## Summary table

| ID | Rule | Severity | Status | One-line |
|----|------|----------|--------|----------|
| F-1201 | 12.1 | **Medium** | Open | 51/57 deps are `^`-ranged; only 6 are pinned exactly. |
| F-1202 | 12.2 | Low | Open | 2 stray `.log` files at app root (`gemini_design_update.log`, `visual_refresh_track.log`) are untracked but should be in `.gitignore`. |
| F-1203 | 12.3 | Low | Open | Build passes **only** because `next.config.ts` has `ignoreBuildErrors: true` masking ~370 type errors. |
| F-1204 | 12.4 | **High** | Open | `pnpm turbo run lint --filter=science-advantage` exits 1 (4 `react-hooks/immutability` errors + 6 unused-vars warnings). |
| F-1205 | 12.5 | **High** | Open | `pnpm turbo run check-types` skips the app (no `check-types` script in `package.json`); direct `tsc --noEmit` shows ~370 errors. |
| F-1206 | 12.6 | — | — | PASS — 50/50 conventional. No finding. |
| F-1207 | 12.7 | **Medium** | Open | 7/50 commits reference a track ID (all in body, 0/50 in subject). |
| F-1301 | 13.1 | **Medium** | Open | 3 of the 5 largest refactors (>400 lines) shipped without any track reference. |
| F-1302 | 13.2 | — | — | PASS — tech-debt.md = 39 lines, science-advantage findings tracked. |
| F-1303 | 13.3 | — | — | PASS — lessons-learned.md = 49 lines, science-advantage lessons recorded. |
| F-1304 | 13.4 | — | — | PASS — `package.json#name` = `science-advantage`. |
| F-1305 | 13.5 | Low | Open | 5 orphan in-code `TODO` comments in non-test source files. |
| F-1306 | 13.6 | **Medium** | Open | App-local CI workflow references `NEXTAUTH_URL` / `NEXTAUTH_SECRET` (also uses `npm` + `package-lock.json` and runs only `lint`/`build`, no `test`); not in `.env.example`. |

> **Severity counts:** 2 High, 5 Medium, 3 Low, 0 Critical. 3 rules are PASS (no finding).

---

## Section 12 findings

### F-1201: 51/57 deps are `^`-ranged; only 6 are pinned
- **Rule:** 12.1 (Pinned versions in `package.json` and `pnpm-lock.yaml` are committed)
- **Severity:** Medium
- **Evidence:**
  - `apps/science-advantage/package.json` L22–96 — every dependency except 6 uses `^` (caret). The 6 pinned entries are `next@16.0.0` (L61), `react@19.2.0` (L63), `react-dom@19.2.0` (L64), `eslint-config-next@16.0.0` (L90), `@types/react@19.2.2` (L84), `@types/react-dom@19.2.2` (L85).
  - `pnpm-lock.yaml` IS committed at the monorepo root, so install-time resolution is reproducible. The `package.json` itself drifts in floating ranges.
  - No `package-lock.json` is committed at the app root (confirmed absent), and no other rogue lockfiles.
- **Impact:** AGENTS.md §Version Policy says "Use current stable versions **pinned** in `package.json`". A `^` range permits any 0.x.y→0.x.z patch (and 0.x→0.y minor) to install, which contradicts the "pinned" wording. Practically, pnpm-lock.yaml is the source of truth at install time, so the practical risk is low for this app's own builds; the risk is for downstream consumers reading the published version range. None of the unpinned ranges here cross a major bump today (e.g. `@ai-sdk/*` are 2.x and `drizzle-orm` 0.44.x is approaching 1.0), so this is Medium rather than High.
- **Suggested fix track:** `science-advantage_pinned_deps_20260603` — short (~3-task) hygiene track: (1) decide a pnpm `save-exact` policy in `.npmrc`; (2) re-pin transitive `^` ranges by hand or `pnpm dedupe --check`; (3) verify `pnpm install --frozen-lockfile` still resolves.

### F-1202: Stray `.log` files at app root not in `.gitignore`
- **Rule:** 12.2 (No uncommitted local scripts; housekeeping of stray files)
- **Severity:** Low
- **Evidence:**
  - `ls apps/science-advantage/ | grep -E '\.log$'` returns `gemini_design_update.log` (3,885 bytes, 2026-04-25) and `visual_refresh_track.log` (not shown in this run but listed in inventory).
  - `git ls-files apps/science-advantage/ | rg 'log$'` returns **no hits** — files are untracked. They will not pollute the repo unless a developer accidentally `git add .` from the app root.
  - `apps/science-advantage/.gitignore` has `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`, `pnpm-debug.log*` but **no generic `*.log`** pattern.
  - `tsconfig.tsbuildinfo` (493,843 bytes) and `tsconfig.pilot.tsbuildinfo` (244,713 bytes) are visible at the app root but ARE gitignored by `*.tsbuildinfo` and the explicit `tsconfig.tsbuildinfo` lines (L30–31).
- **Impact:** Cosmetic. Clutter from manual QA / track artifacts. No committed secrets in those files (sampled the gemini log; it's a Gemini design iteration transcript, no `password|secret|apiKey|token` hits).
- **Suggested fix track:** Batch into the same `science-advantage_housekeeping_20260603` Low-priority track. Add `*.log` to `.gitignore` and `git clean -f` the existing untracked log files. Or `git rm --cached` if they get accidentally added.

### F-1203: Build "passes" only because `ignoreBuildErrors: true` masks ~370 tsc errors
- **Rule:** 12.3 (Build passes) — partial; the literal check passes but the underlying type-safety guarantee is voided
- **Severity:** Low (informational; F-1205 carries the real severity)
- **Evidence:**
  - `pnpm turbo run build --filter=science-advantage` → 9/9 successful, 4m4s.
  - `apps/science-advantage/next.config.ts` L459: `ignoreBuildErrors: true,` with a comment enumerating the real blockers: ~354 testing-library matcher narrowing in `*.test.tsx`, 2 INTERN role widening in `lib/auth/session.ts`, 2 missing-sibling-module errors in `lib/auth/{password,rate-limit}.test.ts`, 3 ProcessEnv narrowing, 4 next@16 duplicate-instance type identities, 4 misc.
- **Impact:** The build status alone is a false-positive green light — a maintainer who relies on `turbo run build` to verify correctness will be misled.
- **Suggested fix track:** `auth_strategy_review` (already in `tech-debt.md` 2026-05-03). This finding is **DEFERRED**; the audit is restating it for completeness but the work item exists.

### F-1204: `pnpm turbo run lint --filter=science-advantage` exits 1
- **Rule:** 12.4 (Lint passes)
- **Severity:** High
- **Evidence:**
  - `pnpm turbo run lint --filter=science-advantage` — `ELIFECYCLE Command failed`, exit 1.
  - `4 errors, 6 warnings` from the tail:
    - `components/features/teacher/analytics/student-lesson-detail-analytics.tsx:151` — `react-hooks/immutability`: `fetchAnalytics` accessed before it is declared.
    - Same file L155 + L186 — same rule, two more occurrences in the same function.
    - `lib/gamification/badges.ts:114` and `:202` — `@typescript-eslint/no-unused-vars` warnings on `_userId`, `_triggerEvent` parameters (2 each → 4 warnings).
  - 4 errors + 6 warnings is a regression-or-untouched state — the 4 errors are the pre-existing `auth_strategy_review` blockers; the 6 warnings appear to be new (or previously off the count).
- **Impact:** CI gate fails for this app. Any change in `apps/science-advantage/` that the monorepo root `ci.yml` (which runs `pnpm lint`) covers will block the PR.
- **Suggested fix track:** `auth_strategy_review` (existing, 2026-05-03 in `tech-debt.md`). Lint-fix sub-task: lift the `fetchAnalytics` `useCallback` / `useMemo` / function declaration above the `useEffect`; silence `_userId` / `_triggerEvent` via TS-ignore (or remove the unused params) in `lib/gamification/badges.ts`.

### F-1205: `pnpm turbo run check-types` skips the app entirely; ~370 tsc errors when run directly
- **Rule:** 12.5 (Type-check passes)
- **Severity:** High
- **Evidence:**
  - `apps/science-advantage/package.json` scripts (L6–L20): no `check-types` / `typecheck` / `type-check` script. Only `dev`, `build`, `start`, `lint`, `format`, `test`, `test:watch`, `test:integration`, `test:e2e`, `seed`, `seed:demo-users`, `dev:interventions`, `optimize:images`.
  - `turbo.json` L26–28 defines a workspace-level `check-types` task that depends on `^check-types`, so `pnpm turbo run check-types --filter=science-advantage` resolves to the workspace-deps' `check-types` (db, types, auth-client, auth, domain, api) and **silently skips** the app. Confirmed by the `2m31.681s` run output, which logs only package names prefixed `@reading-advantage/`, not `science-advantage`.
  - `cd apps/science-advantage && npx tsc --noEmit` (no `build` filter) shows the real error list, sampled below:
    - `components/features/teacher/intervention-alerts-widget.test.tsx` L352/372/376/406/410/411 — 6× `toBeInTheDocument` / `toHaveAttribute` matcher narrowing.
    - `lib/auth/password.test.ts:2` and `lib/auth/rate-limit.test.ts:4` — 2× "Cannot find module './password'" / "'./rate-limit'".
    - `lib/auth/session.ts:40,79` — 2× `INTERN` role not assignable to `UserRole` (tech-debt row calls this out as 2 errors).
    - `lib/test/resolve-test-database-url.ts:13`, `vitest.integration.global-setup.ts:18`, `vitest.integration.setup.ts:14` — 3× `Type 'ProcessEnv' has no properties in common with type {...}'`.
    - `lib/gamification/xp.test.ts:124` — 1× "comparison appears to be unintentional because the types '2' and '1' have no overlap".
    - `tests/lib/display-preference.test.tsx` — 9× `toHaveTextContent` matcher narrowing.
  - `next.config.ts:459` — `ignoreBuildErrors: true` masks all of this at build time.
- **Impact:** The monorepo `ci.yml` runs `pnpm test` (not `pnpm check-types`) and the app's own `.github/workflows/ci.yml` runs only `npm run lint` + `npm run build` — neither runs `tsc` against the app. So ~370 type errors can accumulate without any CI gate. This is exactly the failure mode §10.7 is supposed to prevent.
- **Suggested fix track:** Same `auth_strategy_review` track. Two concrete steps: (1) add `"check-types": "tsc --noEmit"` to `apps/science-advantage/package.json`; (2) once the 4 known root causes are fixed (testing-library matcher types in `vitest.unit.setup.ts`; INTERN role audit; re-import paths in `lib/auth/*.test.ts`; process-env narrowing), flip `ignoreBuildErrors: false` in `next.config.ts`.

### F-1206: 50/50 commits follow Conventional Commits
- **Rule:** 12.6
- **Severity:** — (PASS; no finding)
- **Evidence:** Per `checklist-partial-12-13.md` §12.6. Subject prefix regex `^(feat|fix|chore|docs|refactor|test|perf|build|ci|style)\([^)]+\)!?:` matches all 50/50 commits in `git log -50 -- apps/science-advantage/`. Breakdown: `chore` 25, `refactor` 24, `test` 4, `fix` 4, `feat` 3 (in the most recent 50, all dominated by the Prisma→Drizzle migration). No drive-by format violations.
- **Impact:** None — this is a positive observation.
- **Suggested fix track:** None. The next audit (post-Track 4 slice cleanup) should re-verify 50/50.

### F-1207: 7/50 commits reference a track ID (all in body, 0/50 in subject)
- **Rule:** 12.7 (Tracks used to land non-trivial changes are referenced in commit messages)
- **Severity:** Medium
- **Evidence:**
  - Sample: `git log --oneline -50 -- apps/science-advantage/`, then `git log -1 --format=%B <sha>` for each, regex `_20260[5-6]\d\d`.
  - Commits with body track ref: `3705f2b` (chore(measure) — references `prisma_drizzle_science_controllers_20260505`), `8b2f30e` + `a3752f5` (`proxy_admin_guard_hardening_20260526` — Phase 2/3), `701e942` (`connection_pooling`), `76227c8` + `fa86cfe` + `ca51372` (test deletions — body cites `prisma_drizzle_science_controllers_20260505`). Total 7/50.
  - 0/50 track IDs in the subject line.
  - 43/50 commits have no track link in subject or body. Most of these are 24 `refactor(science):` ports under `prisma_drizzle_science_controllers_20260505` that completed in 2026-05-23 but never link to the track.
  - Broader track-name regex (allowing known track names like `prisma_drizzle_science_controllers_20260505`, `proxy_admin_guard_hardening_20260526`, `connection_pooling`, `science_test_infra_drizzle_migration_20260523`, `review_remediation`) on the same 50: still 7/50 — the body-ref count matches the pattern-ref count.
- **Impact:** `measure/tracks.md` and the per-track `plan.md` cannot be cross-referenced from `git log --grep <track-id>`. This makes post-hoc auditing of "did this track land everything in plan.md?" slow. The pilot-style quality of the recent 50 commits is fine — the missing-ref commits are largely a one-time gap from the now-archived Prisma→Drizzle migration.
- **Suggested fix track:** Batch into a `commit_hygiene_backfill_20260603` Low-priority track. Add the missing track IDs as `git notes` (preserves history) to the 24 `refactor(science):` ports under the archived Prisma→Drizzle track. Going forward, add a `commitlint` config (e.g. `cz-conventional-changelog`) to enforce subject-line track reference for non-chore commits.

---

## Section 13 findings

### F-1301: 3 of 5 largest refactors ship without any track reference
- **Rule:** 13.1 (Significant changes reference a Measure track in `measure/tracks/`)
- **Severity:** Medium
- **Evidence:**
  - Sampled 5 largest diffs from `git log --oneline --stat -100 -- apps/science-advantage/`:
    | # | SHA | Subject | Insertions/Deletions | Track ref in body? |
    |---|-----|---------|----------------------|---------------------|
    | 1 | `3705f2b` | chore(measure): Stage archive deletions and pending work | 3327+ / 1– | yes — `prisma_drizzle_science_controllers_20260505` |
    | 2 | `52881df` | chore(science): delete prisma/schema.prisma and prisma/migrations/ | 0 / 829 | **no** |
    | 3 | `ba5be9f` | chore(science): delete stale Prisma-mock tests | 0 / 437 | **no** |
    | 4 | `09a22d3` | refactor(science): port seed-functions/seed-activity-data to Drizzle | 440+ / 322– | **no** |
    | 5 | `ca51372` | test(science): delete stale auth/login route.integration.test.ts | 0 / 377 | yes — `prisma_drizzle_science_controllers_20260505` |
  - All three no-track commits belong to the same parent track (`prisma_drizzle_science_controllers_20260505`), but the commits themselves do not link. The AGENTS.md §Measure Workflow says "Never start significant work without an active track" — the 829-line deletion in `52881df` and the 440-line port in `09a22d3` each exceed the 1-day threshold and should link to a track.
- **Impact:** `git log --grep` cannot surface the work done under a track; the per-track `plan.md` is decoupled from the commit graph.
- **Suggested fix track:** Same `commit_hygiene_backfill_20260603` as F-1207. Going forward, enforce "every `feat:`, `fix:`, `refactor:`, or `test:` commit with >100 lines links a track" via commitlint.

### F-1302: `measure/tech-debt.md` ≤ 50 lines
- **Rule:** 13.2
- **Severity:** — (PASS; no finding)
- **Evidence:** `wc -l measure/tech-debt.md` = 39. Science-advantage findings ARE tracked: row `auth_strategy_review` (2026-05-03, L19) covers §12.3/12.4/12.5; row `audit_20260526` (L38) covers the §2.5 27-route bypass; row `science-advantage-ui` (2026-05-25, L35) covers the `/assignments` stub.
- **Suggested fix track:** None.

### F-1303: `measure/lessons-learned.md` ≤ 50 lines
- **Rule:** 13.3
- **Severity:** — (PASS; no finding)
- **Evidence:** `wc -l measure/lessons-learned.md` = 49. Science-advantage lessons ARE recorded: 13 entries tagged `prisma_drizzle_science_controllers` (L37, 40, 42–47) covering M:N junctions, client-bundle leaks, postgres-js error shapes, `requireAuth` redirect semantics, move-don't-copy discipline, drizzle-zod constraints, re-evaluating tech-debt blockers. Plus `science_test_infra_drizzle` (L41).
- **Suggested fix track:** None. File is exactly at the cap (49); any new science-advantage lessons should either replace older ones or trim a less-instructive entry.

### F-1304: `package.json` name
- **Rule:** 13.4
- **Severity:** — (PASS; no finding)
- **Evidence:** L2: `"name": "science-advantage"`. Matches `apps/<app>/package.json#name` per protocol §13.4.
- **Suggested fix track:** None.

### F-1305: 5 orphan in-code `TODO` comments in non-test source files
- **Rule:** 13.5 (No `TODO`/`FIXME`/`XXX` comments without a tracking issue or tech-debt row)
- **Severity:** Low
- **Evidence:** `rg 'TODO|FIXME|XXX' apps/science-advantage/ -g '!node_modules' -g '!*.test.*' -g '!__tests__/**'` returns 8 matches; 5 are in-code TODO comments in non-test source files (the other 3 are in `TODO.md` header, sprint docs, and `lessons-learned.md` prose, which are not in-code TODOs):
  | File:Line | TODO | Tracking |
  |-----------|------|----------|
  | `lib/gamification/badges.ts:115` | `// TODO: Requires language preference tracking — not yet implemented` | **none** |
  | `app/api/lessons/[lessonSlug]/route.ts:125` | `slug: lesson.id, // TODO: Replace with dedicated slug when available` | **none** |
  | `app/api/lessons/[lessonSlug]/route.ts:144` | `descriptionThai: standard.description, // TODO: Provide Thai translation when available` | **none** |
  | `app/api/classes/[classId]/curriculum/route.ts:135` | `titleThai: unit.title, // TODO: Thai translations when schema supports it` | **none** |
  | `app/api/classes/[classId]/curriculum/route.ts:142` | `slug: lesson.id, // TODO: Use slug field when schema supports it` | **none** |
  - Cross-references checked: `measure/tech-debt.md` (none match the language-preference / slug / Thai-translation themes — the i18n row 2026-05-02 is generic "no shared i18n types", not these specific code TODOs), `measure/tracks.md`, `apps/science-advantage/TODO.md` (only Sprint 3/4 GH-issue items, not these 5 in-code TODOs).
  - The 4 "slug"/"Thai translation" TODOs are thematically related (i18n + lesson slug schema) and likely belong to a single missing track — but no such track exists in `measure/tracks/`.
- **Impact:** Each orphan TODO is a future contributor's untracked "I wonder if this is still needed?" — they decay into noise. Low priority because the app ships without depending on them.
- **Suggested fix track:** Batch into `science-advantage_todo_backfill_20260603` Low-priority track. Two options per TODO: (a) file a GH issue and reference it in the comment (`// TODO(#XXX): ...`); (b) if the work is on the i18n roadmap, add a `measure/tracks/i18n_backfill_*/plan.md` entry and reference it.

### F-1306: App-local CI workflow uses `npm` + `package-lock.json` (neither committed at app root), lacks `test` step, and references env vars (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`) not in `.env.example`
- **Rule:** 13.6 (Secrets are not committed; CI configuration follows monorepo norms)
- **Severity:** Medium
- **Evidence:**
  - `apps/science-advantage/.github/workflows/ci.yml` (per inventory, lines 608–635 in `00-inventory.md`):
    - L631: `cache-dependency-path: package-lock.json` — references a file that does NOT exist at the app root (confirmed: `ls apps/science-advantage/package-lock.json` → "No such file or directory"). The monorepo uses `pnpm` and `pnpm-lock.yaml` at the root, not `package-lock.json` per app.
    - L632: `npm ci` — installs with `npm`, but the app has no `package-lock.json` so this would fail or produce a phantom lockfile.
    - L633–L634: runs only `npm run lint` + `npm run build`. No `npm run test` step.
    - L623–L624: env vars `NEXTAUTH_URL: http://localhost:3000` and `NEXTAUTH_SECRET: ci-secret`. Neither appears in `apps/science-advantage/.env.example` (which lists 21 vars: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `AI_RECOMMENDER_*`, `AI_IMAGE_*`, `GOOGLE_CLOUD_*`, `NODE_ENV`, `DEV_AUTH_ENABLED`, `NEXT_PUBLIC_*`).
  - `apps/science-advantage/.env.example` — 49 lines, no NextAuth references. The app is now on `@reading-advantage/auth` (per inventory) and does not need NextAuth.
  - The monorepo-root `.github/workflows/ci.yml` covers `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build`, `pnpm test` (no path filter, runs for the whole monorepo including science-advantage) — but it is generic and does not have a `science-advantage` token.
- **Impact:** The app-local CI workflow is dead/drifted — it can't be triggered as-written because (a) it references a non-existent `package-lock.json`; (b) it uses `npm` in a pnpm monorepo; (c) it omits the `test` step (so even when it does run, regressions in test suite are not caught); (d) it references NextAuth vars that no longer exist in this app (drift from the 2026-05-26 auth migration). The monorepo root CI covers the app, so the local workflow is redundant AND broken.
- **Suggested fix track:** `science-advantage_ci_alignment_20260603` Medium track. Three tasks: (1) delete `apps/science-advantage/.github/workflows/ci.yml` (or convert it to a path-filtered `turbo run {build,lint,test,check-types} --filter=science-advantage` job that delegates to the monorepo root pipeline); (2) update `.env.example` if any removed NextAuth vars should be archived for posterity, or just remove them; (3) verify the monorepo-root CI has a path filter for `apps/science-advantage/**` so it picks up science-advantage-only changes.

---

## Severity roll-up

| Severity | Count | Findings |
|----------|-------|----------|
| Critical | 0 | — |
| High | 2 | F-1204, F-1205 |
| Medium | 5 | F-1201, F-1207, F-1301, F-1306 (+ F-1203 partial) |
| Low | 3 | F-1202, F-1205's housekeeping, F-1305 |

> **Already tracked in `measure/tech-debt.md`:** F-1203, F-1204, F-1205 (and the §2.5/§3 audit-20260526 27-route bypass) are all under row `auth_strategy_review` (2026-05-03) and `audit_20260526` (2026-05-26). The new audit restates them with fresh evidence but does not create net-new Critical/High rows.
> **Recommended net-new tech-debt rows:** none at the Critical/High tier. The F-1204 / F-1205 High findings are already in the existing `auth_strategy_review` row; the F-1207 / F-1301 / F-1306 Medium findings can be batched into a single new row `science-advantage_audit_20260603_ci_and_commits` for visibility.
> **Recommended net-new tracks:** `commit_hygiene_backfill_20260603` (covers F-1207 + F-1301; ≤ 5 plan tasks), `science-advantage_ci_alignment_20260603` (covers F-1306; ≤ 4 plan tasks), `science-advantage_todo_backfill_20260603` (covers F-1305; ≤ 3 plan tasks). F-1201, F-1202, F-1203, F-1204, F-1205 are absorbed into the existing `auth_strategy_review` track and the ongoing `prisma_drizzle_slice_cleanup_20260505` work.
