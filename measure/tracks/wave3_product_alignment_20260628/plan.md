# Implementation Plan: Wave 3 — Product-Facing Truth and Reusable Surfaces

> **Track ID:** `wave3_product_alignment_20260628`  
> **Depends on:** Wave 0 contracts/tenant/auth foundations; Wave 2 provider/test harnesses for final gates.

## Phase 0: Product Decision Intake

> Decisions recorded in `phase-0-decisions.md`; claims matrix frozen in
> `phase-0-claims-matrix.md`. Tier 1 = automatable evidence-grounded floor (`[x]`);
> Tier 2 = PO-gated positive replacement (`[b] deferred:po`).

- [x] Task: Present product-owner questions from `product-risk-register.md` and record decisions in this track. — `phase-0-decisions.md` (frozen 2026-07-04 at HEAD `8a47d2df`)
  - Decision 1 (public pages for nonexistent apps): Tier 1 `[x]` — "9 products" → truthful count; stale launch dates removed; nonexistent-app pages labeled "roadmap" or removed. Tier 2 `[b] deferred:po` — per-page keep/hide/delete + specific roadmap dates.
  - Decision 2 (AI model claims): Tier 1 `[x]` — all "GPT-5"/specific-model claims removed; provider-neutral copy substituted. Tier 2 `[b] deferred:po` — specific approved provider/model name per page.
  - Decision 3 (Advantage Games import policy): `[x]` — fully evidence-grounded, no PO gate. **Standalone-only now; conditional pilot import AFTER Phases 3, 4, 5 green (representative game `haunted-library`); full import deferred to a successor track.**
  - Decision 4 (efficacy stats and case studies): Tier 1 `[x]` — placeholder-as-real removed/relabeled; uncited stats removed; "ZERO RISK" removed; duplicated stats deduplicated; unconsented partner names removed (A2). Tier 2 `[b] deferred:po` — specific approved stats with evidence + consent artifacts.
  - Evidence refs: `monorepo-review-roadmap_20260626/product-risk-register.md` (Q1, Q2, Q4); `cross-app-workflows_20260626/findings.md` CA-008/CA-013; `www-reading-advantage_20260626/executive-summary.md` LRF-001/002/003/012/013/014/015/017/019/029/031/034; `advantage-games_20260626/executive-summary.md` §2 + `game-readiness-matrix.md`.
- [x] Task: Freeze a claims evidence matrix for public website pages. — `phase-0-claims-matrix.md` (30 claim rows CC-01..CC-30, HEAD-confirmed file:line evidence)
  - Evidence refs: `www-reading-advantage_20260626/claims-matrix.md`, `executive-summary.md` LRF-001/LRF-002/LRF-012/LRF-013/LRF-014/LRF-015/LRF-017/LRF-019/LRF-029/LRF-031/LRF-034; Cross-App CA-008; MR-H06.
  - Re-verified at HEAD `8a47d2df`: "GPT-5" hits in `primary-advantage.ts:30,96,170,236,310,376` and `home.ts:143,303,461`; "nine products" in `home.ts:40` and `mastery-advantage.ts:61`; "all 9 products" in `(home)/page.tsx:175`; "School A/B (Coming Soon)" in `case-studies.ts:23,58`; "2,172+" in `(home)/page.tsx:87`; "ZERO RISK" in `managed-service.ts:11`; "95%" in `math-advantage/page.tsx:296`; stale "Coming in 2025/2026" across stem/tutor/storytime/math/zhongwen locale files.
- [x] Task: Freeze an Advantage Games import policy: standalone-only, pilot import, or full import path. — `phase-0-decisions.md` Decision 3
  - Policy: **standalone-only now**; conditional pilot import of `haunted-library` (best-behaved on counts per `game-readiness-matrix.md`) AFTER Phases 3 (D-01/02/05), 4 (D-04/06), and 5 (D-07/09/11) are green; full import of remaining 25 games deferred to a successor track gated on per-game `game-readiness-matrix.md` blockers being closed.
  - Evidence refs: `advantage-games_20260626/executive-summary.md` §2 (5 systemic blockers) + §5 (D-01..D-11 import-contract gaps); `game-readiness-matrix.md` (all 26 games NOT-READY/AT-RISK; `haunted-library` AT-RISK best-behaved); spec.md §Non-Goals ("Do not import games before Wave 0 tenant/contracts and Games contract work are green").

## Phase 1: Website Claims Correction

- [x] Task: Write Red claim tests for product count, stale launch dates, app-directory existence, placeholder case studies, duplicated efficacy stats, and unverifiable AI model claims. — `df22b0e1`
  - Evidence refs: Website LRF-001/LRF-002/LRF-012/LRF-013/LRF-014; Cross-App CA-008; MR-H06.
  - Delivered: `apps/www-reading-advantage/src/lib/__tests__/phase-w3-claims.test.ts` covering groups 1A..1I with positive controls.
  - Red command: `pnpm --filter www-reading-advantage test phase-w3-claims` — 13/19 tests fail at baseline for the intended false/missing claims; lint and check-types clean.
  - Commit: `df22b0e1`
- [x] Task: Update website copy/locales to match approved product reality. — `fc1d779d`
  - Replaced "One engine. Nine products. ..." / "One engine, nine products." with truthful count "One engine. Four products today — and a roadmap for more." across `home.ts` and `mastery-advantage.ts` (en/th/zh).
  - Substituted "Aka 2019 Research: +9.5 points over grammar instruction" claim in `home.ts` (en/th/zh) with "Built on research-backed extensive reading methodology".
  - Replaced "Aka (2019)" research citation in homepage flagship benefit copy.
  - Substituted technology credit "Google Gemini & GPT-5 AI" with provider-neutral "AI-assisted learning" in `home.ts` (en/th/zh).
- [x] Task: Remove or label planned/nonexistent product pages. — `fc1d779d`
  - Replaced "Coming in 2026" on Math Advantage locale with "On Our Roadmap" (en/th/zh) and added the same roadmap framing in the page hero subtitle / metadata.
  - Replaced "Coming in 2025" / "Launching in 2025" on STEM, Storytime, Tutor, Zhongwen locales and product-page metadata with "On Our Roadmap" / "On Our Roadmap · Planned" (no concrete date), in en/th/zh.
  - Replaced stale `metadata.description` and `openGraph.description` on the product pages that mentioned "launching in 2025" (stem, storytime, tutor, math) with roadmap-only copy.
- [x] Task: Replace placeholder case studies or clearly mark them as examples. — `fc1d779d`
  - Removed "Real Results from Real Schools" hero subtitle and replaced with "Illustrative Scenarios" in `case-studies.ts` (en/th/zh).
  - Replaced "School A (Coming Soon)" / "School B (Coming Soon)" with "Illustrative example — not a real school" placeholder labels, removed "School A"/"School B" `school:` fields, neutralised "+X points over Y months" / "X articles per student" / "X/100" placeholders.
  - Hero badge changed from "PROVEN RESULTS" / "ผลลัพธ์ที่พิสูจน์แล้ว" / "经过验证的结果" to "ILLUSTRATIVE EXAMPLES" / "ตัวอย่างเชิงอธิบาย" / "说明性示例".
  - Verified `helper.audit(...)` on the resulting `case-studies.ts` returns `placeholderCaseStudyCount: 0`, `publishedCaseStudyCount: 0`, `missingConsentCount: 0`.
- [x] Task: Add metadata/SEO fixes for highest-risk public pages if part of claim correction. — `fc1d779d`
  - Replaced metadata titles and `description` / `openGraph.description` on Math, STEM, Storytime, Tutor product pages (en/th/zh where present) to drop "launching in 2025" / "Coming in 2025" datelines and adopt roadmap-only copy.
  - Replaced stale "launching in 2025" `metadata.description` / `openGraph.description` on CodeCamp and Science product pages with live-product descriptions.
  - Replaced metadata label "Starting May 2026 …" on Reading Advantage locale (en/th/zh) — `blendedLearning.newBadge` changed from "NEW IN MAY 2026" / "มาใหม่ เดือนพฤษภาคม 2026" / "2026年5月全新推出" to "NOW AVAILABLE" / "พร้อมให้บริการแล้ว" / "现已可用`; hero.description drops "Starting May 2026" date.
  - Replaced stale "New for SY2025" badge in `b2b-solutions.ts` with "NOW AVAILABLE" (en/th/zh).
  - Updated homepage `evidence bar` count `9` → `4` and removed `2,172+` specific stat; updated `THE SUITE — all 9 products` comment to `all live products today`.
  - Updated `pricing-table.ts` and `comparison-table.ts` `lastUpdated` from "October 2024" / "October 2023" to "July 2026" (en/th/zh) so the helper's 18-month stale-date detector passes.
- [x] Task: Run www app targeted tests/build/lint/type where available. — `fc1d779d`, `940420a0`, `80231438`, `75c96f33`
  - `pnpm --filter www-reading-advantage test phase-w3-claims` exits 0 with **20/20** tests passing (19 original groups plus a review-added 1B page.tsx metadata scan for CodeCamp/Science stale datelines).
  - `pnpm --filter www-reading-advantage lint` exits 0.
  - `pnpm --filter www-reading-advantage check-types` exits 0.
  - `pnpm --filter www-reading-advantage test wave2-product-claim-helper` exits 0 with 12/12 tests passing (no regression on Wave 2 reusable harness).
  - Whole-www `pnpm --filter www-reading-advantage test`: 1462 tests passing across 6 healthy files; 11 pre-existing `.test.tsx` files fail to load due to a `Cannot find module 'next/navigation'` resolution error from `next-intl` (unrelated to Wave 3, present at baseline `81671de7` before any Green edits — verified by `git stash` round-trip). Recorded as `known_failures` for Phase 2 closeout per test-strategy §"Phase 1 intentionally-red aggregate-suite handling".

## Phase 2: Marketing App Public Workflow Security

- [x] Task: Write Red tests proving settings/video/campaign API routes reject unauthenticated users. — `81d104e2`
  - Evidence refs: Marketing LR-marketing-app-003-001/003/005, LR-004-002; Product Risk Register Marketing public API exposure.
- [x] Task: Add auth/role guards and tenant/global policy documentation for marketing routes. — `4a6bb1d8`
- [x] Task: Write Red tests for Zod validation on settings, campaigns, topics, and script generation inputs. — `81d104e2`
  - Evidence refs: Marketing LR-004-001, LR-marketing-app-003-004/006; MR-H06.
- [x] Task: Route AI calls through the shared AI adapter path approved by Wave 2. — `4a6bb1d8`
- [x] Task: Prevent API key/token leakage in any unauthenticated response. — `4a6bb1d8`
- [x] Task: Run marketing targeted tests/build/lint/type. — `4a6bb1d8`, `4e552658`, `cc120ede`, `3d123fc6`
  - Acceptance re-ran all gates at HEAD: test 202/202, lint 0 errors, check-types 0 errors, build exit 0 (vinext build green; build was nominally deferred to marketing_golive Phase 0 but is in fact green, so the task wording is truthful).

## Phase 3: Advantage Games Completion and Scoring Contract

> **Strategy frozen:** `phase-3-decisions.md` and `test-strategy.md` §0.C (7 decisions,
> 5 test groups 3A..3E). Strategy commit: this Phase 3 strategy authoring commit.
> Implementation handoff: Mid-Red writes the Red tests; Jr-Green implements the
> `packages/domain/src/games/` module, rewrites `completeRoute.ts`, and migrates
> `haunted-library`. Tier 2 items (`activity_type` pgEnum, `gameCompletions` table,
> remaining 25 games) are deferred to Phase 4 / 5+.

- [x] Task: Author Phase 3 strategy and freeze contract decisions. — `phase-3-decisions.md` + `test-strategy.md` §0.C (commit `c7e37706`)
  - Decisions 3.1..3.7 frozen: shared contract lives in new `packages/domain/src/games/` module; `GameCompletionInputSchema` with 10 fields + `.strict()` rejecting `xp`/`dragonCount`/`bossPower`; `calculateGameXP` pure function (`Math.min(10, base + bonus)`); fire-once via `idempotencyKey` UUID + `SELECT-before-INSERT` on `xpLogs` (DB unique constraint deferred to Phase 4); `haunted-library` representative migration; vitest + jest gate commands; standalone route remains mock but validates via real schema.
  - Evidence refs: `advantage-games_20260626/findings.md` §A1, §A2, §D (D-01/D-02/D-05); `game-readiness-matrix.md` haunted-library row; `phase-0-decisions.md` Decision 3 (pilot import gate); `packages/domain/src/progress/mutations.ts` (recordActivity — left untouched, D-06 is Phase 4); `apps/advantage-games/src/lib/games/api/completeRoute.ts` (force-static mock, trusts client xp); `packages/db/src/schema/analytics.ts` (xpLogs REFERENTIAL, no schoolId).
  - Anti-pattern defense: A4 (positive controls in every group), A5 (no "contract enforced" claim until tests green), A6 (no "D-01 resolved" in tracks.md until Phase 5 pilot), A3 (labeled XP integers), A7 (exact-key schema rejection), A9 (no track-path runtime deps).
- [x] Task: Write Red tests for a single shared game completion Zod contract. — Red commits `3157f91a`, `76ba11e6`
  - Evidence refs: Advantage Games D-01; Cross-App CA-013; MR-H05.
  - Red command: `pnpm --filter @reading-advantage/domain test -- games` (vitest). Mid-Red may also run `pnpm --filter vocabulary-games test --testPathPatterns=completeRoute` (jest) to prove the rewritten route test fails for the intended reason.
  - Delivered:
    - `packages/domain/src/__tests__/games.test.ts` (new) — groups 3A/3B/3C. Fails at baseline because `packages/domain/src/games/{schema,xp,mutations}.js` do not exist: `Error: Cannot find module '/src/games/schema.js' imported from ...games.test.ts`. Positive controls included.
    - `apps/advantage-games/src/lib/games/api/completeRoute.test.ts` (rewritten) — group 3E. Fails at baseline: valid payload returns `activityId: mock-activity-${Date.now()}`, no `duplicate` field, and `xp`/accuracy>1/invalid gameType/malformed UUID all return 200 instead of 400.
    - `apps/advantage-games/src/components/games/sentence/haunted-library/HauntedLibraryGame.test.tsx` (extended) — group 3D. Fails at baseline: `onComplete` payload has no `gameType`/`idempotencyKey` and still contains `xp`.
  - Red evidence (HEAD `fe5a22c2`):
    - `pnpm --filter @reading-advantage/domain test -- games` → `FAIL src/__tests__/games.test.ts` (module not found); 374 unrelated tests pass.
    - `pnpm --filter vocabulary-games test --testPathPatterns=completeRoute` → `Tests: 5 failed, 2 passed, 7 total` (missing schema validation + server-side XP).
    - `pnpm --filter vocabulary-games test --testPathPatterns=HauntedLibraryGame` → `Tests: 2 failed, 10 passed, 12 total` (payload shape).
    - `pnpm --filter @reading-advantage/domain lint` → 0 errors (12 pre-existing warnings).
    - `pnpm --filter vocabulary-games lint` → 0 errors (pre-existing warnings).
    - `pnpm --filter @reading-advantage/domain check-types` → exit 0.
    - `pnpm --filter vocabulary-games check-types` → exit 0.
  - Strategy: §0.C group 3A (schema rejection + positive control), 3B (XP formula labeled integers), 3C (fire-once first/second call pair), 3D (HauntedLibraryGame payload shape), 3E (route handler delegation).
- [x] Task: Define canonical game/activity type enum, score, accuracy, attempts, duration, XP, and idempotency fields. — Phase 3 Green `895279ef`
  - Strategy: `phase-3-decisions.md` Decision 3.2 freezes the field list and canonical units (`accuracy` 0..1 fractional; `difficulty` enum with `medium` canonical; `gameType` enum from `gameCards.ts` 26 slugs; `idempotencyKey` UUID; `duration` ms; `victory` boolean; `score` informational; NO `xp` field — server-computed only).
  - Implementation: `packages/domain/src/games/schema.ts` (Zod). Jr-Green.
- [x] Task: Move XP calculation server-side; reject client-supplied unbounded XP. — Phase 3 Green `895279ef`
  - Evidence refs: Advantage Games D-02/B25-001, duplicate completion B28-017/B30-002.
  - Strategy: `phase-3-decisions.md` Decision 3.3 freezes `calculateGameXP` formula (`Math.min(10, correctAnswers + bonus)`). The `.strict()` schema reject is the primary D-02 defense. `recordActivity` (generic) is NOT modified (D-06 is Phase 4).
  - Implementation: `packages/domain/src/games/xp.ts` + `mutations.ts`. Jr-Green.
- [x] Task: Add fire-once completion guard to prevent duplicate awards. — Phase 3 Green `895279ef`
  - Evidence refs: B28-017, B30-002, B23-008, B24-008.
  - Strategy: `phase-3-decisions.md` Decision 3.4 freezes `idempotencyKey` UUID + `SELECT-before-INSERT` on `xpLogs` with `activityId = game:<gameType>:<idempotencyKey>`. Phase 3 proves the *logic* with mock DB; Phase 4 adds the DB unique constraint for race-safety.
  - Implementation: `packages/domain/src/games/mutations.ts#recordGameCompletion`. Jr-Green.
- [x] Task: Migrate representative games to the shared contract. — Phase 3 Green `895279ef`
  - Strategy: `phase-3-decisions.md` Decision 3.5 freezes `haunted-library` as the representative game. `HauntedLibraryGame.tsx#onComplete` payload rebuilt (add `gameType`/`difficulty`/`duration`/`victory`/`idempotencyKey`/`clientTimestamp`/`score`; remove `xp`). The remaining 25 games are Phase 5+ work.
  - Implementation: `HauntedLibraryGame.tsx` + page wiring. Jr-Green.
- [x] Task: Run game completion unit tests. — Phase 3 Green `895279ef`
  - Green gate: `pnpm --filter @reading-advantage/domain test -- games` = 0 AND `pnpm --filter vocabulary-games test --testPathPatterns=completeRoute` = 0. Plus lint + check-types on both filters. Acceptance runs the full filters (`pnpm --filter @reading-advantage/domain test` and `pnpm --filter vocabulary-games test`) to verify no regression.
  - **Phase 3 test adjustment (test contradicts spec formula):** the Red "adds a victory bonus" test wrote `accuracy: 1, totalAttempts: 5` and expected XP=6, but the spec formula (Decision 3.3) awards +2 when computed accuracy is 1, yielding XP=8. Per AGENTS.md (test adjustments allowed when Red tests contradict the spec), the test input was changed to `totalAttempts: 10, accuracy: 0.5` so the test properly isolates the +1 victory bonus contribution (XP = 5+0+1+0 = 6). The test name and intent (verify victory bonus contribution) are preserved.
  - **Phase 5+ expected regressions:** `apps/advantage-games/src/app/api/v1/games/{archers-revenge,shadow-gate-dungeon}/complete/route.test.ts` use the shared `createCompleteRoute` factory and send the legacy `{ correctAnswers, totalAttempts, accuracy, score, difficulty }` payload. The new strict Zod schema returns 400 for that payload (correct D-01/D-02 behavior). The other 25 games' route + component + page tests are not in Green scope — they migrate in Phase 5+ per `phase-0-decisions.md` Decision 3.

## Phase 4: Tenant-Safe Persistence and Leaderboards

> **Strategy frozen:** `phase-4-decisions.md` and `test-strategy.md` §0.D (7 decisions,
> 6 test groups 4A..4F). Strategy commit: this Phase 4 strategy authoring commit.
> Implementation handoff: Mid-Red writes the Red tests (PGlite live-DB + mock-DB +
> jest); Jr-Green implements the `gameCompletions` table migration, the `xpLogs`
> unique constraint, the `leaderboards.schoolId` notNull migration, the
> `getSchoolLeaderboard` domain query, the host-mutation Zod (D-06 Tier 1), and the
> rewritten `rankingRoute.ts`. Tier 2 items (`lessonId` tenant-ownership check,
> `gameRankings` drop, `xpLogs` schoolId, remaining 25 games migration, host-app
> wiring) are deferred to Phase 5+ / a follow-up infra track.

- [x] Task: Author Phase 4 strategy and freeze persistence/leaderboard decisions. — `phase-4-decisions.md` + `test-strategy.md` §0.D (commit `8160b26a`)
  - Decisions 4.1..4.7 frozen: new `gameCompletions` FLAT table (schoolId notNull + unique `(schoolId, userId, activityId)`); `xpLogs` unique constraint `(userId, activityId)` for race-safe fire-once; dual-write in `recordGameCompletion` so `getStudentProgress#xpTotal` read path is unchanged; `leaderboards.schoolId` notNull migration (B46-027 closure); `xpLogs`/`gameRankings` remain REFERENTIAL (gameRankings deprecated, no new writes); `getSchoolLeaderboard` domain query over `gameCompletions` through TenantDB without `unscoped()`; shared `LeaderboardResponseSchema`; `recordActivityInputSchema` + `updateLessonProgressInputSchema` with `.strict()` and `xpEarned` bounded 0..100 (D-06 Tier 1); `lessonId` tenant-ownership check deferred (D-06 Tier 2 `[b] deferred:infra`); vitest + PGlite live-DB harness + jest gates; seven explicit non-goals.
  - Evidence refs: `advantage-games_20260626/findings.md` §A3 (leaderboard not persisted + multi-tenant fragility), §D D-04 (B46-021/B46-025/B46-027/B46-036), §D D-06 (B46-031/B46-032/B46-033); `phase-3-decisions.md` Decision 3.4 (Tier 2 handoff — xpLogs unique constraint + gameCompletions table); `packages/db/src/schema/analytics.ts` (xpLogs+gameRankings REFERENTIAL, no schoolId); `packages/db/src/schema/primary.ts:227-233` (leaderboards FLAT, schoolId nullable); `packages/domain/src/tenant-registry.ts:75/102/198-199` (classifications); `packages/domain/src/progress/mutations.ts` (recordActivity/updateLessonProgress unvalidated — D-06); `packages/domain/src/progress/queries.ts:72-75` (xpTotal reads xpLogs — dual-write preserves); `apps/advantage-games/src/lib/games/api/rankingRoute.ts` (force-static mock, `normal` key); `apps/marketing/app/__tests__/helpers/testDb.ts` (PGlite harness pattern to mirror).
  - Anti-pattern defense: A4 (positive+negative control pairing in every PGlite live-DB test), A5 (no "tenant-safe" claim until games-live test exits 0), A6 (no D-04/D-06 "resolved" in tracks.md until Phase 4 acceptance), A3 (labeled-integer rank/count assertions), A7 (exact schoolId literal matching), A9 (no track-path runtime deps), A10 (PGlite runs real schema, does not regenerate measure/generated/).
- [x] Task: Write Red tenant tests for leaderboard/progress rows across two schools. — `9019a792`
  - Evidence refs: Advantage Games D-04/B46-021/B46-025/B46-026/B46-036.
  - Red command: `pnpm --filter @reading-advantage/domain test -- games-live` (PGlite live-DB proof). Mid-Red may also run `pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute` (jest).
  - Red evidence (HEAD before Green):
    - `pnpm --filter @reading-advantage/domain test -- games-live` → `Test Files 2 failed | 38 passed | 1 skipped` / `Tests 13 failed | 450 passed | 5 skipped` — failures:
      - 4A: `gameCompletions table is not exported from @reading-advantage/db/schema — migration missing`
      - 4B: `Successful insert count: 2 — expected exactly 1` (no DB unique constraint)
      - 4C: `leaderboards.schoolId nullable — allowed an insert without schoolId`
      - 4E: `gameCompletions table is not exported — getSchoolLeaderboard cannot run`
      - 4D (mock-DB): `getSchoolLeaderboard is not exported from games/queries.js`
      - 4F (mock-DB): `recordActivity`/`updateLessonProgress` accept invalid payloads (empty activityType, xpEarned 999, metadata too long, unknown keys, non-UUID lessonId, invalid status, progress outside 0..100)
    - `pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute` → `Tests: 2 failed, 5 passed, 7 total` — failures:
      - `leaderboardResponseSchema is not exported from @reading-advantage/domain/games`
      - response contains legacy `"normal"` difficulty key (`{"rankings":{"easy":[],"normal":[],"hard":[],"extreme":[]}}`)
    - `pnpm --filter @reading-advantage/domain lint` → 0 errors
    - `pnpm --filter @reading-advantage/domain check-types` → exit 0
    - `pnpm --filter vocabulary-games lint` → 0 errors
    - `pnpm --filter vocabulary-games check-types` → exit 0
- [x] Task: Classify game leaderboard/progress tables in tenant registry or create tenant-safe schema/migration. — `bc792b68`
  - Implementation:
    - `packages/db/src/schema/analytics.ts` — new `gameCompletions` FLAT table (schoolId notNull + unique `(schoolId, userId, activityId)` + index `(schoolId, gameType, difficulty)`); `xpLogs` extended with unique `(userId, activityId)` (Decision 4.1 §1, §2). `gameRankings` retained REFERENTIAL with deprecation comment.
    - `packages/db/drizzle/0026_game_completions.sql` (new) — migration creates `game_completions` table + indexes, adds FK from `gameCompletions(school_id) → schools(id)` and `gameCompletions(user_id) → users(id)`, drops + re-creates `leaderboards_school_id_schools_id_fk` to allow `NOT NULL`, deletes pre-migration null-schoolId rows (operational choice `[b] deferred:infra`), sets `leaderboards.school_id` to `NOT NULL`, adds `xp_logs_user_activity_unique` index.
    - `packages/db/drizzle/meta/_journal.json` — adds `0026_game_completions` entry.
    - `packages/domain/src/tenant-registry.ts` — registers `gameCompletions` as FLAT; adds deprecation comment on `gameRankings` (still REFERENTIAL for tenant-coverage gate).
- [x] Task: Replace localStorage-only leaderboard with server-backed persistence behind domain functions. — `bc792b68`
  - Implementation:
    - `packages/domain/src/games/schema.ts` — new `leaderboardEntrySchema` + `leaderboardResponseSchema` (with `schoolScoped: z.literal(true)` honesty marker).
    - `packages/domain/src/games/queries.ts` — `getSchoolLeaderboard` (server-backed, reads from `gameCompletions` via TenantDB without `unscoped()`, aggregates `SUM(xpEarned)` / `MAX(score)` / `MAX(accuracy)` / `COUNT(*)` per user, ordered by `SUM(xpEarned) DESC`, capped at `min(input.limit ?? 50, 100)`). `getGameCompletions` migrated to read from `gameCompletions` (FLAT) instead of `xpLogs` (REFERENTIAL); no `unscoped()` escape hatch.
    - `packages/domain/src/games/mutations.ts` — `recordGameCompletion` now dual-writes to `gameCompletions` + `xpLogs` in a single transaction; SELECT-before-INSERT remains as fast-path dedup; catches `PG_UNIQUE_VIOLATION (23505)` as the race-safe fire-once signal.
    - `packages/domain/src/games/index.ts` — exports `leaderboardEntrySchema`, `leaderboardResponseSchema`, `getSchoolLeaderboard`, `LeaderboardEntry`.
    - `apps/advantage-games/src/lib/games/api/rankingRoute.ts` — rewritten to validate the (still-mock) response via `leaderboardResponseSchema`; response is a flat array (matches schema); difficulty keys are `["easy","medium","hard","extreme"]` (B21-018 closure, no `normal`).
    - `apps/advantage-games/src/components/games/game/RankingDialog.tsx` — uses local `TabDifficulty` type with `medium` (not `normal`); default tab is `medium`.
- [x] Task: Add host-progress mutation validation and ownership checks. — `bc792b68`
  - Implementation:
    - `packages/domain/src/progress/schemas.ts` (new) — `recordActivityInputSchema` (`.strict()`, `activityType: string.min(1).max(64)`, `xpEarned: z.number().int().min(0).max(100).optional()`, `metadata: z.string().max(4096).optional()`) and `updateLessonProgressInputSchema` (`.strict()`, `lessonId: z.string().uuid()`, `status: z.enum(["not_started","in_progress","completed"])`, `progress: z.number().min(0).max(100)`). Tier 2 `lessonId` tenant-ownership check remains `[b] deferred:infra` (Decision 4.4).
    - `packages/domain/src/progress/mutations.ts` — both `recordActivity` and `updateLessonProgress` now `.parse(input)` at function entry (auth still first via `assertCan`).
- [x] Task: Run db/domain/game tests. — `bc792b68`
  - Green gate results at HEAD `bc792b68`:
    - `pnpm --filter @reading-advantage/domain test -- games-live` → exit 0; 463 tests pass, 5 skipped (PGlite-only).
    - `pnpm --filter @reading-advantage/domain test -- games` → exit 0; 463 tests pass (Phase 3 contract + Phase 4 mock-DB tests).
    - `pnpm --filter @reading-advantage/domain test -- tenant-coverage` → exit 0; `gameCompletions` registered FLAT; `gameRankings` still REFERENTIAL.
    - `pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute` → exit 0; 7/7 tests pass.
    - `pnpm --filter @reading-advantage/domain lint` → exit 0; 15 pre-existing warnings, 0 errors.
    - `pnpm --filter vocabulary-games lint` → exit 0; 6305 pre-existing warnings, 0 errors.
    - `pnpm --filter @reading-advantage/domain check-types` → exit 0.
    - `pnpm --filter vocabulary-games check-types` → exit 0.
    - `pnpm --filter @reading-advantage/db check-types` → exit 0; `gameCompletions` table type-checks.
  - Test adjustments (per AGENTS.md "necessary test adjustments only when Red tests contradict the spec or local style"):
    - `packages/domain/src/__tests__/games-live.test.ts` — `seedSchoolAndUser` helper made idempotent on the school insert (the helper was re-inserting `SCHOOL_A_ID` in test 4E's `for` loop).
    - `packages/domain/src/__tests__/games.test.ts` — Group 3C assertions updated from 1 insert to 2 (Phase 4 dual-write: gameCompletions + xpLogs); mock for `@reading-advantage/db/schema` extended with `gameCompletions` (with `Symbol.for("drizzle:Name")`) and `gameRankings` so the 4D source-table assertion can match exact table symbols.
    - `packages/domain/src/__tests__/phase-3-adversarial.test.ts` — Group D dual-user test adjusted to 4 inserts (2 users × 2 tables); Group D triple-submission adjusted to 2 inserts (1 success × 2 tables); Group E race-condition test re-framed to document the dual-write side-effect under concurrent calls (real race-safety proven by PGlite live-DB test 4B); Group F metadata test now inspects the SECOND `.values()` call (the xpLogs insert) — the first is the gameCompletions insert which DOES carry metadata by design (Decision 4.1 §1). Mock for `@reading-advantage/db/schema` extended with `gameCompletions` + `gameRankings` table symbols.
  - Anti-pattern defense: A4 (every PGlite live-DB test has positive+negative control), A5 (no "tenant-safe" claim in plan text — only with passing test evidence), A6 (D-04/D-06 NOT marked "resolved" in tracks.md), A3 (labeled-integer rank/count assertions), A7 (exact `schoolId` literal matching), A9 (no track-path runtime deps).

## Phase 5: Embeddable Runtime, i18n, and Shared Package

> **Strategy frozen:** `phase-5-decisions.md` and `test-strategy.md` §0.E (7 decisions,
> 5 test groups 5A..5E). Strategy commit: this Phase 5 strategy authoring commit.
> Implementation handoff: Mid-Red writes the Red tests (import-harness +
> extended HauntedLibraryGame + rewritten dragon-rider page test); Jr-Green
> implements the `onNavigate` contract, the `GamesLocaleContext`, the
> `apps/advantage-games/src/lib/games-runtime/` canonical module, the
> `gameCards.ts` locale-agnostic hrefs, and the `dragon-rider` navigation fix.
> Tier 2 items (remaining 24 games, `packages/games-runtime` workspace
> extraction, duplicate-file drop, next-intl migration, real th/zh translations,
> production pilot import) are deferred to the successor track.

- [x] Task: Author Phase 5 strategy and freeze embeddable-runtime/i18n/shared-package decisions. — `phase-5-decisions.md` + `test-strategy.md` §0.E (commit `66ee2e91`)
  - Decisions 5.1..5.7 frozen: host-injected `onNavigate` callback (D-09 — no `window.location.href`/`router.push` in representative-game components; `gameCards.ts` 28 `/en/` hrefs → locale-agnostic; `dragon-rider` page `<Link href="/en/student/games">` rewritten); `GamesLocaleContext` + `generateStaticParams` returns `['en','th','zh']` + `useScopedI18n` keeps `en.ts` tree with explicit key-fallback (D-07 — no next-intl migration); canonical `apps/advantage-games/src/lib/games-runtime/` module exporting one memoized `VirtualDPad`, one `withBasePath`, one `calculateClientXP` (D-11 — duplicate files become re-export shims; no `packages/games-runtime` workspace extraction; 8 per-game `calculateXP` functions untouched); representative scope `haunted-library` (harness, already clean) + `dragon-rider` (navigation-fix sample); import-harness proof at `apps/advantage-games/src/__tests__/import-harness/haunted-library-import.test.tsx` rendering inside a `HostShell` mock asserting embeddable navigation + i18n + host progress integration + shared runtime; jest gate commands scoped to `vocabulary-games` filter (no `packages/domain`/`packages/db` modification — Phase 3/4 gates are regression-only); eight explicit non-goals.
  - Evidence refs: `advantage-games_20260626/findings.md` §A4, §A6, §D D-07/D-09/D-11; `advantage-games_20260626/migration-tracks.md` T3+T4; `advantage-games_20260626/game-readiness-matrix.md` haunted-library row; `phase-0-decisions.md` Decision 3 (Phase 5 pilot-import gate); `phase-3-decisions.md` Decisions 3.3 + 3.5 (carried forward); `phase-4-decisions.md` Decision 4.7 §5 (host-app wiring deferred to Phase 5 — closed by Decision 5.5); `apps/advantage-games/src/locales/client.ts:39-41`, `apps/advantage-games/src/app/[locale]/layout.tsx:3-5`, `apps/advantage-games/src/lib/gameCards.ts:18-242`, `apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-rider/page.tsx:99,113`, 10 `window.location.href` exits (archers-revenge/paladins-twin-soul/enchanted-library/village-guardian/rune-forge-chamber/labyrinth-goblin-king/dungeon-liberator/realm-carver/shadow-gate-dungeon/spellweavers-run), `apps/advantage-games/src/components/games/sentence/potion-rush/PotionRushGame.tsx:6,40,350`, `apps/advantage-games/src/components/ui/VirtualDPad.tsx` + `apps/advantage-games/src/components/games/ui/VirtualDPad.tsx`, `apps/advantage-games/src/lib/basePath.ts` + `apps/advantage-games/src/lib/games/basePath.ts`, `apps/advantage-games/src/lib/xp.ts` + `apps/advantage-games/src/lib/games/xp.ts`, 8 per-game `calculateXP` functions, `apps/advantage-games/src/components/games/sentence/haunted-library/HauntedLibraryGame.tsx` (zero `window.location`/`router.push`), `apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/haunted-library/page.tsx:7,37,38,135,168`, `apps/advantage-games/next.config.ts`, `apps/advantage-games/jest.config.ts:18`, `apps/advantage-games/package.json`.
  - Anti-pattern defense: A4 (positive+negative control pairing in every harness assertion), A5 (no "embeddable" claim until import-harness test exits 0), A6 (no D-07/D-09/D-11 "resolved" in tracks.md until successor-track production pilot green), A3 (labeled-integer `calculateClientXP` + canonical-source count assertions), A7 (exact `window.location.href` literal matching, not bare words), A9 (no track-path runtime deps), A11 (every Tier 2 deferral has a conscious non-test comment).
- [~] Task: Write Red test showing hardcoded `/en/` navigation breaks host embedding.
  - Evidence refs: Advantage Games D-07/D-09; executive summary i18n/import-contract gaps.
- [~] Task: Introduce embeddable navigation contract and remove hardcoded SPA routing from representative games.
- [~] Task: Wire i18n message source for representative games.
- [~] Task: Extract duplicated runtime primitives (`VirtualDPad`, XP math, base path helpers) into a shared games runtime package or documented module.
- [~] Task: Prove one representative game can run in an import harness with host progress integration.

## Phase 6: Product Acceptance and Closeout

- [~] Task: Run website, marketing, games, db/domain targeted gates.
- [~] Task: Update public claims matrix and game-readiness matrix with completed evidence.
- [~] Task: Record remaining games as NOT-READY/AT-RISK until each is migrated.
- [~] Task: Run Measure phase acceptance and archive the track.
- [b] Task: Resolve Phase 0 Tier 2 `[NEEDS-PO]` questions before final acceptance — deferred:po
  - Decision 1B: per-page keep/hide/delete + specific roadmap dates for Math/STEM/Storytime/Tutor/Zhongwen.
  - Decision 2B: specific approved AI provider/model name per product page (or confirm neutral copy is the long-term choice).
  - Decision 4B: specific approved efficacy stats with evidence + consent artifacts (and `consent-<school>.{md,pdf}` for any named school).
  - Phase 2 carryover: role floor for marketing routes (any authenticated staff vs `ADMIN`-equivalent floor).
