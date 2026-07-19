# Mapper Hypotheses — T3 Pilot (apk_three_game_truth_pilot_20260712)

**Role:** requirements-mapper (`requirements-mapper:t3:2026-07-20`)
**Status of every entry below:** NON-AUTHORITATIVE HYPOTHESIS — do not cite as fact, requires evidence-collector validation.

These are cross-game similarity hypotheses surfaced during Phase 2 mapping. They are
NOT findings, NOT capability conclusions, NOT standardization proposals. Each entry
lists only the ledger claims that prompted the hypothesis. No hypothesis below may be
used as evidence in any downstream artifact until an evidence collector verifies it
against raw source with its own claim ledger entries.

---

## H1 — 3x3 sprite-sheet pose grids appear in both pilot action games

- Dragon Flight loads five `*-3x3-sheet-*.png` sheets (gates, boss, player x2, army)
  and animates a 3x3 sheet with a 9-step CSS keyframe cycle
  (DF-ASSET-001..005, DF-ASSET-040, DF-ASSET-041).
- RPG Battle uses `*_pose_sheet_3x3.png` files with a documented 3x3 pose grid and a
  CSS `background-position` pose renderer with GRID_SIZE=3
  (RPG-ASSET-039, RPG-ASSET-040, RPG-MECH-008).
- Hypothesis: a 3x3 pose-sheet convention may recur across APK games. UNVERIFIED
  beyond these two games; Abyssal Well used R3F geometry, not sprite sheets
  (AW-HIST-012).

## H2 — Mock API route factory pattern appears in all three pilot games

- Dragon Flight complete/vocabulary routes are built by `createCompleteRoute()` /
  `createVocabularyRoute(SAMPLE_VOCABULARY)` (DF-ID-010, DF-COPY-005); the DF
  complete route is byte-identical to alchemists-synthesis's (DF-COPY-019).
- RPG Battle routes use the same factories (RPG-ID-006, RPG-ID-007).
- Abyssal Well historically used `createCompleteRoute()` /
  `createSentencesRoute(SAMPLE_SENTENCES)` (AW-HIST-003, AW-HIST-004).
- Hypothesis: advantage-games APK routes may share a small set of route factories.
  UNVERIFIED at corpus scale; sentence vs vocabulary factory differences unmapped.

## H3 — Completion POST payloads overlap across pilot games

- Dragon Flight posts correctAnswers, totalAttempts, accuracy, dragonCount,
  timeTaken, difficulty (DF-MECH-053).
- RPG Battle posts xp, accuracy, totalAttempts, totalCorrect, turnsTaken, heroId,
  enemyId, outcome (RPG-MECH-022).
- Abyssal Well historically posted xpEarned, accuracy, correctAnswers,
  totalAttempts, userId (AW-HIST-035).
- Hypothesis: accuracy and attempt counts may be a shared completion-payload core.
  Field-name drift (correctAnswers vs totalCorrect vs xp vs xpEarned) is visible and
  UNRESOLVED.

## H4 — Ranking surfaces appear in both current pilot games

- Dragon Flight has a RankingDialog component reused by CastleDefenseGame
  (DF-COPY-004, DF-COPY-017, DF-COPY-018) and reading-advantage ranking API routes
  (DF-COPY-015).
- RPG Battle has a rankings tab fetching `/api/v1/games/rpg-battle/ranking`
  (RPG-CTL-009) and a reading-advantage ranking route (RPG-ID-009); advantage-games
  has no rpg-battle ranking route (RPG-ID-011).
- Hypothesis: a ranking dialog/route pairing may recur across games. UNVERIFIED;
  whether the two games share ranking UI code is not established by any claim.

## H5 — Per-game vocab JSON fixtures may share provenance

- The deleted `public/vocab/dragon-flight.json` fixture is byte-identical to the live
  `public/vocab/dragon-rider.json` (DF-HIST-002).
- `public/vocab/rpg-battle.json` exists as a denominator data file (RPG-ASSET-026).
- Hypothesis: `public/vocab/*.json` fixtures may have been produced by a shared
  process. UNVERIFIED; no claim links the rpg-battle fixture to any other fixture.

## H6 — Difficulty modulation of terminal XP appears in both current pilot games

- Dragon Flight has four named difficulty presets with duration/penalty knobs
  (DF-MECH-016..021).
- RPG Battle scales final XP by the selected enemy multiplier (RPG-MECH-010,
  RPG-MECH-007).
- Hypothesis: "harder configuration -> scaled terminal reward" may be a recurring
  shape. UNVERIFIED; the mechanisms differ (preset table vs enemy multiplier) and no
  claim connects them.

---

*End of hypotheses. Count: 6 NON-AUTHORITATIVE HYPOTHESIS entries.*
