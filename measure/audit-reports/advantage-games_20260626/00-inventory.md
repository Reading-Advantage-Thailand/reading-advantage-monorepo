# Advantage Games — Inventory (`00-inventory.md`)

> **Track:** `advantage_games_review_20260626`
> **Parent:** `monorepo_feature_review_masterplan_20260626`
> **Baseline SHA:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> **Source of record:** `line-review-coverage.md` + 47 batch reports under `line-review/games-batch-*.md`
> **Status:** Inventory derived from the completed line-by-line review. No source code was edited. Phase acceptance/closeout is **PENDING**.

---

## 1. Coverage Metrics

| Metric | Value |
|--------|-------|
| In-scope tracked files | 929 |
| Review batches | 47 (`games-batch-00` … `games-batch-46`) |
| Batch reports produced | 47 |
| Total report lines | 11,231 |
| Distinct line-anchored findings recorded | 1,749 (`F-GAMES-B00-001` … `F-GAMES-B46-039`) |
| Batch size | 20 files (final batch `games-batch-46` = 9 files) |
| Scope | `apps/advantage-games` plus selected shared ranking/import schema files in `packages/db` and `packages/domain` |
| Exclusions | `.next/**`, `node_modules/**`, `public/**`, `coverage/**`, `.turbo/**` |
| Source code edited during review | None |

Per-batch distinct finding counts (sum = 1,749):

```
B00:30 B01:33 B02:52 B03:14 B04:56 B05:22 B06:27 B07:48 B08:55 B09:50
B10:40 B11:20 B12:42 B13:38 B14:36 B15:30 B16:47 B17:25 B18:27 B19:25
B20:52 B21:46 B22:41 B23:23 B24:21 B25:25 B26:38 B27:30 B28:70 B29:33
B30:40 B31:18 B32:22 B33:20 B34:26 B35:56 B36:22 B37:27 B38:23 B39:50
B40:45 B41:49 B42:55 B43:79 B44:47 B45:35 B46:39
```

---

## 2. File-Type Composition (by batch grouping)

| Group | Batches | Nature | Notes |
|-------|---------|--------|-------|
| Agent skills / reference docs | B00 | `.agents/skills/**`, CI YAML, bash | Off-architecture (Three.js/Phaser) skills vs mandated Konva; CI uses npm in pnpm monorepo |
| Repo config + Measure archive specs | B01–B11 | `package.json`, eslint/jest/playwright config, `measure/archive/**` planning docs | Governance/contract artifacts; no runtime code |
| Per-game compliance-audit tracks | B12–B20 (partial) | `measure/tracks/*-compliance-audit_20260426/**` | Self-reported audits; several contradict real source |
| Game page shells (`page.tsx`) | B20–B22 | `src/app/[locale]/(student)/student/games/**` | Scoring payload + i18n + navigation findings |
| Game API routes | B22–B25 | `src/app/api/v1/games/**` | `force-static` mock routes; no auth/persistence/Zod |
| Shared game-shell components | B25–B27 | `src/components/games/game/**`, `dev/`, `app/` | Magic Defense shell, HUD, start/end screens |
| Per-game components | B27–B33 | `src/components/games/{sentence,vocabulary}/**`, multiplayer, ui | Game-specific runtime defects |
| Hooks | B33–B35 | `src/hooks/**` | Input, camera, loop, multiplayer socket, adaptive difficulty |
| Game logic / config libraries | B36–B41 | `src/lib/games/**` | Pure reducers, configs, XP, difficulty |
| Multiplayer + locales + remotion | B42–B43 | `src/lib/multiplayer/**`, `src/locales/**`, `src/remotion/**`, stores, templates | WS server, scoring engine, promo tooling |
| Types + e2e tests + shared schema | B44–B46 | `src/types/**`, `tests/e2e/**`, `packages/db/src/schema/**`, `packages/domain/src/progress/**` | E2E smoke-only; tenant-registry/import-contract gaps |

---

## 3. Implemented Game Roster

### 3.1 Sentence games (16 implemented — components + pages + API present)

`abyssal-well`, `castle-defense`, `devourer-slime`, `dungeon-liberator`,
`griffin-riders-escape`, `griffin-sky-joust`, `gryphon-patrol`, `haunted-library`,
`labyrinth-goblin-king`, `potion-rush`, `realm-carver`, `rune-forge-chamber`,
`shadow-gate-dungeon`, `spellweavers-run`, `storm-castle-tower`, `village-guardian`

### 3.2 Vocabulary games (10 implemented — components + pages + API present)

`alchemists-synthesis`, `archers-revenge`, `dragon-flight`, `dragon-rider`,
`enchanted-library`, `magic-defense`, `paladins-twin-soul`, `rpg-battle`,
`rune-match`, `wizard-vs-zombie`

> **26 implemented games total.** All 26 have a route under `src/app/api/v1/games/<game>/`
> and a page under `src/app/[locale]/(student)/student/games/{sentence|vocabulary}/<game>/`.
> `magic-defense` uses the shared `src/components/games/game/**` shell rather than a
> dedicated `vocabulary/magic-defense/` component directory.

### 3.3 Catalog entries NOT implemented (`status: 'coming-soon'` in `gameCards.ts`)

`astral-mage`, `babel-architect`, `sorcerer-ziggurat` — appear in the gallery catalog and
have `*-compliance-audit_20260426` track folders (B12–B13, B18) but **no runtime component,
page, or API route**. These are excluded from the readiness matrix's implemented-game rows
and noted as catalog-only placeholders.

---

## 4. Shared Runtime Modules (inventory)

| Area | Location | Reviewed in |
|------|----------|-------------|
| Game shell components | `src/components/games/game/` (GameContainer, GameEngine, HUD, StartScreen, GameStartScreen, GameEndScreen, ResultsScreen, Enemy, Explosion, MagicBolt, RankingDialog) | B25–B27 |
| Shared UI primitives | `src/components/ui/**`, `src/components/games/ui/VirtualDPad` | B32–B33 |
| Multiplayer UI | `src/components/multiplayer/**` | B32–B33 |
| Hooks | `src/hooks/**` (useGameLoop, useInterval, useGameCamera, useDirectionalInput, useLeaderboard, useSession, useSound, useSpriteAnimation, useMultiplayer*, useAdaptiveDifficulty, useAccessibilitySettings, usePerformanceMetrics) | B33–B35 |
| Pure game logic | `src/lib/games/*.ts` (per-game reducers + `*Config.ts`) | B36–B41 |
| Shared scoring/difficulty | `src/lib/games/xp.ts`, `src/lib/xp.ts`, `src/lib/games/difficulty.ts`, `src/lib/games/api/*` factories | B37–B42 |
| Adaptive difficulty engine | `src/lib/adaptive-difficulty/**` | B35 |
| Multiplayer runtime | `src/lib/multiplayer/**` (ws-server, room-manager, scoring-engine, game-session) | B42 |
| Stores | `src/store/**` (useGameStore, usePotionRushStore, useRPGBattleStore) | B43 |
| Templates | `src/templates/game/**` | B43–B44 |
| Types | `src/types/**` (accessibility, adaptive-difficulty, leaderboard, multiplayer) | B44 |
| Locales | `src/locales/**` (client, en) | B42 |

---

## 5. Tests and E2E

| Asset | Location | Reviewed in | Note |
|-------|----------|-------------|------|
| Jest/RTL unit + component tests | colocated `*.test.ts(x)` | throughout | Shallow/over-mocked in many cases (see `test-gaps.md`) |
| Playwright E2E specs | `tests/e2e/games/{sentence,vocabulary}/*.spec.ts` | B44–B46 | Smoke/screenshot only; no scoring/win-lose assertions |
| E2E helpers/fixtures | `tests/e2e/{helpers,fixtures}/**` | B44, B46 | Divergent route globs + response keys; 24× copy-paste |
| Playwright config | `playwright.config.ts` | B20 | Chromium-only; runs dev server not exported build |

---

## 6. Integration / Import Surface

| Surface | Location | Reviewed in |
|---------|----------|-------------|
| Game→host completion contract | `src/lib/games/api/completeRoute.ts` + per-game `complete/route.ts` | B25, B37 |
| Ranking/leaderboard contract | `src/lib/games/api/rankingRoute.ts` + per-game `ranking/route.ts` | B23–B24, B37 |
| Host progress persistence | `packages/domain/src/progress/mutations.ts` (`recordActivity`, `updateLessonProgress`) | B46 |
| Host schema (analytics/leaderboard) | `packages/db/src/schema/analytics.ts`, `packages/db/src/schema/primary.ts` | B46 |
| Tenant classification | `packages/domain/src/tenant-registry.ts` | B46 |

See `migration-tracks.md` and `findings.md` §Import-Contract Gaps for the explicit contract gaps.

---

## 7. Provenance & Limitations

- All counts and file groupings are sourced from `line-review-coverage.md` and the 47 batch
  reports. Roster confirmation (§3) used read-only directory listing of the working tree at
  review time.
- No build, test, lint, or typecheck run is asserted by this inventory except where an
  individual batch explicitly recorded one (B46 ran `tenant-coverage` once; result: red).
- This document makes **no acceptance or closeout determination**.
