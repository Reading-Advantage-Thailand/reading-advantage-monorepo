# Advantage Games — Workflow Map (`workflow-map.md`)

> **Track:** `advantage_games_review_20260626`
> **Source:** 47 line-review batches. **Status:** Review input. No source edited. Acceptance/closeout **PENDING**.

This map traces the end-to-end runtime and data flows of the Advantage Games platform, anchoring
each stage to the batches and findings that reviewed it. It exists to show *where* the Class A
shared-runtime findings sit in the flow.

---

## 1. Player Session Flow (standalone gallery)

```
Gallery (gameCards.ts)
  → status: playable | coming-soon            [B36; hardcoded /en/ href: B36-001/-002]
  → /[locale]/(student)/student/games/{sentence|vocabulary}/<game>/page.tsx
        • resolves locale via use(params)      [page tests over-mock React.use: B21-045]
        • fetches content:
            GET /api/v1/games/<game>/{sentences|vocabulary}/route.ts
                - force-static MOCK            [B22-013, B23-010, B25-003, B37-001]
                - response key NOT normalized: {vocabulary} vs {sentences}  [B46-008]
        • dynamic import <GameComponent/>       [components out of page batch: B21/B22 limits]
  → GameComponent (Konva canvas)
        • InputController / VirtualDPad (DUPLICATED, no ARIA)  [B29-001, B29-007/-030, B33-011]
        • useGameLoop / rAF tick                [re-subscribes every frame: B29-011]
        • pure reducer in src/lib/games/<game>.ts  [difficulty often dead: B38-010, B15-019]
  → Win/Lose / End screen
        • GameEndScreen / ResultsScreen         [shared shell: B25–B27]
        • onComplete({xp, accuracy, ...})       [fires repeatedly: B28-017, B30-002]
                                                 [5+ payload shapes: B21-002 theme, B25]
  → POST /api/v1/games/<game>/complete/route.ts
        • createCompleteRoute() TRUSTS client XP, no Zod  [B25-001 CRITICAL, B25-002, B46-031]
        • force-static on a POST mutation (dead) [B23-005, B24-005]
        • no persistence, no schoolId            [B22-003, B24-003]
  → Leaderboard
        • localStorage only, NOT wired to /complete  [B22-007/-028/-029, B28-001]
        • GET /api/v1/games/<game>/ranking → always empty/frozen  [B23-004, B24-004/-021]
```

### Stage → batch coverage

| Stage | Modules | Batches | Dominant findings |
|-------|---------|---------|-------------------|
| Catalog | `lib/gameCards.ts` | B36 | hardcoded `/en/`, base-path mismatch (A4) |
| Page shell | `app/[locale]/.../page.tsx` | B20–B22 | fabricated counts, i18n, navigation (A1/A4) |
| Content API | `api/v1/games/*/{sentences,vocabulary}` | B22–B25, B37 | mock routes, key drift (A5) |
| Game runtime | `components/games/**`, `hooks/**` | B25–B35 | dead difficulty, dup `onComplete`, input a11y (A2/A6/A8) |
| Pure logic | `lib/games/*.ts` | B36–B41 | XP/difficulty inconsistency (A2) |
| Completion | `lib/games/api/completeRoute.ts`, `*/complete` | B25, B37 | client-trusted XP, no Zod (A1/A5) |
| Ranking | `lib/games/api/rankingRoute.ts`, `*/ranking` | B23–B24, B37 | empty/frozen leaderboard (A3) |

---

## 2. Scoring / XP Data Flow

```
in-game answer events
  → reducer increments correctAnswers / totalAttempts   [some games FABRICATE these: B21-001…]
  → calculateXP(...)
        • TWO implementations: @/lib/xp vs @/lib/games/xp  [B20-039]
        • fallback floor(correctAnswers * accuracy) double-counts accuracy  [B00-009, B43-074]
        • single-player cap 0–10  vs  multiplayer uncapped count-based     [B42-005/-026/-065]
  → onComplete payload
        • accuracy unit inconsistent: 0–1 vs ×100          [B21-037, B22-026]
  → POST /complete (client value trusted)                  [B25-001]
  → (host) recordActivity(xpEarned)                        [no Zod/bounds: B46-031]
        • writes to userActivity / xpLogs / gameRankings
```

**Integrity gaps:** fabricated counts (A1), duplicated XP math (A2), client-trusted writes
(A1/A5), unbounded host persistence (A3). No single Zod contract spans this flow.

---

## 3. Difficulty Flow

```
DifficultySelector UI  →  difficulty key ('easy'|'normal'|'hard'|'extreme' OR 'medium')
  → per-game config (*Config.ts)
        • canonical difficulty.ts table + guardrails EXIST  [B38]
        • but most games define own medium-based enums and NEVER call guardrail  [B38-004/-009/-010/-013]
        • some selectors are DEAD CODE (always medium / broken)  [B31-002, B15-019, B29-002]
  → adaptive-difficulty engine (optional)
        • mutates spawn/speed at runtime, conflicts with "standardized preset" specs  [B12 theme, B35-032]
```

---

## 4. Multiplayer Flow

```
LobbyScreen → useMultiplayerSocket (reconnect counter reset defeats maxRetries: B34-005/B35-004)
  → ws-server / room-manager / game-session / scoring-engine   [B42]
  → useMultiplayerGameState (optimistic word reconciliation, lossy heuristic: B34-008/-009/-010)
  → ScoreboardOverlay / PodiumScreen (presentational; no Zod at inbound boundary: B33-010/-020)
        • multiplayer XP scale non-comparable to single-player  [B42-005/-026]
```

---

## 5. Host Import Flow (Reading / Primary)

```
Advantage Game (built to MOCK contract)
  → must satisfy host:
        recordActivity / updateLessonProgress  (packages/domain/src/progress/mutations.ts)
            • NO Zod input/output, trusts lessonId, no xp bounds   [B46-031/-032/-033]
        analytics.ts / primary.ts schema
            • xpLogs/gameRankings have NO schoolId (REFERENTIAL)    [B46-021]
            • leaderboards: nullable schoolId + UNREGISTERED        [B46-025/-027]
        tenant-registry.ts
            • 9 primary.ts tables unclassified → tenant-coverage CI RED  [B46-026/-036]
  → activityType/gameType are free text, no enum incl. games       [B46-022/-030]
```

**Conclusion:** the import flow currently terminates at a mock contract on the game side and an
unvalidated, tenant-fragile persistence layer on the host side. See `findings.md` §Import-Contract
Gaps and `migration-tracks.md`.

---

## 6. Build / CI / Test Flow

```
CI: .github/workflows/next-static-site.yml
  → npm ci in a pnpm monorepo, no working-directory, wrong export path 'out'  [B00-001/-002]
  → deploy on every PR, no lint/type/test gate                                [B00-003/-004]

Tests:
  → Jest/RTL unit+component (over-mocked, scoring not asserted)   [B21/B22/B28]
  → Playwright e2e (chromium only, runs DEV not export build, smoke/screenshot only)  [B20-021/-022, B45/B46]
  → e2e specs excluded from tsc (no compile backstop)             [B46-019]
```

---

## 7. Notes

- This map is derived from the line-review batches; it was **not** produced by executing the
  app. Stages marked with mock/`force-static` reflect the code as reviewed statically.
- No stage is certified correct or complete. **Acceptance and closeout are PENDING.**
