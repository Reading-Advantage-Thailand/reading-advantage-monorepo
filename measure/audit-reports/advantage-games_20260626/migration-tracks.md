# Advantage Games — Proposed Migration / Remediation Tracks (`migration-tracks.md`)

> **Track:** `advantage_games_review_20260626`
> **Source:** Synthesis of 47 line-review batches. **Status:** Proposals only. No work performed, no track created. Phase acceptance/closeout **PENDING**.

This document proposes follow-on Measure tracks to remediate the findings. These are
**recommendations for the roadmap**, not committed work. None of these tracks has been created,
started, accepted, or closed. Sequencing reflects dependency and leverage; the track owner
decides scope and priority during acceptance.

Each proposed track cites the `findings.md` clusters and source batch IDs it would address.

---

## Tier 1 — Import-Blocking (do first)

### T1. Unify the game completion/scoring contract
- **Addresses:** D-01, D-02, A1, A2 — B25-001, B25-002, B21-002 theme, B21-037, B28-017,
  B30-002, B20-039, B00-009.
- **Scope:** Define one Zod `GameCompletionInput`/`Output` (xp, accuracy unit fixed, real
  `correctAnswers`/`totalAttempts`); single `calculateXP`; idempotent `onComplete` (fire-once);
  remove fabricated counts. Validate at the route boundary.
- **Acceptance signal:** every game posts the same validated shape; XP non-duplicated and capped.

### T2. Real, tenant-safe persistence + leaderboard contract
- **Addresses:** D-03, D-04, D-05, D-06, A3, A5 — B22-003, B24-003, B25-003, B46-021,
  B46-025/-027/-031/-032/-033/-036, B23-005.
- **Scope:** Replace `force-static` mock routes with authenticated, `schoolId`-scoped
  completion/ranking; classify `leaderboards` (+ 8 other `primary.ts` tables) in
  `tenant-registry.ts` to make tenant-coverage green; add Zod to `recordActivity`/
  `updateLessonProgress`; introduce a games `activityType`/`gameType` enum; bound `xpEarned`.
- **Acceptance signal:** `pnpm --filter @reading-advantage/domain test -- tenant-coverage` green;
  leaderboards scoped per school.
- **Note:** B46 records that the tenant-registry omission is **inherited** from the
  `primary_advantage_drizzle_migration_20260526` port, not introduced by games work.

### T3. Internationalization + embeddable navigation
- **Addresses:** D-07, D-09, A4 — B22-001/-008/-017/-030..033, B36-001/-002, B20-032/-036/-040/-046,
  B27-007, B27-010, B29-004, B31-001, B21-039.
- **Scope:** Wire pages to `useScopedI18n` (the `en.ts` tree already exists — B42-242); remove
  hardcoded `/en/` and Thai/English literals; replace `window.location.href` exits and absolute
  app links with host-provided navigation callbacks.
- **Acceptance signal:** games render in non-en locales and embed without absolute navigation.

### T4. Establish a shared games package / single runtime
- **Addresses:** D-08, D-11, A6 — B00-014/-015, B29-001, B33-011, B46-008, B23-009.
- **Scope:** Consolidate duplicated primitives (`basePath` ×2, `VirtualDPad`, `RankingDialog`),
  normalize the content response shape (`{vocabulary}` vs `{sentences}`), pick one canonical
  vocab-game builder skill. Extract reusable game runtime so Reading/Primary import one source.
- **Acceptance signal:** one `basePath`, one DPad, one content response contract, one builder skill.

---

## Tier 2 — Correctness & Quality

### T5. Fix non-functional / scoring-bug games
- **Addresses:** §B — B04-044 (labyrinth start never called; abyssal ReferenceError),
  B04-022/-024 (dungeon-liberator), B02-043/B37-019 (castle-defense), B30-001/-002/-006
  (archers/dragon-*), B32-001/-002/-003 (rune-match/wizard), B29-002/-021 (storm-castle),
  B43-041/-054 (potion-rush/rpg-battle), B38-010/B15-019 (dead difficulty).
- **Scope:** Per-game fixes for crashes, dead mechanics, broken difficulty, and
  scoring miscounts identified in the matrix.

### T6. Difficulty system unification
- **Addresses:** A2 — B38-004/-009/-010/-013, B21-018, B31-002, B12 theme, B35-032.
- **Scope:** Adopt the canonical `difficulty.ts` tier table + guardrail across all games;
  reconcile adaptive-difficulty mutation with "standardized preset" compliance specs;
  align leaderboard difficulty keys.

### T7. Accessibility & age-appropriate UX baseline
- **Addresses:** A8 — B00-017/-018, B28-052, B14-013, B29-007, B21-009.
- **Scope:** Canvas text-layer/ARIA alternatives, contrast, reduced-motion, guaranteed mute,
  16px minimum text, keyboard-operable controls.

### T8. Performance & mobile/browser hardening
- **Addresses:** A7 — B00-020, B02-016, B29-003, B00-022, B20-021/-022.
- **Scope:** Drive animation from central tick (not per-component timers); fix Konva
  gradient/SVG-url fills; fullscreen iOS fallback; multi-browser e2e against exported build.

---

## Tier 3 — Process / Tooling

### T9. Test integrity uplift
- **Addresses:** C-13, C-14, C-15, test-gaps — B21/B22/B28 over-mocking, B45/B46 e2e smoke-only,
  B43-017/-031/-060 template/test drift.
- **Scope:** Assert scoring/`onComplete`/win-lose in unit+e2e; fix the canonical template;
  de-duplicate e2e helpers; include e2e specs in `tsc`.

### T10. CI & repo hygiene
- **Addresses:** C-05, C-06, C-07, C-17 — B00-001..004, B46-017/-019, B25-023.
- **Scope:** pnpm-correct CI with `working-directory` and correct export path; lint/type/test
  gate before deploy; build-only on PR; move screenshots out of `public/`; fix favicon.

### T11. Agent-skill & Measure-artifact cleanup
- **Addresses:** C-01..C-04, C-08..C-12, C-16, C-18 — B00-005/-006/-007/-013/-027,
  B15/B19/B20 metadata + over-claim, B35-054 JSDoc.
- **Scope:** Gate/segregate off-architecture skills; fix `/conductor/` → `measure/` and commit
  templates; reconcile compliance-audit metadata with reality; add JSDoc to exports.

---

## Duplicated-Code / Reusable-Package Opportunities (Phase 3 input)

- `basePath` (two modules: `src/lib/basePath.ts` + `src/lib/games/basePath.ts`) — B00-014.
- `VirtualDPad` (multiple divergent copies) — B29-001, B33-011.
- `RankingDialog` / leaderboard UI — B26, B30.
- `calculateXP` (two implementations) — B20-039.
- E2E helpers (24× copy-paste) — B46-014.
- Two vocab-game builder skills — B00-015.

These are the strongest candidates for extraction into a shared `packages/`-level games runtime
to enable single-source import into Reading and Primary.

---

## Disposition

- These tracks are **proposals**. None has been created or executed.
- No remediation is claimed. **Phase acceptance and closeout are PENDING** and belong to the
  Measure workflow owner.
