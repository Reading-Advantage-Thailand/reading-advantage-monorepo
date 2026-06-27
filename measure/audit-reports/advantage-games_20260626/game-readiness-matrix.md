# Advantage Games — Game Readiness Matrix (`game-readiness-matrix.md`)

> **Track:** `advantage_games_review_20260626`
> **Source:** Synthesis of 47 line-review batches (`line-review/games-batch-*.md`)
> **Status:** Review-input matrix. No remediation performed. Phase acceptance/closeout **PENDING**.

## Legend

**Status** (review judgment of import/ship readiness, not an acceptance decision):
- `NOT-READY` — has a HIGH/CRITICAL blocker for standalone play or host import.
- `AT-RISK` — playable standalone but blocked for Reading/Primary import by shared-runtime gaps.
- `PLACEHOLDER` — catalog entry only; no implementation.

**Import readiness** reflects readiness to embed into Reading Advantage / Primary Advantage.
Because the shared completion contract, i18n, leaderboard tenancy, and mock API layer are
**common blockers (Class A)**, every implemented game inherits them. Game-specific blockers
are listed in addition.

**Common (shared-runtime) blockers inherited by ALL implemented games** — see
`line-review-synthesis.md` §2 and `findings.md` §A:
- A1 client-trusted/inconsistent completion contract; fabricated counts; duplicate `onComplete`
- A3 leaderboard not persisted / no `schoolId` / red tenant-coverage gate
- A4 hardcoded `/en/` + missing i18n
- A5 `force-static` mock API (no auth/persistence/Zod)
- A8 canvas a11y (no ARIA/screen-reader/reduced-motion), unguaranteed mute

---

## Sentence Games (16)

| Game | Status | Game-specific blockers (batch IDs) | Test coverage | Mobile / A11y | Reading/Primary import readiness |
|------|--------|-------------------------------------|---------------|---------------|----------------------------------|
| abyssal-well | NOT-READY | `vocabulary` undefined ReferenceError on start (B04-044); `{vocabulary}` response key drift (B46-008) | Unit + e2e smoke (B45); logic tests B36 | Konva a11y gap (A8); touch not device-tested | Blocked: A1/A3/A4/A5 + start-screen crash |
| castle-defense | NOT-READY | `enemiesKilled` miscount (B02-043, B37-019); ~0.1 FPS pre-rewrite (B02-016) | Component+logic tests B27/B37; e2e smoke B44 | Perf risk on low-end (A7) | Blocked: A1/A3/A4/A5 + scoring miscount |
| devourer-slime | AT-RISK | `{sentences}` key (diverges from siblings) (B46-008); committed e2e failure artifact (B44) | Component+logic+e2e B27/B38/B44 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 |
| dungeon-liberator | NOT-READY | Shipped with **zero tests** despite TDD claim (B04-022); field-name bug to prod (B04-024) | Page test present (B20); thin | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 + test-integrity |
| griffin-riders-escape | AT-RISK | `{vocabulary}` key drift (B46-008) | Component+e2e B27/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 |
| griffin-sky-joust | NOT-READY | Ignores own `wordCount` difficulty; `knockback.x`/`friction` dead (B38-010); source absent from test batch (B27-025) | Logic test B36; component test orphaned (B27-025) | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 + dead difficulty |
| gryphon-patrol | NOT-READY | Difficulty tiers cosmetic — logic ignores difficulty (B15-019); duplicate `onComplete` (B28-017) | Component+logic+e2e B28/B39/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 + dead difficulty |
| haunted-library | AT-RISK | Warning link to `/` (B21-009). Positive: sends **real** counts (B21-235) | Component+logic+e2e B28/B39/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 (best-behaved on counts) |
| labyrinth-goblin-king | NOT-READY | `startLabyrinthGoblinKing()` never called → **game never starts**; force-static missing → 500 (B04-044) | Logic+config tests B36; e2e B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 + non-functional start |
| potion-rush | NOT-READY | Word-pool desync w/ duplicate words (B43-041); tests drifted from store (B43-031/-017). Positive: fully localized page (B21-019), 44px targets | Extensive component+store tests B28/B43; e2e B45 | Best touch targets in suite (B21-019); reduced-motion N/A | Blocked: A1/A3/A5 + pool desync |
| realm-carver | AT-RISK | Expects `.text` field vs `{term,translation}` (B21-020); `{sentences}` key (B46-008) | Component+logic+config+e2e B29/B39/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 + field shape |
| rune-forge-chamber | AT-RISK | `{sentences}` key (B46-008) | Component+logic+config+e2e B29/B40/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 |
| shadow-gate-dungeon | AT-RISK | `{sentences}` key (B46-008). Has route+page tests (B25) | Component+logic+route+e2e B29/B41/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 |
| spellweavers-run | AT-RISK | `{sentences}` key (B46-008) | Component+logic+config+e2e B29/B41/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 |
| storm-castle-tower | NOT-READY | Difficulty selector broken; stale-state start (B29-002/-021) | Component+logic+config+e2e B29/B36/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 + broken difficulty |
| village-guardian | AT-RISK | `{sentences}` key (B46-008) | Component+logic+config+e2e B29/B36/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 |

---

## Vocabulary Games (10)

| Game | Status | Game-specific blockers (batch IDs) | Test coverage | Mobile / A11y | Reading/Primary import readiness |
|------|--------|-------------------------------------|---------------|---------------|----------------------------------|
| alchemists-synthesis | NOT-READY | No insufficient-data UX; silently serves placeholder vocab (B21-036) | Component+page+logic tests B21/B30/B36 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 + silent placeholder |
| archers-revenge | NOT-READY | "medium" not a valid config key (B30-001); links to `/games` likely 404 (B21-039); `console.log` XP (B21-040) | Component+route+logic tests + e2e B30/B37/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 + invalid difficulty/nav |
| dragon-flight | NOT-READY | `onComplete` every boss tick → duplicate XP (B30-002); `dragonCount` can hit 0 vs army≥1 assumption (B30-006); `console.log` XP (B21-043) | Component+RankingDialog+logic+e2e B30/B38/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 + duplicate completion |
| dragon-rider | NOT-READY | `onComplete` every boss tick → duplicate XP (B30-002); page source absent from page-test batch (B21-226) | Component+page+logic+e2e B21/B30/B38/B45 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 + duplicate completion |
| enchanted-library | AT-RISK | Vacuous victory if vocab map cleared — latent (B38-013); missing `ranking` route (B22-007) | Largest component test set B30; logic B38; e2e B45 | Konva a11y gap (A8); brittle Rect-count tests (B31-005) | Blocked: A1/A3/A4/A5 + missing ranking route |
| magic-defense | AT-RISK | Uses shared `games/game/**` shell; inherits shell findings (B25–B27); `force-static` mock route (B25) | Shell component tests B25–B27; config B39; e2e B45 | Shell a11y (A8); fullscreen no iOS fallback (B00-022) | Blocked: A1/A3/A4/A5 |
| paladins-twin-soul | AT-RISK | Config-driven; difficulty enum drift (B38/B39); page B21 | Component+page+logic+config tests B21/B31/B39 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 |
| rpg-battle | NOT-READY | `useRPGBattleStore` module-level `revealTimeout` global mutable state (B43-054); never sets `xpEarned` (B43-074) | Many component tests B31/B32; store+scaling+selection tests B40/B43; e2e B45 | Konva a11y gap (A8) | Blocked: A1/A3/A5 + global state hazard |
| rune-match | NOT-READY | "Bomb" special move permanently dead (B32-001); score ≠ XP basis (B32-002) | Component+logic+config+e2e B32/B40/B46 | Konva a11y gap (A8); count-coupled tests (B32-018) | Blocked: A1/A3/A4/A5 + dead mechanic |
| wizard-vs-zombie | NOT-READY | Exit before game-over discards run (B32-003); `Math.random()` in render (B27-008); `setTimeout` in `setGameState` (B27-009) | Component+logic+indicators+e2e B32/B41/B46; remotion promo B43 | Konva a11y gap (A8) | Blocked: A1/A3/A4/A5 + lost-run + non-determinism |

---

## Catalog Placeholders (not implemented)

| Game | Status | Note |
|------|--------|------|
| astral-mage | PLACEHOLDER | `status:'coming-soon'` in `gameCards.ts`; compliance-audit track exists (B12/B13) but no component/page/API |
| babel-architect | PLACEHOLDER | `status:'coming-soon'`; `babelArchitectCompliance.test.ts` present (B37) but no runtime game |
| sorcerer-ziggurat | PLACEHOLDER | `status:'coming-soon'` (B18); no runtime game |

---

## Matrix Notes

- **Every implemented game is currently NOT-READY or AT-RISK** for Reading/Primary import due
  to the Class A shared-runtime blockers; none can be certified import-ready from this review.
- "Test coverage" reflects **presence and shape** of tests, not pass/fail or measured
  coverage %. Multiple batches flag that page/component tests over-mock and never assert
  scoring/`onComplete` (B21, B22, B28) and that e2e is smoke-only (B45, B46). See `test-gaps.md`.
- Mobile/touch and on-device a11y were **not executed**; notes are static/code-level.
- This matrix asserts **no acceptance or closeout**; it is a review input only.
