# Advantage Games — Executive Summary (`executive-summary.md`)

> **Track:** `advantage_games_review_20260626`
> **Parent:** `monorepo_feature_review_masterplan_20260626`
> **Baseline SHA:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> **Scope:** `apps/advantage-games` (+ selected shared ranking/import schema in `packages/db`, `packages/domain`)
> **Status:** Synthesis of a completed read-only line-by-line review. **No source code was edited. No remediation was performed. Phase acceptance and closeout are explicitly PENDING.**

---

## 1. What Was Reviewed

A line-by-line review of the Advantage Games platform — the reusable educational game engine
intended for import into Reading Advantage and Primary Advantage.

| Metric | Value |
|--------|-------|
| In-scope files | **929** |
| Review batches | **47** |
| Batch reports produced | **47** |
| Total report lines | **11,231** |
| Distinct line-anchored findings | **1,749** (`F-GAMES-B00-001` … `F-GAMES-B46-039`) |
| Implemented games | **26** (16 sentence, 10 vocabulary) + 3 catalog placeholders |
| Source code edited | **None** |

Every finding in this synthesis points to a **source batch ID** whose report holds the
authoritative wording and line anchors.

---

## 2. Headline Assessment

**No implemented game is currently ready for import into Reading or Primary.** All 26 games are
**NOT-READY** or **AT-RISK** because they inherit a set of shared-runtime blockers. The platform's
individual games are largely playable in isolation, but the *shared runtime* and *import surface*
are not yet production- or embed-ready.

The five highest-leverage systemic issues (each spanning many games):

1. **No enforceable completion/scoring contract.** Completion routes trust client-supplied XP with
   no validation (B25-001, CRITICAL), `onComplete` fires repeatedly causing duplicate scores
   (B28-017, CRITICAL; B30-002), several games fabricate `correctAnswers`/`totalAttempts`
   (B21-001…), and 5+ payload shapes exist with inconsistent accuracy units. No single Zod schema
   can validate the routes.

2. **Multi-tenant leaderboard import is unsafe.** Core ranking tables have no `schoolId`, the
   `leaderboards` table has a nullable `schoolId` and is unregistered, and the
   `tenant-coverage` CI gate is currently **red** (B46-021/-025/-026/-036). Host progress
   mutations lack Zod and trust `lessonId` across tenants (B46-031/-032/-033).

3. **Mock-only API layer.** Completion/ranking routes are `force-static` mocks with no
   persistence, auth, or tenant scoping; leaderboards are localStorage-only and never wired to
   `/complete` (B22-003/-007, B24-003, B25-003).

4. **Internationalization is largely absent.** Hardcoded `/en/` paths and mixed Thai/English
   literals throughout block multilingual host import, even though a comprehensive `en.ts`
   translation tree already exists but is unused (B36-001, B22-001, B42-242).

5. **The shared runtime is not yet singular.** Duplicated `basePath`, `VirtualDPad`, XP math, and
   two competing builder skills mean the games are not a single reusable package (B00-014/-015,
   B29-001, B20-039).

---

## 3. Severity Distribution (advisory)

| Severity | Approx. count | Where concentrated |
|----------|---------------|--------------------|
| CRITICAL | ~10 | Non-functional shipped games (B04), client-trusted XP (B25), duplicate completion (B28), broken canonical template & drifted tests (B43) |
| HIGH | ~150 | Import contract, scoring integrity, i18n, dead difficulty, leaderboard tenancy |
| MEDIUM | ~600 | Contract drift, mock routes, test shallowness, a11y |
| LOW / INFO | ~990 | Doc hygiene, staleness, brittle-test coupling |

Counts are aggregated from per-batch severity tables and are **advisory, not an acceptance gate**.

---

## 4. Per-Game Picture

- **NOT-READY (game-specific blocker on top of shared blockers):** labyrinth-goblin-king (never
  starts), abyssal-well (start crash), dungeon-liberator (zero tests + field bug), castle-defense
  (scoring miscount), storm-castle-tower (broken difficulty), dragon-flight/dragon-rider
  (duplicate completion), archers-revenge (invalid difficulty + 404 nav), rune-match (dead
  mechanic), wizard-vs-zombie (lost-run + non-determinism), griffin-sky-joust/gryphon-patrol
  (dead difficulty), rpg-battle (global mutable state), potion-rush (pool desync + test drift),
  alchemists-synthesis (silent placeholder vocab).
- **AT-RISK (playable, blocked only by shared-runtime + minor game issues):** devourer-slime,
  griffin-riders-escape, haunted-library (best-behaved on counts), realm-carver,
  rune-forge-chamber, shadow-gate-dungeon, spellweavers-run, village-guardian, enchanted-library,
  magic-defense, paladins-twin-soul.

Full rows with status, blockers, test coverage, mobile/a11y, and import readiness are in
`game-readiness-matrix.md`.

---

## 5. Import-Contract Gaps (explicit)

Eleven gaps (D-01 … D-11 in `findings.md` §D) block embedding into Reading/Primary, including: no
shared completion contract, client-trusted/unbounded XP, mock non-persistent API, leaderboard
tables lacking a tenant key, no validated activity/game-type enum, unvalidated host mutations,
English-only navigation, divergent content response keys, hardcoded SPA navigation, a dead
integration guide, and duplicated primitives. These are the gating items for any import work.

---

## 6. Recommended Next Steps (proposals only)

`migration-tracks.md` proposes 11 follow-on tracks. The import-blocking Tier 1:
- **T1** Unify completion/scoring contract (Zod, single XP, fire-once `onComplete`).
- **T2** Real tenant-safe persistence + leaderboard (classify tables → green CI; Zod host mutations).
- **T3** i18n + embeddable navigation.
- **T4** Shared games package / single runtime.

None of these tracks has been created or started.

---

## 7. Artifacts Produced (this synthesis)

| File | Purpose |
|------|---------|
| `line-review-synthesis.md` | Deduplicated clusters (A/B/C) with batch IDs |
| `00-inventory.md` | Coverage metrics, roster, module/test/import inventory |
| `game-readiness-matrix.md` | Readiness row per implemented game |
| `workflow-map.md` | Runtime/data-flow map anchored to findings |
| `checklist.md` | Spec-criteria + per-surface coverage |
| `findings.md` | Consolidated findings register incl. §D import-contract gaps |
| `migration-tracks.md` | Proposed remediation tracks |
| `test-gaps.md` | Consolidated testing gaps |
| `executive-summary.md` | This document |

---

## 8. Explicit Non-Claims

- **No remediation has been done.** Every finding is an OPEN review input.
- **No batch, phase, track, or game is certified** ready, accepted, verified, or closed.
- Findings sourced from docs/specs reflect contracts, not always observed runtime; only one
  targeted test (`tenant-coverage`, result red) was executed across the entire review.
- **Phase acceptance and closeout remain PENDING**, and belong to the Measure workflow owner.
