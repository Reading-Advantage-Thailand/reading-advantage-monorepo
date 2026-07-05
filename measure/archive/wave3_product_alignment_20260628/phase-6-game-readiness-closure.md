# Phase 6 — Game Readiness Closure Matrix (frozen 2026-07-05 at HEAD `ab1de4d3`)

> **Track:** `wave3_product_alignment_20260628`
> **Source-of-truth review matrix:** `measure/audit-reports/advantage-games_20260626/game-readiness-matrix.md`
>   (immutable audit-report artifact — NOT modified by this track; this file is the
>   Wave 3 closure overlay that records each game's post-implementation status).
> **Scope:** Records the post-Wave-3 import readiness of every implemented Advantage
>   Game. Wave 3 resolved the shared-runtime Class A blockers at the module level
>   (`packages/domain/src/games/`) and proved one representative game
>   (`haunted-library`) pilot-import-ready. The remaining games are NOT-READY/AT-RISK
>   pending per-game migration in a successor track.

## Wave 3 shared-runtime resolutions (apply to ALL games at the module level)

The Class A blockers inherited by every implemented game (per the source matrix §legend)
are now resolved at the shared-module level:

| Class A blocker | Wave 3 resolution | Phase | Evidence |
|-----------------|-------------------|-------|----------|
| A1 — client-trusted/inconsistent completion contract; fabricated counts; duplicate `onComplete` | RESOLVED — single shared `GameCompletionInputSchema` (Zod, `.strict()`) in `packages/domain/src/games/schema.ts`; server-side `calculateGameXP` (`Math.min(10, base + bonus)`); `xp`/`dragonCount`/`bossPower` rejected. | Phase 3 | commit `895279ef`; `pnpm --filter @reading-advantage/domain test -- games` → 524 pass / 5 skipped |
| A3 — leaderboard not persisted / no `schoolId` / red tenant-coverage gate | RESOLVED — new `gameCompletions` FLAT table (schoolId NOT NULL + unique `(schoolId, userId, activityId)`); `xpLogs` unique `(userId, activityId)`; `leaderboards.schoolId` NOT NULL; `getSchoolLeaderboard` via TenantDB without `unscoped()`; dual-write in `recordGameCompletion`. | Phase 4 | commit `bc792b68`; migration `0026_game_completions.sql`; `pnpm --filter @reading-advantage/domain test -- games-live` → 524 pass / 5 skipped; `pnpm --filter @reading-advantage/domain test -- tenant-coverage` → exit 0 |
| A4 — hardcoded `/en/` + missing i18n | RESOLVED for representative games only — `GamesLocaleContext` + `generateStaticParams` returns `['en','th','zh']` + locale-agnostic hrefs in `gameCards.ts` (29 `/en/` hrefs removed). **Per-game `/en/` removal for the 24 unmigrated games is deferred to the successor track.** | Phase 5 | commit `7e95f56b`; `pnpm --filter vocabulary-games test --testPathPatterns=gameCards` → 2/2 pass |
| A5 — `force-static` mock API (no auth/persistence/Zod) | PARTIALLY RESOLVED — `rankingRoute.ts` and `completeRoute.ts` now validate responses via real Zod schemas (`leaderboardResponseSchema`, `GameCompletionInputSchema`) and delegate to real domain mutations (`recordGameCompletion`, `getSchoolLeaderboard`). Persistence for non-migrated games' route handlers is deferred to the successor track. | Phases 3/4 | commits `895279ef`, `bc792b68`; `pnpm --filter vocabulary-games test --testPathPatterns=completeRoute` → 28 pass; `--testPathPatterns=rankingRoute` → 7 pass |
| A8 — canvas a11y (no ARIA/screen-reader/reduced-motion), unguaranteed mute | NOT ADDRESSED by Wave 3 — owned by Wave 6 Phase 3 (Accessibility and UX Polish) per `medium-plus-coverage-matrix.md`. | — | deferred |

## Per-game post-Wave-3 status

> Status legend: `PILOT-IMPORT-READY` = Phase 5 import harness proven; `NOT-READY` =
> HIGH/CRITICAL game-specific blocker remains; `AT-RISK` = playable standalone but blocked
> for import by unresolved per-game migration. "Per-game migration" = adopt the shared
> completion contract, drop hardcoded `/en/` hrefs, delegate route handler to real domain
> mutation.

### Pilot-import-ready (1 game)

| Game | Status | Wave 3 work | Remaining caveat |
|------|--------|-------------|------------------|
| haunted-library | PILOT-IMPORT-READY | Phase 3 contract migration (`HauntedLibraryGame.tsx` `onComplete` payload rebuilt: added `gameType`/`difficulty`/`duration`/`victory`/`idempotencyKey`/`clientTimestamp`/`score`; removed `xp`); Phase 5 embeddable navigation (`onNavigate` contract), i18n (`GamesLocaleContext`), canonical runtime (`@/lib/games-runtime`), import-harness proof (9/9 tests). | A8 Konva a11y gap deferred to Wave 6. Production pilot import into Reading/Primary deferred to successor track (host-app wiring). |

### Navigation-fix sample (1 game — still NOT-READY)

| Game | Status | Wave 3 work | Remaining blockers |
|------|--------|-------------|--------------------|
| dragon-rider | NOT-READY | Phase 5 navigation-fix sample only — dropped hardcoded `<Link href="/en/student/games">`, wired `onNavigate('games')`. | Duplicate-completion `onComplete` every boss tick (B30-002) — completion contract NOT migrated in Phase 5 (only navigation). Page source absent from page-test batch (B21-226). A8 Konva a11y gap. Per-game migration to shared contract deferred to successor track. |

### Remaining 24 implemented games — NOT-READY / AT-RISK (deferred to successor track)

> These 24 games inherit the now-resolved shared-runtime Class A module (A1/A3/A5), but
> each requires per-game migration work (adopt `GameCompletionInputSchema` in the
> component `onComplete`, drop hardcoded `/en/` hrefs, delegate the route handler to the
> real domain mutation, migrate `VirtualDPad`/`withBasePath`/`calculateClientXP` imports
> to `@/lib/games-runtime`). They remain NOT-READY/AT-RISK exactly as the source matrix
> recorded, with the same game-specific blockers. Full import is explicitly a non-goal of
> Wave 3 (spec §Non-Goals; `phase-0-decisions.md` Decision 3).

#### Sentence games (15 remaining — sentence-games total 16, minus haunted-library PILOT-IMPORT-READY)

> Recount: dragon-rider is a vocabulary game, so the sentence-games remainder is 16 − 1 (haunted-library) = 15. The vocabulary-games remainder is 10 − 1 (dragon-rider) = 9. 15 + 9 = 24 remaining implemented games.

| Game | Status | Game-specific blockers (batch IDs from source matrix) | Per-game migration owner |
|------|--------|--------------------------------------------------------|--------------------------|
| abyssal-well | NOT-READY | `vocabulary` undefined ReferenceError on start (B04-044); `{vocabulary}` response key drift (B46-008) | successor track |
| castle-defense | NOT-READY | `enemiesKilled` miscount (B02-043, B37-019); ~0.1 FPS pre-rewrite (B02-016) | successor track |
| devourer-slime | AT-RISK | `{sentences}` key (diverges from siblings) (B46-008); committed e2e failure artifact (B44) | successor track |
| dungeon-liberator | NOT-READY | Shipped with zero tests despite TDD claim (B04-022); field-name bug to prod (B04-024) | successor track |
| griffin-riders-escape | AT-RISK | `{vocabulary}` key drift (B46-008) | successor track |
| griffin-sky-joust | NOT-READY | Ignores own `wordCount` difficulty; `knockback.x`/`friction` dead (B38-010); source absent from test batch (B27-025) | successor track |
| gryphon-patrol | NOT-READY | Difficulty tiers cosmetic — logic ignores difficulty (B15-019); duplicate `onComplete` (B28-017) | successor track |
| labyrinth-goblin-king | NOT-READY | `startLabyrinthGoblinKing()` never called → game never starts; force-static missing → 500 (B04-044) | successor track |
| potion-rush | NOT-READY | Word-pool desync w/ duplicate words (B43-041); tests drifted from store (B43-031/-017). 10 `window.location.href` exits remain (`router.push('/')` — Phase 5 NB-6). | successor track |
| realm-carver | AT-RISK | Expects `.text` field vs `{term,translation}` (B21-020); `{sentences}` key (B46-008). `window.location.href` exit remains (Phase 5 NB-6). | successor track |
| rune-forge-chamber | AT-RISK | `{sentences}` key (B46-008). `window.location.href` exit remains (Phase 5 NB-6). | successor track |
| shadow-gate-dungeon | AT-RISK | `{sentences}` key (B46-008). Has route+page tests (B25). `window.location.href` exit remains (Phase 5 NB-6). Route-handler test regression from Phase 3 strict Zod (correct D-01/D-02 behavior — documented in plan.md Phase 3 notes). | successor track |
| spellweavers-run | AT-RISK | `{sentences}` key (B46-008). `window.location.href` exit remains (Phase 5 NB-6). | successor track |
| storm-castle-tower | NOT-READY | Difficulty selector broken; stale-state start (B29-002/-021) | successor track |
| village-guardian | AT-RISK | `{sentences}` key (B46-008). `window.location.href` exit remains (Phase 5 NB-6). | successor track |

#### Vocabulary games (9 remaining — vocabulary-games total 10, minus dragon-rider navigation-fix sample)

| Game | Status | Game-specific blockers (batch IDs from source matrix) | Per-game migration owner |
|------|--------|--------------------------------------------------------|--------------------------|
| alchemists-synthesis | NOT-READY | No insufficient-data UX; silently serves placeholder vocab (B21-036) | successor track |
| archers-revenge | NOT-READY | "medium" not a valid config key (B30-001); links to `/games` likely 404 (B21-039); `console.log` XP (B21-040). `window.location.href` exit remains (Phase 5 NB-6). Route-handler test regression from Phase 3 strict Zod (correct D-01/D-02 behavior). | successor track |
| dragon-flight | NOT-READY | `onComplete` every boss tick → duplicate XP (B30-002); `dragonCount` can hit 0 vs army≥1 assumption (B30-006); `console.log` XP (B21-043). Quarantined for pre-existing React 19.2.7 act() infinite render loop (jest30 archive notes). | successor track |
| enchanted-library | AT-RISK | Vacuous victory if vocab map cleared — latent (B38-013); missing `ranking` route (B22-007). `window.location.href` exit remains (Phase 5 NB-6). | successor track |
| magic-defense | AT-RISK | Uses shared `games/game/**` shell; inherits shell findings (B25–B27); `force-static` mock route (B25) | successor track |
| paladins-twin-soul | AT-RISK | Config-driven; difficulty enum drift (B38/B39); page B21. `window.location.href` exit remains (Phase 5 NB-6). | successor track |
| rpg-battle | NOT-READY | `useRPGBattleStore` module-level `revealTimeout` global mutable state (B43-054); never sets `xpEarned` (B43-074) | successor track |
| rune-match | NOT-READY | "Bomb" special move permanently dead (B32-001); score ≠ XP basis (B32-002) | successor track |
| wizard-vs-zombie | NOT-READY | Exit before game-over discards run (B32-003); `Math.random()` in render (B27-008); `setTimeout` in `setGameState` (B27-009) | successor track |

### Catalog placeholders (3 — not implemented, unchanged)

| Game | Status | Note |
|------|--------|------|
| astral-mage | PLACEHOLDER | `status:'coming-soon'` in `gameCards.ts`; no runtime game |
| babel-architect | PLACEHOLDER | `status:'coming-soon'`; `babelArchitectCompliance.test.ts` present (B37) but no runtime game (8 pre-existing test failures from file-existence checks — Phase 5 NB-1) |
| sorcerer-ziggurat | PLACEHOLDER | `status:'coming-soon'` (B18); no runtime game |

## Successor-track gate (re-statement of `phase-0-decisions.md` Decision 3)

Full import of the remaining 25 implemented games (dragon-rider + the 24 above) is
deferred to a successor track gated on **per-game** closure of:

1. Per-game `onComplete` payload migration to `GameCompletionInputSchema` (drop `xp`; add `gameType`/`idempotencyKey`/`duration`/`victory`/`score`).
2. Per-game route-handler delegation to `recordGameCompletion` / `getSchoolLeaderboard` (drop `force-static` mock for non-representative games).
3. Per-game `/en/` href removal + `GamesLocaleContext` adoption (10 `window.location.href` exits + `PotionRushGame.router.push('/')` + per-game `Link` hrefs).
4. Per-game `VirtualDPad`/`withBasePath`/`calculateClientXP` import migration to `@/lib/games-runtime` (drop the 6 re-export shims once all 26 games migrate).
5. Per-game game-specific blockers listed above (B-batch IDs).
6. A8 canvas a11y (Wave 6 Phase 3).
7. Real `th`/`zh` translation content (Phase 5 Decision 5.2 Tier 2 — `[b] deferred:po`).

`measure/tracks.md` does NOT mark MR-H05 / CA-013 / D-07 / D-09 / D-11 as "resolved" —
those findings stay open until the successor-track production pilot import is green
(Phase 5 A6 defense; Phase 5 acceptance audit `phase-5-acceptance.json`).

## Phase 6 gate re-verification at HEAD `ab1de4d3`

- `pnpm --filter @reading-advantage/domain test -- games` → 524 pass / 5 skipped (exit 0).
- `pnpm --filter @reading-advantage/domain test -- games-live` → 524 pass / 5 skipped (exit 0).
- `pnpm --filter @reading-advantage/domain test -- tenant-coverage` → 41 files pass / 1 skipped (exit 0).
- `pnpm --filter @reading-advantage/domain lint` → 0 errors, 15 pre-existing warnings (exit 0).
- `pnpm --filter @reading-advantage/domain check-types` → tsc --noEmit clean (exit 0).
- `pnpm --filter @reading-advantage/db check-types` → tsc --noEmit clean (exit 0).
- `pnpm --filter vocabulary-games test --testPathPatterns=completeRoute` → 28 pass (exit 0).
- `pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute` → 7 pass (exit 0).
- `pnpm --filter vocabulary-games test --testPathPatterns=import-harness` → 9 pass (exit 0).
- `pnpm --filter vocabulary-games lint` → 0 errors, 6561 pre-existing warnings (exit 0).
- `pnpm --filter vocabulary-games check-types` → tsc --noEmit clean (exit 0).
