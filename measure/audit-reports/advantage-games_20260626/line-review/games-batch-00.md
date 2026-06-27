# Line-by-Line Review — `games-batch-00`

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-00`
**Reviewer model:** ark-code-latest (Doubao-Seed-Code)
**Date:** 2026-06-27
**Scope:** Read-only line review. No source code was edited.
**File list source:** `/tmp/opencode/games-batch-00` (20 entries)

> This batch consists almost entirely of **agent skill documentation** (`.md`/`SKILL.md`),
> one **bash helper script**, two **LLM reference dumps**, and **one CI workflow YAML**.
> There is essentially **no runtime game source code** in this batch. Findings therefore
> center on documentation accuracy, drift against the actual `advantage-games` codebase,
> guidance correctness (performance/mobile/accessibility/scoring), and CI/build readiness.
> Findings that require reading actual game components (`src/components/games/**`),
> stores, or API factories are **out of scope for this batch** and noted under Limitations.

---

## Files Reviewed (20/20)

| # | File | Lines | Type | Verdict |
|---|------|-------|------|---------|
| 1 | `apps/advantage-games/.agents/skills/add-3d-assets/SKILL.md` | 191 | Skill doc | Off-architecture (3D pipeline vs Konva platform) |
| 2 | `apps/advantage-games/.agents/skills/fetch-tweet/SKILL.md` | 91 | Skill doc | Irrelevant to game readiness |
| 3 | `apps/advantage-games/.agents/skills/promo-video/SKILL.md` | 358 | Skill doc | Phaser-targeted; mismatched engine |
| 4 | `apps/advantage-games/.agents/skills/promo-video/scripts/convert-highfps.sh` | 40 | Bash | Minor robustness gaps |
| 5 | `apps/advantage-games/.agents/skills/qa-game/SKILL.md` | 139 | Skill doc | Phaser/Vite-targeted; mismatched test stack |
| 6 | `apps/advantage-games/.agents/skills/review-game/SKILL.md` | 100 | Skill doc | Monetization focus, not education |
| 7 | `apps/advantage-games/.agents/skills/threejs-game/SKILL.md` | 292 | Skill doc | Off-architecture; some good a11y/perf gaps |
| 8 | `apps/advantage-games/.agents/skills/threejs-game/core-patterns.md` | 210 | Skill doc | Reference code only |
| 9 | `apps/advantage-games/.agents/skills/threejs-game/input-patterns.md` | 120 | Skill doc | Accessibility gaps |
| 10 | `apps/advantage-games/.agents/skills/threejs-game/reference/llms-full.txt` | 2716 | Reference dump | Vendored doc; staleness risk |
| 11 | `apps/advantage-games/.agents/skills/threejs-game/reference/llms.txt` | 158 | Reference dump | Vendored doc; staleness risk |
| 12 | `apps/advantage-games/.agents/skills/threejs-game/tsl-guide.md` | 43 | Skill doc | Reference only |
| 13 | `apps/advantage-games/.agents/skills/vocab-game/SKILL.md` | 404 | Skill doc | **Most relevant**; several drift/contract issues |
| 14 | `apps/advantage-games/.agents/skills/vocab-game/conventions.md` | 370 | Skill doc | Import-path drift; a11y gaps |
| 15 | `apps/advantage-games/.agents/skills/vocab-game/reference/game-logic.md` | 384 | Skill doc | Scoring/XP correctness concerns |
| 16 | `apps/advantage-games/.agents/skills/vocab-game/reference/konva-patterns.md` | 339 | Skill doc | Syntax error + perf/a11y gaps |
| 17 | `apps/advantage-games/.agents/skills/vocab-game/templates/README.md` | 107 | Skill doc | Broken markdown + stale paths |
| 18 | `apps/advantage-games/.claude/skills/vocab-game-builder/SKILL.md` | 839 | Skill doc | **Most relevant**; Conductor/Measure + path drift |
| 19 | `apps/advantage-games/.github/workflows/next-static-site.yml` | 52 | CI YAML | Monorepo build assumptions broken |
| 20 | `apps/advantage-games/.claude/skills/vocab-game-builder/SKILL.md` (dup listing context) | — | — | (file #18; line 19 of list is `.claude/skills/vocab-game-builder/SKILL.md`) |

> Note: the manifest's line 19 is `.claude/skills/vocab-game-builder/SKILL.md` and line 20
> is `.github/workflows/next-static-site.yml`. Both are reviewed above (rows 18 and 19).
> The table row 20 is a clarification, not a 21st file. All 20 manifest entries are covered.

---

## Severity Legend

- **CRITICAL** — Blocks game readiness / build / integration, or actively misleads agents into shipping broken or unsafe games.
- **HIGH** — Significant correctness, contract, security, or accessibility problem likely to cause defects.
- **MEDIUM** — Drift, ambiguity, or quality issue that will cause friction or inconsistent games.
- **LOW** — Minor/cosmetic, doc hygiene, or staleness risk.

---

## Findings

### CI / Build Readiness

#### F-GAMES-B00-001 — CI workflow uses `npm ci` in a pnpm monorepo (HIGH)
`apps/advantage-games/.github/workflows/next-static-site.yml:33-35`
The workflow sets `cache: npm` and runs `npm ci`. The monorepo is pnpm-based
(`AGENTS.md` documents `pnpm install`, `pnpm turbo`, and a pnpm lockfile at root).
`npm ci` requires a `package-lock.json`; in a pnpm workspace this will either fail
(no lockfile) or install a divergent dependency tree, breaking reproducible static
export. There is also no `working-directory:` set, so the job runs at repo root, not
in `apps/advantage-games`, meaning `npm run build` will not target this app.

#### F-GAMES-B00-002 — Static-export artifact path `out` likely wrong for monorepo app (HIGH)
`apps/advantage-games/.github/workflows/next-static-site.yml:44-49`
`npm run build` then `upload-pages-artifact path: out` assumes the Next.js export lands
in `./out` at the runner CWD. For a monorepo app the export is `apps/advantage-games/out`.
Combined with F-GAMES-B00-001 (no `working-directory`), the artifact upload will fail or
upload an empty/incorrect directory. `next.config.ts` confirms `output: "export"`, so the
export dir matters and must be path-correct.

#### F-GAMES-B00-003 — `pull_request` trigger deploys to the single `pages` concurrency group (MEDIUM)
`apps/advantage-games/.github/workflows/next-static-site.yml:8,16-18,50-52`
The job both builds and `deploy-pages` on every `pull_request`, sharing
`concurrency: group: pages`. PR builds attempting a Pages deploy to the
`github-pages` environment will contend with `master`/`main` deploys and can publish
unreviewed PR content or fail on environment protection rules. PR runs should build-only.

#### F-GAMES-B00-004 — No lint/type-check/test gate before deploy (MEDIUM)
`apps/advantage-games/.github/workflows/next-static-site.yml:26-52`
The workflow goes straight from install → build → deploy. There is no
`pnpm turbo run lint check-types test` gate. Per `AGENTS.md` the CI gate
`pnpm turbo run test` must pass; this workflow ships a static site without running the
game logic tests (which exist, e.g. `src/lib/games/api/*.test.ts`).

---

### Architecture / Engine Mismatch (Game Readiness)

#### F-GAMES-B00-005 — 3D/Three.js skills contradict the platform's mandated Konva architecture (HIGH)
`apps/advantage-games/.agents/skills/add-3d-assets/SKILL.md:18-191`,
`threejs-game/SKILL.md:32-128`, `worldlabs/SKILL.md:13-318`
`apps/advantage-games/AGENTS.md` mandates: "React-Konva canvas architecture,
Mobile-first, portrait orientation (390×844), strict TDD." These three skills describe a
completely different stack: Three.js + Vite + plain JS, `src/core/Game.js`, `npm`,
WebGL/WebGPU, GLB pipelines, Meshy/World Labs. An agent loading these for an
advantage-games task would produce a game that cannot be imported into Reading/Primary
(which expect `VocabularyItem[]` → `{xp, accuracy}` React components). These skills appear
to be vendored from an unrelated "OpusGameLabs" game-creator pipeline (`author: OpusGameLabs`)
and create a real risk of architectural divergence. Recommend gating/segregating them or
clearly marking them non-applicable to advantage-games game builds.

#### F-GAMES-B00-006 — Promo-video & qa-game skills assume Phaser + Vite + global hooks not present here (HIGH)
`promo-video/SKILL.md:17,49-114,242-267`, `qa-game/SKILL.md:24-60`
Both skills hard-assume Phaser (`window.__GAME__`, `Phaser.Game`, `scene.tweens.timeScale`,
`GameScene.js`, `vite.config.js`, `src/main.js`) and Playwright test infra. The
advantage-games app is Next.js + React-Konva with Jest/RTL and `next.config.ts`
(`output: "export"`), no Phaser, no `window.__GAME__`, no `GameScene.js`. Following
`qa-game` would scaffold a parallel Playwright suite divorced from the existing Jest tests
and the `vocab-game` TDD contract (Jest + RTL, >80% coverage). This is misleading for
test quality and QA of the actual games.

#### F-GAMES-B00-007 — `review-game` scores "Monetization Readiness / Play.fun SDK" instead of education fit (MEDIUM)
`review-game/SKILL.md:61-84`
The review rubric grades "Monetization Readiness," "Anti-cheat," and "Play.fun integration"
as first-class criteria, with zero criteria for vocabulary learning outcomes, XP/accuracy
contract, `GameStartScreen`/`GameEndScreen` usage, i18n, or age-appropriate UX. For an
educational platform, a "review-game" pass could green-light a game that is monetization-ready
but pedagogically and contractually non-compliant. The Play.fun "75px safe zone"
(`threejs-game/SKILL.md:179-209`, `konva-patterns.md:332-338`) is foreign to this product.

#### F-GAMES-B00-008 — `fetch-tweet` skill has no relationship to game readiness (LOW)
`fetch-tweet/SKILL.md:1-91`
This is a social-media scraping utility (fxtwitter API). It is harmless but irrelevant to
advantage-games. Its presence in the app's `.agents/skills` inflates the skill surface and
risks mis-triggering. No game-readiness impact; flagged for inventory hygiene.

---

### Scoring / XP / Difficulty Correctness

#### F-GAMES-B00-009 — Documented XP formula penalizes accuracy twice and ignores `score` (HIGH)
`vocab-game/SKILL.md:323-329`, `game-logic.md:131-135,378-382`, verified against
`apps/advantage-games/src/lib/games/xp.ts:1-13`
`calculateXP(score, correctAnswers, totalAttempts)` ignores `score` entirely and returns
`floor(correctAnswers * accuracy)`. This means XP scales with the **square-ish** of
performance (correct × correct/total), so a learner who answers 8/10 gets 6 XP while one
who answers 10/10 gets 10 XP — but a learner answering 4/4 (perfect, small set) gets only 4
XP versus 6 XP for 8/10. XP is **not monotonic in mastery** and is biased toward longer
sessions / larger attempt counts, which is questionable for an education product and
inconsistent across games of different lengths. Additionally the `score` parameter being
accepted-but-unused is a latent bug magnet (callers think score matters). This is the
shared XP contract that flows into Reading/Primary import, so the inconsistency is
portability-relevant. Recommend the track verify intended XP semantics against
`measure/product.md`.

#### F-GAMES-B00-010 — `createChoice` decoy selection can still equal the correct term (MEDIUM)
`game-logic.md:151-171`
`createChoice` guards `decoyIdx === correctIdx` only when `vocabulary.length > 1`, but it
selects decoy by **index**, not by value. If the vocabulary list contains duplicate terms
or duplicate translations (common in real flashcard data), the decoy translation can equal
the correct translation, producing an unsolvable/ambiguous choice. No dedupe-by-content is
documented. Importing real Reading/Primary vocabulary (which is not guaranteed unique) would
expose this.

#### F-GAMES-B00-011 — `findMatches` assumes a non-empty, rectangular grid (MEDIUM)
`game-logic.md:323-353`
`const cols = grid[0].length` throws if `grid` is empty, and the double loop assumes every
row has equal length. `createGrid` (lines 299-313) can produce a 0×N grid if `rows===0`.
No guard. For a match-3 vocab game seeded from a small/odd vocabulary set this can crash at
runtime. Documentation propagates this fragile pattern as a recommended reference.

#### F-GAMES-B00-012 — Win/lose "design intent" guidance is sound but not reflected in vocab-game skill (MEDIUM)
`qa-game/SKILL.md:63-92` (good: "player must not win by doing nothing") vs
`vocab-game/SKILL.md:372-385` and `conventions.md:357-370` checklists, which contain **no
lose-condition reachability check**. The mandated Konva builder path therefore lacks the
strongest correctness gate that the (mismatched) Phaser qa-game skill recommends. The good
"non-negotiable lose-state" assertion should be ported into the vocab-game TDD checklist.

---

### Importability into Reading / Primary

#### F-GAMES-B00-013 — Referenced integration guide `docs/reading-advantage-integration.md` does not exist (HIGH)
`vocab-game/SKILL.md:386-404` ("See `docs/reading-advantage-integration.md` for the complete
guide" and Reference Files table). Verified: `apps/advantage-games/docs/` directory does not
exist; the file is missing. The export-to-reading-advantage path — the entire reason these
games matter to the monorepo — points at a dead reference. The five "Key steps" (lines
390-396) are the only surviving guidance and they describe a **Prisma + next-connect
EdgeRouter** target, which conflicts with the monorepo's stated Drizzle direction
(`AGENTS.md`: "Some apps still use Prisma (migrating to Drizzle)"). Integration guidance is
both missing and partially stale.

#### F-GAMES-B00-014 — Import-path drift between skill files for shared screens / basePath (HIGH)
`vocab-game/SKILL.md:124-125,140` vs `conventions.md:41-44,175`
SKILL.md imports `GameStartScreen`/`GameEndScreen` from `@/components/games/game/...` and
`withBasePath` from `@/lib/games/basePath`. conventions.md imports the same screens from
`@/components/game/...` (no `games/`) and `withBasePath` from `@/lib/basePath`. The repo has
**both** `src/lib/basePath.ts` and `src/lib/games/basePath.ts`, and the shared screens
actually live at `src/components/games/game/` (verified). conventions.md's
`@/components/game/GameStartScreen` path is wrong and will fail to resolve. Conflicting
canonical paths across the two most-used skills will produce inconsistent, sometimes-broken
games and harden the wrong import in copied code.

#### F-GAMES-B00-015 — Two competing "vocab game" skills with divergent contracts (MEDIUM)
`vocab-game/SKILL.md` (`.agents/skills`, version 3.0.0, author AdvantageGames) vs
`vocab-game-builder/SKILL.md` (`.claude/skills`). Both claim to be the way to build vocab
games but differ on workflow (one references templates + factories; the other a full
Conductor TDD lifecycle), on directory hints, and on import paths. `AGENTS.md` for the app
names `vocab-game-builder` as primary, yet `vocab-game` is richer on the actual
contracts. Two sources of truth → drift and inconsistent games. Recommend designating one
canonical and cross-linking.

#### F-GAMES-B00-016 — Game-completion / leaderboard contract is undocumented for real backend (MEDIUM)
`vocab-game/SKILL.md:204-225` (`createCompleteRoute`, `createRankingRoute`) and
`vocab-game-builder/SKILL.md:776-783`
Completion and ranking routes are documented only as `force-static` **mock** factories.
There is no documentation of the authenticated, `schoolId`-scoped completion/leaderboard
contract the games must satisfy once imported into Reading/Primary (multi-tenant scoping is
mandatory per root `AGENTS.md`). Games built to the mock contract will have no server-side
score validation or tenant scoping, which is both a correctness and a security gap at
integration time. (See also F-GAMES-B00-007: anti-cheat is mentioned only in the
monetization-flavored review skill.)

---

### Accessibility & Age-Appropriate UX

#### F-GAMES-B00-017 — No accessibility guidance for canvas/Konva games (HIGH)
`vocab-game/SKILL.md` (whole), `conventions.md` (whole), `konva-patterns.md` (whole),
`vocab-game-builder/SKILL.md:652-670`
The vocab-game skills enforce touch-target size (44×44px) and min text size (16px) — good —
but contain **zero** guidance on: screen-reader support, ARIA/text alternatives for
canvas-rendered vocabulary (Konva renders to `<canvas>` with no DOM semantics), color-contrast
requirements, captions/visual cues for audio, reduced-motion support, or keyboard focus
order for the start/end screens. For an education product serving young learners (and likely
subject to school accessibility requirements), a canvas-only game with no text-layer fallback
is largely inaccessible to assistive tech. The `reading-advantage-qa` skill explicitly covers
"accessibility (ARIA)" — these builder skills do not align with that QA expectation.

#### F-GAMES-B00-018 — Audio mute is mandated for Three.js but not for the Konva vocab games (MEDIUM)
`threejs-game/SKILL.md:289` ("Mute toggle … `isMuted` state is respected") vs
`vocab-game/SKILL.md:138` (only mentions `useSound` import) and the vocab-game pre-ship
checklists (SKILL.md:372-385, conventions.md:357-370) which omit any mute/volume requirement.
For young learners and classroom use (shared spaces), a guaranteed mute control is an
age-appropriate UX requirement; it is missing from the mandated Konva path.

#### F-GAMES-B00-019 — Input guidance lacks keyboard accessibility for action button on touch (LOW/MEDIUM)
`conventions.md:122-166`, `input-patterns.md:74-117`
The unified input docs cover Arrows/WASD/Space/Enter for keyboard and DPad/VirtualDPad for
touch, but there is no guidance ensuring the DPad/action controls are reachable via keyboard
`Tab`/`Enter` (they are described as overlay `<div>`s in `konva-patterns.md:281-302` with no
`role`/`tabIndex`/`aria-label`). Touch-only controls without keyboard/AT equivalents fail
basic operability. Mild because keyboard movement exists, but the discrete "cast/action"
affordance on mobile-styled controls is not keyboard/AT-annotated.

---

### Performance / Mobile / Browser Compatibility

#### F-GAMES-B00-020 — `useAnimatedSprite` / `FloatingText` / `useParticles` create per-instance timers & rAF with setState in loop (MEDIUM)
`konva-patterns.md:74-101` (interval per sprite), `105-153` (rAF + setState per floating
text), `157-191` (`updateParticles` setState every frame)
The recommended patterns spin up a `setInterval` per animated sprite and a
`requestAnimationFrame` loop with `setState` per floating-text instance. On mobile with
many entities this causes many independent timers/rAF loops and frequent React reconciliation
in the hot path — the opposite of the "object pooling / minimize per-frame allocation"
advice the Three.js skill gives (`threejs-game/SKILL.md:216`). For a >10-moving-object Konva
game (the stated threshold, `vocab-game/SKILL.md:79`) this will drop frames on low-end school
devices. The reference patterns should drive animation from the central game tick, not
per-component timers.

#### F-GAMES-B00-021 — Asset loaders in skills swallow/ignore errors → blank-screen risk on flaky networks (MEDIUM)
`vocab-game/SKILL.md:296-303` (`image.onerror = reject` with no fallback),
`conventions.md:179-203` (`if (!assets) return null` — renders nothing forever on failure),
`conventions.md:340-355` (asset failure just `console.error`)
The documented loading pattern renders `null` indefinitely if any image fails (`return null`
before assets resolve), with no timeout, retry, or user-facing error/loading state. On
school networks / GitHub Pages base-path mistakes this yields a permanent blank canvas with
no feedback. The error-handling section acknowledges this ("Optionally set error state") but
the primary pattern shown does not implement it. Browser-compat note: `new Image()` without
`crossOrigin` handling is fine for same-origin static export but undocumented for any CDN
asset case.

#### F-GAMES-B00-022 — `useGameFullscreen` mandated for all games but Fullscreen API support/permission is browser-variable (LOW/MEDIUM)
`vocab-game-builder/SKILL.md:670-692`
Fullscreen on game start is marked "Required for All Games." The Fullscreen API is
unsupported / behaves differently on iOS Safari (no element fullscreen for non-video on many
versions) and can be blocked outside a user gesture. The skill shows entering fullscreen in
`onStart` (a gesture — good) but gives no fallback/feature-detection guidance for browsers
that reject the request, risking inconsistent layout on the platform's primary device class
(mobile Safari). No graceful-degradation note.

#### F-GAMES-B00-023 — Responsive `ResizeObserver` pattern reads `entries[0]` without guarding empty/zero size (LOW)
`vocab-game/SKILL.md:253-260`, `conventions.md:289-297`, `konva-patterns.md:21-31`
The pattern destructures `entries[0].contentRect` with no guard for `entries.length === 0`
or initial `0×0` (display:none / pre-layout). A 0-width Stage can produce NaN-scaled cameras
(`vocab-game-builder/SKILL.md:708-723` divides by/uses dimensions). Minor but reproducible on
mount and orientation change.

#### F-GAMES-B00-024 — `convert-highfps.sh` lacks ffmpeg/bc presence checks and quotes (LOW)
`promo-video/scripts/convert-highfps.sh:20,25-30`
Uses `bc` (`OUTPUT_FPS=$(echo "25 / $FACTOR" | bc)`) with no check that `bc` exists (not
installed by default on many minimal CI images), and no check that `ffmpeg`/`ffprobe` exist
(the SKILL warns to check, but the script does not). Integer division by `bc` also drops the
fractional FPS silently. Non-blocking (promo tooling), hence LOW, but the script can fail
opaquely. Paths are quoted correctly; `set -euo pipefail` is good.

---

### Documentation Hygiene / Drift

#### F-GAMES-B00-025 — `templates/README.md` contains broken markdown and truncated sentences (LOW)
`vocab-game/templates/README.md:9` (`| runner, |` stray comma/empty cell),
`:24` ("The will:" — missing subject), `:29` (stray ```` ``` ```` closing fence with no
opener), `:41` ("Each gate shows term,3. Correct gate…" — concatenated list items)
Multiple copy/format errors reduce trust and could be pasted into generated docs. Cosmetic.

#### F-GAMES-B00-026 — `konva-patterns.md` `useResponsiveStage` has a TypeScript syntax error (MEDIUM)
`konva-patterns.md:17`
`export function useResponsiveStage(aspectRatio = number = 16/9): StageDimensions {` is not
valid TS (`= number =` is a typo for `: number = 16/9`), and the function returns
`{ containerRef, dimensions }` (line 33) while the declared return type is `StageDimensions`
(only `{width,height}`), and `aspectRatio` is never used. An agent copying this reference
verbatim ships code that won't compile. Reference snippets that don't type-check undermine
the TDD/quality bar.

#### F-GAMES-B00-027 — `vocab-game-builder` references a `/conductor/` tree that does not exist; repo uses `measure/` (MEDIUM)
`vocab-game-builder/SKILL.md:54-56,235-255,331-336,496-566,571-578,832-839`
The skill instructs creating tracks under `/conductor/tracks/...`, archiving to
`/conductor/archive/...`, and reading `/conductor/workflow.md`, `/conductor/product.md`,
etc. Verified: there is no `/conductor` directory and no app-level `conductor/` dir; the
monorepo standard (root and app `AGENTS.md`) is the **Measure** framework under `measure/`.
Following this skill would create an orphaned `/conductor` tree outside the Measure workflow,
contradicting `apps/advantage-games/AGENTS.md` ("All development runs through the Measure
… framework exclusively"). Commit-message templates here (`conductor(plan): …`,
`feat([game-name]): …`) also omit the mandatory `(track_id: …)` reference required by the
repo commitlint hook (root `AGENTS.md`).

#### F-GAMES-B00-028 — Vendored Three.js `llms-full.txt` / `llms.txt` are version-pinned and will go stale (LOW)
`threejs-game/reference/llms.txt:21-22`, `llms-full.txt:21-22` (pinned `three@0.183.0`)
A 2716-line vendored reference dump pins a specific Three.js version and duplicates the
opening of `llms.txt`. No provenance/date/update mechanism is recorded, so it will silently
drift from upstream and from `threejs-game/SKILL.md`'s own `three@^0.183.0` claim. Staleness
/ maintenance risk only (and only relevant if the off-architecture 3D skills are used at all
— see F-GAMES-B00-005).

#### F-GAMES-B00-029 — Test pattern imports `jest` incorrectly (LOW)
`game-logic.md:362`
`import { describe, it, expect } from 'jest'` is not how Jest globals are accessed (they are
ambient globals, or imported from `@jest/globals`). Importing from `'jest'` fails. A copied
test stub won't run, undercutting the "tests must pass" gate. Minor since most game tests use
ambient globals, but the reference is wrong.

#### F-GAMES-B00-030 — Skill metadata claims "Tested & working" examples not present in this app (LOW)
`worldlabs/SKILL.md:106,263-271` ("see `examples/worldlabs-arcade/` for a complete runnable
demo"), `add-3d-assets/SKILL.md:66-70` (`3d-character-library/`)
These reference example directories and asset libraries that are part of the external
game-creator plugin, not the advantage-games app. Claims of "tested & working" are unverifiable
in this repo and mislead readers into expecting bundled examples. Inventory/provenance issue.

---

## Cross-Cutting Observations (non-defect)

- **Positive:** `vocab-game/conventions.md` and `vocab-game-builder/SKILL.md` codify a clean
  pure-function game-logic separation (`lib/games/*.ts`), an explicit `{xp, accuracy}`
  contract, mandatory `reset()` for restart-safety, 44px/16px UX minimums, and a
  delta-time `requestAnimationFrame` loop with delta clamping (`vocab-game-builder` 350-376) —
  all good for game readiness and testability.
- **Positive:** The `qa-game` "Design Intent" section (lines 63-92) articulates a strong,
  non-negotiable lose-condition reachability test that *should* be adopted by the Konva path
  (see F-GAMES-B00-012).
- **Positive:** `threejs-game/SKILL.md` performance rules (delta cap, pixel-ratio cap,
  pooling, shadow/postprocessing-off defaults) are sound and worth mirroring into the Konva
  perf guidance, which currently lacks an equivalent consolidated perf checklist.
- **Shared-runtime concern:** Two `basePath` modules, two shared-screen path conventions, and
  two competing vocab-game skills indicate the "shared runtime" for games is **not yet
  singular**. This is the root cause behind several MEDIUM/HIGH drift findings and is the most
  important systemic theme for the track to resolve.

---

## Limitations

1. **Batch is documentation-heavy.** 18 of 20 files are skill docs / reference dumps, 1 is a
   bash script, 1 is CI YAML. There is **no actual game component, store, or API factory
   source** in this batch. Findings about real scoring/leaderboard/progress/difficulty
   *runtime* behavior could only be partially validated by spot-reading
   `src/lib/games/xp.ts` and confirming file existence; the games themselves
   (`src/components/games/**`, `src/lib/games/*.ts`) are out of scope here and must be
   reviewed in their own batches.
2. **Cross-reference checks were targeted, not exhaustive.** I verified existence of
   `xp.ts`, the api factory dir, both `basePath` modules, shared screens, the referenced
   hooks/components, `next.config.ts` output mode, and the absence of `docs/` and
   `/conductor/`. I did not run the build, tests, lint, or the CI workflow; CI findings
   (F-GAMES-B00-001..004) are by static reading of the YAML against documented monorepo
   conventions.
3. **No execution / no Playwright / no browser matrix testing** was performed; mobile,
   fullscreen, and browser-compat findings are derived from the documented patterns, not
   from device/browser runs.
4. **XP semantics (F-GAMES-B00-009)** are flagged as a correctness/portability concern based
   on the formula's mathematical properties; I did not have access to `measure/product.md`
   intent for XP in this batch to confirm whether the non-monotonic behavior is intentional.
5. **No acceptance, closeout, or sign-off is asserted by this report.** This is a line-review
   artifact only; it does not certify the batch, the skills, or any game as
   ready/accepted/closed. Disposition of findings remains with the track owner.

---

## Findings Summary

| Severity | Count | IDs |
|----------|-------|-----|
| CRITICAL | 0 | — |
| HIGH | 8 | 001, 002, 005, 006, 009, 013, 014, 017 |
| MEDIUM | 13 | 003, 004, 007, 010, 011, 012, 015, 016, 018, 020, 021, 026, 027 |
| LOW | 9 | 008, 019, 022, 023, 024, 025, 028, 029, 030 |

> Note: F-GAMES-B00-016/-019/-022 are noted as spanning a severity boundary in their
> finding text; each is counted once at the higher listed tier. Totals: 8 + 13 + 9 = 30.

**Total findings:** 30 (`F-GAMES-B00-001` … `F-GAMES-B00-030`).
**Files covered:** 20/20.
**Source code edited:** none.
