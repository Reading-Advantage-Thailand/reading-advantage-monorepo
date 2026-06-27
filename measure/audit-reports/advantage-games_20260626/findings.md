# Advantage Games — Findings Register (`findings.md`)

> **Track:** `advantage_games_review_20260626`
> **Source:** 47 line-review batches (`line-review/games-batch-00.md` … `games-batch-46.md`)
> **Total line-anchored findings across batches:** 1,749 (`F-GAMES-B00-001` … `F-GAMES-B46-039`)
> **Status:** Deduplicated findings register. No remediation performed. All findings are **OPEN**. Phase acceptance/closeout **PENDING**.

This register deduplicates the 1,749 batch findings into consolidated entries. Each entry cites
the **source batch finding IDs**; the authoritative wording and line anchors live in the named
batch report. Findings are split into:
- **§A Shared-runtime** (cross-game root causes)
- **§B Per-game** (game-specific)
- **§C Docs / process / test-fixture**
- **§D Import-contract gaps (Reading/Primary)** — called out explicitly

Severity: CRITICAL / HIGH / MEDIUM / LOW as recorded by the source batch.

---

## §A — Shared-Runtime Findings

### A1 — No enforceable completion/scoring contract — CRITICAL/HIGH
- **Sources:** B25-001 (CRITICAL, client-trusted XP), B25-002 (no Zod boundary), B28-017
  (CRITICAL, duplicate `onComplete`), B30-002 (boss-tick duplicate completion), B21-002 theme
  (5+ payload shapes), B21-037 / B22-026 (accuracy 0–1 vs ×100), B28-002 / B29-005 (inconsistent
  `onComplete` contracts), B21-001/-004/-012/-017/-025/-028/-031/-033 (fabricated
  `correctAnswers`/`totalAttempts`), B23-007/B24-007 (dead contract fields), B46-031 (host writes
  client XP unbounded).
- **Effect:** Server progress, mastery, and leaderboards are unreliable; no single Zod schema can
  validate the routes; XP can be inflated/duplicated.

### A2 — Duplicated & inconsistent XP / difficulty math — HIGH
- **Sources:** B20-039 (two `calculateXP`), B00-009 / B43-074 (double-counted-accuracy fallback),
  B22-009/-014/-026 (no shared XP/accuracy formula), B38-004/-009/-010/-013 (fractured difficulty
  enums; guardrail unused), B21-018 (`normal` vs `medium` leaderboard key mismatch), B12 theme +
  B35-032 (adaptive difficulty vs standardized-preset conflict), B42-005/-026/-065 (multiplayer XP
  non-comparable to single-player cap-10).

### A3 — Leaderboard not persisted + multi-tenant fragility — HIGH
- **Sources:** B22-007/-028/-029 (localStorage-only, never calls `recordSession`), B28-001
  (no progress recorded), B23-004/B24-004/-021 (ranking empty/frozen by `force-static`), B46-021
  (`xpLogs`/`gameRankings` no `schoolId`), B46-025 (`leaderboards` unregistered), B46-027
  (nullable `schoolId`), B46-036 (tenant-coverage CI **red**), B46-037 (no documented owner-join).

### A4 — Internationalization largely absent — HIGH
- **Sources:** B22-001/-008/-017/-030..033 (English-only static params + links), B36-001/-002
  (hardcoded `/en/`, base-path mismatch — every game), B20-032/-036/-040/-046 (hardcoded Thai/
  English literals), B21-002/-005/-011/-026/-028/-031/-032 (`useScopedI18n` imported then ignored),
  B27-007 (hardcoded English in 3 games), B33-004 (multiplayer UI i18n). Positive: B42-242
  (comprehensive `en.ts` tree exists, unused by pages).

### A5 — Mock-only API layer (no persistence/auth/Zod) — HIGH
- **Sources:** B22-003/-034/-035/-037/-039/-041, B23-004/-005, B24-003/-005, B25-003, B37-001
  (`force-static` on POST mutations), B46-008 (sentence response key not normalized:
  `{vocabulary}` vs `{sentences}`), B23-008/B24-008 (`activityId` collision via `Date.now()`).

### A6 — Shared input / DPad / camera / socket — HIGH/MEDIUM
- **Sources:** B29-001 / B33-011 (duplicated divergent `VirtualDPad`), B00-019 / B29-007/-030
  (no keyboard/ARIA on DPad/action), B34-005 / B35-004 (WS reconnect counter defeats `maxRetries`,
  no jitter/cap), B29-011 (rAF re-subscribes every frame), B29-018 (tap double-fire corrupts
  scoring, no `preventDefault`).

### A7 — Performance / mobile / browser compatibility — MEDIUM
- **Sources:** B00-020 / B28-052 (per-instance timers + setState in hot path), B02-011/-016
  (~0.1 FPS pre-rewrite; vague perf specs), B20-021/-022 (chromium-only e2e; runs dev not export),
  B00-022 (fullscreen no iOS Safari fallback), B29-003 (Konva CSS-gradient/SVG-url fills render
  incorrectly), B00-023 (`ResizeObserver` no empty/zero guard).

### A8 — Accessibility & age-appropriate UX — HIGH/MEDIUM
- **Sources:** B00-017 (no SR/ARIA/contrast/reduced-motion for canvas), B28-052 (particle count
  ignores reduce-motion), B00-018 (mute not guaranteed on Konva path), B14-013 (9px label text
  < 16px minimum), B29-007 (unlabeled `<select>`), B21-009 theme (icon-only back links no
  `aria-label`).

---

## §B — Per-Game Findings

| # | Game | Finding (consolidated) | Severity | Source IDs |
|---|------|------------------------|----------|-----------|
| B-01 | labyrinth-goblin-king | start fn never called → game never starts; force-static missing → 500 | CRITICAL | B04-044 |
| B-02 | abyssal-well | `vocabulary` undefined ReferenceError on start screen | HIGH | B04-044 |
| B-03 | castle-defense | `enemiesKilled` conflates death vs base-leak → wrong score; ~0.1 FPS pre-rewrite | HIGH | B02-043, B02-016, B37-019 |
| B-04 | dungeon-liberator | shipped with zero tests despite TDD claim; field-name bug to prod | CRITICAL | B04-022, B04-024 |
| B-05 | storm-castle-tower | difficulty selector broken; stale-state start | HIGH | B29-002, B29-021 |
| B-06 | dragon-flight | `onComplete` every boss tick → duplicate XP; `dragonCount` 0 vs army≥1; console.log XP | HIGH | B30-002, B30-006, B21-043 |
| B-07 | dragon-rider | `onComplete` every boss tick → duplicate XP | HIGH | B30-002 |
| B-08 | archers-revenge | "medium" not a valid config key; links to `/games` (404 risk); console.log XP | HIGH | B30-001, B21-039, B21-040 |
| B-09 | rune-match | "Bomb" special move permanently dead; score ≠ XP basis | HIGH | B32-001, B32-002 |
| B-10 | wizard-vs-zombie | exit before game-over discards run; `Math.random()` in render; setTimeout in setState | HIGH | B32-003, B27-008, B27-009 |
| B-11 | griffin-sky-joust | ignores own `wordCount` difficulty; dead `knockback.x`/`friction`; source absent from test batch | HIGH | B38-010, B27-025 |
| B-12 | gryphon-patrol | difficulty tiers cosmetic; duplicate `onComplete` | HIGH | B15-019, B28-017 |
| B-13 | rpg-battle | module-level `revealTimeout` global mutable state; never sets `xpEarned` | HIGH | B43-054, B43-074 |
| B-14 | potion-rush | word-pool desync w/ duplicate words; tests drifted from store | CRITICAL/HIGH | B43-041, B43-031, B43-017 |
| B-15 | enchanted-library | vacuous victory if vocab map cleared (latent); missing `ranking` route | MEDIUM/HIGH | B38-013, B22-007 |
| B-16 | alchemists-synthesis | no insufficient-data UX; silently serves placeholder vocab | HIGH | B21-036 |
| B-17 | haunted-library | warning link to `/` (positive: sends real counts) | MEDIUM | B21-009 |
| B-18 | realm-carver | expects `.text` vs `{term,translation}`; `{sentences}` key | MEDIUM | B21-020, B46-008 |
| B-19 | magic-defense | uses shared shell; inherits shell findings; mock route | MEDIUM | B25, B27 |
| B-20 | devourer-slime | `{sentences}` key drift; committed e2e failure artifact | LOW/MEDIUM | B46-008, B44 |

> Several per-game entries are surface manifestations of §A root causes (difficulty-is-dead-code,
> hardcoded nav, payload drift) and are cross-referenced there.

---

## §C — Docs / Process / Test-Fixture Findings

| # | Area | Finding (consolidated) | Severity | Source IDs |
|---|------|------------------------|----------|-----------|
| C-01 | Agent skills | Three.js/WorldLabs/Phaser skills contradict mandated Konva architecture | HIGH | B00-005, B00-006 |
| C-02 | Agent skills | `review-game` scores monetization/Play.fun not education fit | MEDIUM | B00-007 |
| C-03 | Agent skills | `vocab-game-builder` references non-existent `/conductor/`; commit template omits track_id | MEDIUM | B00-027 |
| C-04 | Agent skills | dead integration reference `docs/reading-advantage-integration.md`; conflicting import paths | HIGH | B00-013, B00-014, B00-015 |
| C-05 | CI | `npm ci` in pnpm monorepo, no working-directory, wrong `out` path | HIGH | B00-001, B00-002 |
| C-06 | CI | deploy on every PR; no lint/type/test gate | MEDIUM | B00-003, B00-004 |
| C-07 | CI | e2e specs excluded from tsc; screenshots into served `public/` | MEDIUM | B46-019, B46-017 |
| C-08 | Track metadata | `metadata.json status` not updated despite "completed" claim | HIGH | B15-002/-010/-024, B20-002 |
| C-09 | Compliance audits | reports contradict real source (difficulty standardization opposite of commit `85ecfd8f`) | HIGH | B19-002/-008/-021 |
| C-10 | Compliance audits | empty/0-byte placeholder assets scored as PASS | MEDIUM | B15-007, B15-014 |
| C-11 | Compliance audits | single-commit audits → no incremental TDD trail | MEDIUM | B15-004/-011, B20-004 |
| C-12 | Archive | corrupted/duplicated `metadata.json` risks double-counting | MEDIUM | B03 theme |
| C-13 | E2E | smoke/screenshot only; no scoring/XP/win-lose/payload assertions | MEDIUM | B46-001/-004/-005, B45-001/-002 |
| C-14 | E2E helpers | divergent route globs + response keys; helper ignores own arg; 24× copy-paste | MEDIUM | B46-008/-009/-010/-014 |
| C-15 | Templates | canonical `GameNameGame.tsx.template` references unimported `useInterval` → won't compile; README same | CRITICAL | B43-060, B43-067 |
| C-16 | Templates | template specs stale vs platform (factory names, cover paths, viewport) | MEDIUM | B15-008, B15-013 |
| C-17 | Repo hygiene | favicon is 1.12 MB 1024×1024 PNG mislabeled `.ico`; committed test-results artifacts | LOW | B25-023, B44 |
| C-18 | Docs standard | exported functions lack JSDoc (violates monorepo standard; degrades build-graph) | MEDIUM | B35-054 |

---

## §D — Import-Contract Gaps (Reading / Primary) — EXPLICIT

These are the gaps that block embedding Advantage Games into Reading Advantage and Primary
Advantage. They are called out separately per the track acceptance criteria.

| # | Gap | Why it blocks import | Source IDs |
|---|-----|----------------------|-----------|
| D-01 | **No shared completion contract.** 5+ `/complete` payload shapes; accuracy unit varies (0–1 vs ×100). | Host cannot define one Zod input schema to validate game completions. | B21-002 theme, B21-037, B25-002, B22-026 |
| D-02 | **Client-trusted XP, no validation/bounds.** `createCompleteRoute()` and host `recordActivity` accept arbitrary `xpEarned`. | Scoring integrity/security hole on import; XP can be inflated/negative. | B25-001, B46-031 |
| D-03 | **Mock, non-persistent API.** Routes are `force-static`; no DB, no auth, no `schoolId`. | Games built to the mock contract have no real server-side scoring/tenant scoping. | B22-003, B24-003, B25-003 |
| D-04 | **Leaderboard tables lack tenant key.** `xpLogs`/`gameRankings` no `schoolId`; `leaderboards` nullable `schoolId` + unregistered → tenant-coverage CI red. | Importing leaderboards requires manual owner-FK joins; cross-school leak risk. | B46-021, B46-025, B46-027, B46-036 |
| D-05 | **No validated activity/game-type vocabulary.** `activityType`/`gameType` are free text; the existing `activityType` enum omits games entirely. | Host cannot reliably group/rank/report game XP. | B46-022, B46-030 |
| D-06 | **Host mutations lack Zod + trust `lessonId`.** `recordActivity`/`updateLessonProgress` have no input/output schema and accept cross-tenant `lessonId`. | Violates AGENTS.md boundary rules; tenant isolation depends on unverified FK. | B46-031, B46-032, B46-033 |
| D-07 | **English-only + hardcoded `/en/`.** Static params, links, and base paths assume `en`. | Reading/Primary are multilingual; games cannot localize on import. | B22-001, B36-001, B36-002 |
| D-08 | **Divergent content response keys.** Sentence endpoints return `{vocabulary}` or `{sentences}` inconsistently; `VocabularyItem` reused for sentences. | A shared host content adapter cannot assume one shape. | B46-008, B23-009, B24-009 |
| D-09 | **Hardcoded SPA navigation / `window.location.href`.** Games navigate to absolute app routes (`/`, `/games`) and full-page exits. | Not embeddable inside a host shell/router. | B27-010, B29-004, B31-001, B21-039 |
| D-10 | **Dead/missing integration guide.** `docs/reading-advantage-integration.md` does not exist; surviving guidance is stale (Prisma/next-connect). | No authoritative import procedure. | B00-013 |
| D-11 | **Duplicated primitives / two builder skills.** Two `basePath`, duplicated `VirtualDPad`/`RankingDialog`, two vocab-game skills. | Game code is not yet a single reusable package; import would fork divergent copies. | B00-014/-015, B29-001, B33-011 |

---

## Disposition

- **All findings above are OPEN.** This register records review inputs only.
- No claim is made that any finding has been fixed, mitigated, accepted, or waived.
- Authoritative line anchors and full reasoning are in the cited batch reports.
- **Phase acceptance and closeout are PENDING.**
