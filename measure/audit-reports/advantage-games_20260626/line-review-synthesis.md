# Advantage Games — Line-Review Synthesis (`line-review-synthesis.md`)

> **Track:** `advantage_games_review_20260626`
> **Inputs:** `line-review-coverage.md` + 47 reports (`line-review/games-batch-00.md` … `games-batch-46.md`)
> **Coverage:** 929 files · 47 batches · 47 reports · 11,231 report lines · 1,749 distinct line-anchored findings
> **Status:** Synthesis of completed line-by-line review. No source code edited. Phase **acceptance and closeout are explicitly PENDING**.

This document deduplicates and clusters the 1,749 line-anchored findings into **three
classes**: (A) shared-runtime findings, (B) per-game findings, and (C)
docs / process / test-fixture findings. Every cluster cites the **source batch IDs** that
raised it. This is a review-input artifact only; it certifies nothing as remediated,
accepted, or closed.

---

## 1. How to Read This Synthesis

- A **finding ID** has the form `F-GAMES-B<batch>-<n>` (e.g. `F-GAMES-B25-001`). The batch
  number maps directly to the report file `line-review/games-batch-<batch>.md`.
- Severity labels (CRITICAL / HIGH / MEDIUM / LOW / INFO) are reproduced as recorded by the
  batch reviewer; where a batch noted boundary cases, the higher tier is used.
- Clusters below merge **repeated** findings reported independently across multiple batches.
  The "blast radius" column lists the batches where the same root issue recurred.

### Severity roll-up (as recorded across batches)

| Severity | Approx. count | Notes |
|----------|---------------|-------|
| CRITICAL | ~10 | Concentrated in B04 (non-functional shipped games), B25 (client-trusted XP), B28 (duplicate `onComplete`), B43 (broken template + drifted tests) |
| HIGH | ~150 | Importability, scoring integrity, i18n, difficulty-is-dead-code, leaderboard tenancy |
| MEDIUM | ~600 | Contract drift, test shallowness, a11y gaps, mock-only routes |
| LOW / INFO | ~990 | Doc hygiene, staleness, cosmetic, brittle-test coupling |

> Counts are advisory aggregates from per-batch severity tables; they are **not** an
> acceptance gate. The authoritative severity for each finding is the label in its source batch.

---

## 2. Class A — Shared-Runtime Findings (cross-game root causes)

These are defects in shared modules (scoring/XP, completion/ranking contracts, i18n, input,
difficulty, leaderboard/tenancy, performance) that propagate to **many or all** games. They
are the highest-leverage items. Full detail in `findings.md` §A.

### A1. No single completion/scoring contract — HIGH/CRITICAL
**Batches:** B00, B21, B22, B23, B24, B25, B28, B29, B30, B32, B41, B42, B43, B46
- At least **5 distinct `/complete` payload shapes** observed across games; accuracy is
  sometimes 0–1, sometimes ×100 percent (B21-037, B22-026). No single Zod schema can validate
  all routes (B21-002 theme, B25-002).
- `createCompleteRoute()` **trusts client-supplied XP** with no Zod/bounds (B25-001 CRITICAL,
  B25-002, B46-031). A client may submit `xpEarned: 999999` or negative (B46-031).
- Several games **fabricate** `correctAnswers`/`totalAttempts` from accuracy/score heuristics
  (B21-001/-004/-012/-017/-025/-028/-031/-033) — server progress/mastery unreliable.
- `onComplete` fires **repeatedly** during boss/tick phases → duplicate XP/score writes
  (B28-017 CRITICAL, B30-002, B27-009 theme). Inconsistent `onComplete` result contracts
  across games (B28-002, B29-005).
- Multiplayer XP scale (uncapped, count-based) is **non-comparable** to single-player capped
  0–10 `calculateXP` (B42-005, B42-026, B42-065).

### A2. Duplicated/inconsistent XP & difficulty math — HIGH
**Batches:** B00, B20, B22, B35, B38, B41, B43
- Two `calculateXP` implementations (`@/lib/xp` vs `@/lib/games/xp`) with divergent semantics
  (B20-039). Fallback formula `floor(correctAnswers * accuracy)` double-counts accuracy and
  ignores `score` (B00-009, B43-074).
- Difficulty taxonomy is fractured: `normal` vs `medium` keys across games sharing one
  leaderboard UI (B21-018, B38-004/-009/-010/-013). Canonical `difficulty.ts` guardrails exist
  but are **largely unused** by the games they should govern (B38 theme).
- Adaptive difficulty mutates spawn/speed at runtime, conflicting with per-game "standardized
  preset" compliance specs — unreconciled governance gap (B12 theme, B35-032).

### A3. Leaderboard / multi-tenant import gaps — HIGH
**Batches:** B22, B23, B24, B46
- Leaderboards are **localStorage-only**, disconnected from `/complete`; pages never call
  `recordSession`/`recordActivity` (B22-007/-028/-029, B28-001).
- `xpLogs`/`gameRankings` have **no `schoolId`** (REFERENTIAL, owner-FK join only) — any
  leaderboard read that forgets the join leaks cross-school data (B46-021).
- `leaderboards` has a **nullable `schoolId`** and is **unregistered** in
  `tenant-registry.ts` → tenant-coverage CI gate is **red** (B46-025/-026/-027/-036).
- Host `recordActivity`/`updateLessonProgress` lack Zod input/output schemas and trust
  `lessonId` from input (cross-tenant lesson IDs not rejected) (B46-031/-032/-033).

### A4. Internationalization is largely absent — HIGH
**Batches:** B20, B21, B22, B27, B33, B36, B42
- App is effectively **English-only** (`generateStaticParams` en, hardcoded en links/strings)
  — blocks Reading/Primary import (B22-001/-008/-017/-030..033).
- Pages import `useScopedI18n` then hardcode strings; some **Thai**, some English, mixed
  across the batch (B20-032/-036/-040/-046, B21-002/-005, B27-007). Base-path/href use
  hardcoded `/en/` (B36-001/-002 — affects *every* game).
- Positive: the `en.ts` games translation tree is comprehensive and well-structured (B42-242
  observation) — the shape for host localization exists; it is simply not used by pages.

### A5. Mock-only API layer (no persistence/auth/Zod) — HIGH
**Batches:** B22, B23, B24, B25, B37, B46
- Completion/ranking routes are `force-static` **mocks**: no DB, no auth, no Zod, leaderboard
  always empty/frozen (B22-003, B23-004/-005, B24-003/-004, B25-003).
- `force-static` applied to POST mutation routes is a wrong/dead directive (B23-005, B24-005,
  B37-001).
- Sentence-API response **shape is not normalized** — some return `{vocabulary}`, some
  `{sentences}` for the same conceptual endpoint (B46-008/-062 detail, B21-030 theme).

### A6. Shared input / DPad / camera — HIGH/MEDIUM
**Batches:** B00, B29, B33, B34
- **Duplicated, divergent** `VirtualDPad` implementations across games (B29-001, B33-011).
- D-Pad/action overlays lack keyboard/ARIA (no `role`/`tabIndex`/`aria-label`)
  (B00-019, B29-007/-030).
- WS reconnect counter reset defeats `maxRetries` → unbounded reconnection; no jitter/cap
  (B34-005, B35-004).
- rAF loop re-subscribes every frame (`gameState` in deps) (B29-011).

### A7. Performance / mobile / browser compatibility — MEDIUM
**Batches:** B00, B02, B20, B28, B29, B43
- Per-instance timers/rAF + `setState` in animation hot path (B00-020, B28-052).
- A shipped game ran at **~0.1 FPS on mobile** before rewrite; vague perf specs were the root
  cause (B02-011/-016).
- E2E runs **dev server not exported build**, chromium-only (B20-021/-022); fullscreen API
  has no iOS Safari fallback (B00-022).
- Konva fills set to CSS gradient / SVG `url()` strings render incorrectly (B29-003).

### A8. Accessibility & age-appropriate UX — HIGH/MEDIUM
**Batches:** B00, B21, B28, B29, B33
- **Zero** screen-reader/ARIA/contrast/reduced-motion guidance for canvas/Konva games
  (B00-017). Particle counts ignore reduce-motion (B28-052).
- Mute control not guaranteed on the mandated Konva path (B00-018); 9px label text below
  16px readability minimum (B14-013).
- Unlabeled `<select>` difficulty controls; icon-only back links without `aria-label`
  (B29-007, B21-009 theme).

---

## 3. Class B — Per-Game Findings (game-specific defects)

Game-specific defects after removing shared-runtime root causes. Each game's blockers are
enumerated in `game-readiness-matrix.md`; representative high-severity items below.

| Game | Key per-game findings | Batches |
|------|----------------------|---------|
| labyrinth-goblin-king | `startLabyrinthGoblinKing()` imported but never called → **game never started**; force-static missing → 500 on sentences | B04-044 |
| abyssal-well | `vocabulary` undefined ReferenceError on start screen (triage) | B04-044 |
| castle-defense | `enemiesKilled` formula conflates death vs base-leak → negative/incorrect kills; ~0.1 FPS pre-rewrite | B02-043, B02-016, B37-019 |
| dungeon-liberator | shipped with **zero tests** despite "strict TDD" claim; field-name bug survived to prod | B04-022, B04-024 |
| storm-castle-tower | difficulty selector broken (stale-state start) | B29-002, B29-021 |
| dragon-flight / dragon-rider | `onComplete` fires every boss tick; `dragonCount` can hit 0 while army logic assumes ≥1 | B30-002, B30-006 |
| archers-revenge | "medium" difficulty not a valid config key; links to `/games` (likely 404); `console.log` XP | B30-001, B21-039, B21-040 |
| rune-match | "Bomb" special move permanently dead (awarded, counted, never usable); score ≠ XP basis | B32-001, B32-002 |
| wizard-vs-zombie | exiting before game-over silently discards run; `Math.random()` in render | B32-003, B27-008 |
| griffin-sky-joust | ignores its own `wordCount` difficulty; `knockback.x`/`friction` dead; source absent from test batch | B38-010, B27-025 |
| gryphon-patrol | difficulty tiers cosmetic — logic ignores difficulty; duplicate `onComplete` | B15-019, B28-017 |
| enchanted-library | vacuous victory if vocab map cleared (latent); missing `ranking` route | B38-148(B38-013), B22-007 |
| potion-rush | word-pool accounting can desync with duplicate words; tests drifted from store (`definition` vs `translation`) | B43-041, B43-031, B43-017 |
| rpg-battle | `useRPGBattleStore` module-level `revealTimeout` global mutable state; never sets `xpEarned` | B43-054, B43-074 |
| haunted-library | warning link to `/`; (positive) sends real counts | B21-009, B21-235 |
| alchemists-synthesis | no insufficient-data UX; silently serves placeholder vocab | B21-036 |

> Many "per-game" rows ultimately trace to a Class A root cause (e.g. difficulty-is-dead-code,
> hardcoded navigation). Where that is true it is cross-referenced in the matrix.

---

## 4. Class C — Docs / Process / Test-Fixture Findings

Non-runtime findings: agent skills, Measure track artifacts, templates, CI, and test
fixtures/helpers.

### C1. Off-architecture / misleading agent skills — HIGH/MEDIUM
**Batches:** B00
- Three.js/WorldLabs/Phaser skills contradict the mandated React-Konva architecture
  (B00-005/-006); `review-game` scores monetization/Play.fun instead of education fit
  (B00-007); `fetch-tweet` irrelevant (B00-008).
- `vocab-game-builder` references a non-existent `/conductor/` tree (repo uses `measure/`)
  and commit templates omit the mandatory `(track_id: …)` (B00-027).
- Dead integration reference `docs/reading-advantage-integration.md` (B00-013); conflicting
  import paths across the two vocab-game skills (B00-014/-015).

### C2. CI / build hygiene — HIGH/MEDIUM
**Batches:** B00, B46
- CI workflow uses `npm ci` + `cache: npm` in a **pnpm** monorepo, no `working-directory`,
  wrong export path `out` (B00-001/-002); deploys on every PR with no lint/type/test gate
  (B00-003/-004).
- E2E specs excluded from `tsc` → contract mismatches get no compile backstop; screenshots
  written into served `public/` tree (B46-019/-017).

### C3. Measure track-artifact integrity — HIGH/MEDIUM
**Batches:** B01, B03, B04, B14, B15, B17, B19, B20
- Track `metadata.json status` not updated to completed despite plan/report claiming done
  (B15-002/-010/-024, B20-002).
- "Completed" compliance audits **contradict real source**: reports claim difficulty
  standardization the real commit `85ecfd8f` did the opposite (B19-002/-008/-021); empty/
  0-byte placeholder assets scored as PASS (B15-007/-014).
- Single-commit audits → no incremental TDD trail (B15-004/-011, B20-004); corrupted/
  duplicated `metadata.json` risks double-counting (B03 theme).

### C4. Test fixtures / E2E helpers — MEDIUM
**Batches:** B44, B45, B46
- E2E specs are **smoke/screenshot only** — no scoring/XP/win-lose/non-zero payload
  assertions (B46-001/-004/-005, B45-001/-002).
- Shared helpers encode divergent contracts: inconsistent route globs, two incompatible
  response keys, a helper that ignores its own `sentences` argument, 24× copy-paste
  (B46-008/-009/-010/-014).
- `test-results/` failure artifacts (PNG + error-context) committed into the tree (B44).

### C5. Templates — CRITICAL/MEDIUM
**Batches:** B43, B44
- Canonical `GameNameGame.tsx.template` references an unimported `useInterval` → scaffolding
  entrypoint **does not compile as shipped**; README documents the same broken pattern
  (B43-060, B43-067).
- Template specs stale vs platform (factory names, cover paths, viewport) (B15-008/-013).

---

## 5. Systemic Themes (deduplicated, ranked by leverage)

1. **The "shared runtime" is not yet singular.** Two `basePath` modules, two vocab-game
   skills, duplicated `VirtualDPad`/`RankingDialog`/XP, fractured difficulty enums. This is
   the root cause behind most HIGH drift findings. (B00, B20, B29, B33, B38)
2. **No enforceable scoring/completion contract.** Client-trusted XP, fabricated counts,
   duplicate `onComplete`, 5+ payload shapes, no Zod. Blocks importability and scoring
   integrity. (B21, B22, B25, B28, B46)
3. **Multi-tenant leaderboard import is unsafe.** No `schoolId` on core ranking tables,
   unregistered `leaderboards`, red tenant-coverage gate, unvalidated host mutations. (B46)
4. **i18n absence blocks import.** Hardcoded `/en/` + mixed Thai/English literals everywhere.
   (B20, B21, B22, B36)
5. **Self-reported compliance audits over-claim.** "Completed/TDD" games shipped
   non-functional or untested; metadata/reality mismatches. (B04, B15, B19, B20)
6. **Tests are shallow / drifted.** Over-mocking hides scoring bugs; e2e is smoke-only;
   template/test drift from store contracts. (B21, B22, B28, B43, B46)

---

## 6. What This Synthesis Does NOT Assert

- No remediation has been performed. All findings are **open** review inputs.
- No batch, phase, track, or game is certified ready, accepted, verified, or closed.
- Severity aggregates are advisory; product/track owners may reprioritize.
- Findings derived from docs/specs (B00–B19) reflect **contracts**, not always observed
  runtime; many were spot-checked but not exhaustively executed (see each batch's Limitations).
- **Phase acceptance and closeout remain PENDING.**
