# Specification: R3F 3D Rendering Tier

## Overview

**Sprint Goal:** Establish React Three Fiber as a production-ready 3D/2.5D rendering tier
alongside React-Konva, proven by a fully compliant R3F rewrite of The Abyssal Well, with a
documented stack-selection decision gate in the game creation workflow and a seeded pipeline
of 3D game candidates.

This track is additive: React-Konva remains the standard for 2D games. R3F becomes the
sanctioned option for games needing real 3D or 2.5D (perspective/orthographic camera)
rendering. All shared platform components — start/end screens, GameEndScreen, vocabulary
(`VocabularyItem`) and sentence (`SentenceItem`) contracts, XP calculation patterns,
`useGameFullscreen`, `useAccessibilitySettings`, i18n/session hooks, API route factories —
are reused unchanged. The pure-logic-module architecture (deterministic TS in
`src/lib/games/` with injectable RNG) is mandatory for R3F games exactly as for Konva games.

## Stories

### Story S1: Adopt the R3F stack
**As a** game developer on advantage-games
**I want** three/@react-three/fiber/@react-three/drei (+ postprocessing, test-renderer)
installed and documented in the tech stack
**So that** 3D games can be built on a sanctioned, React-idiomatic rendering tier

**Acceptance Criteria:**
- Given the monorepo catalog conventions, When dependencies are added, Then `three`,
  `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` are runtime deps
  and `@react-three/test-renderer` + `@types/three` are dev deps, and `pnpm build` passes.
- Given `measure/tech-stack.md`, When updated, Then it documents the two-tier rendering
  policy (Konva = 2D default, R3F = 3D/2.5D), the pure-logic + thin-render-layer rule, the
  per-game `next/dynamic` loading requirement (2D games must not pay the three.js bundle
  cost), a mobile performance budget (low-poly, capped pixel ratio, instancing), and
  `@react-three/rapier` as the approved-but-deferred physics choice.
- Given a minimal R3F smoke-test component, When rendered with
  `@react-three/test-renderer` under Jest, Then scene-graph assertions pass without a GPU.

**Estimate:** M
**Priority:** Must

### Story S2: Rewrite The Abyssal Well in R3F
**As a** student playing the Tempest-style tube shooter
**I want** the game rendered with a real 3D perspective camera
**So that** the tube, depth, and motion read as genuine 3D instead of flat projected circles

**Acceptance Criteria:**
- Given the existing route for Abyssal Well, When the rewrite ships, Then the R3F version
  replaces the Konva version at the same route and the Konva render component is deleted.
- Given the existing pure logic module (`src/lib/games/abyssalWell.ts` + config), When the
  render layer is rewritten, Then the logic module is reused (lane/depth state model
  unchanged), retyped from `VocabularyItem` to `SentenceItem` (closing the open tech-debt
  item for this game), and all existing logic tests still pass.
- Given the shared platform contracts, When the game runs, Then start screen, game end
  screen, XP calculation, fullscreen, accessibility settings, i18n/session, and the
  existing API route behave identically to other compliant games.
- Given the 25 shared game specifications, When the compliance checklist is run, Then all
  25 pass, and overall coverage for the game's files is >80%.
- Given a mid-range mobile device in portrait (390×844 reference), When playing, Then the
  game holds a stable frame rate with capped device pixel ratio and instanced/low-poly
  geometry.

**Estimate:** L
**Priority:** Must

### Story S5: Pedagogically sound cycling gameplay with smooth motion
**As a** student practicing sentence construction
**I want** to determine the word order myself from the translation, with smooth
Tempest-like motion around the tunnel
**So that** the game tests my reading comprehension instead of telling me the answer,
and feels fluid to play

_Added 2026-07-08 after Phase S2 user verification: the original rules (random spawn
order + breach damage + highlighted target) were contradictory and leaked the answer._

**Acceptance Criteria:**
- Given a sentence, When the game starts, Then all its words spawn at once at random
  angles and staggered depths, and no UI element indicates which word is next — the
  student derives order from the translation alone.
- Given a word reaches the rim, When it breaches, Then it wraps harmlessly to the deep
  end and climbs again slightly faster each lap (no life loss on breach).
- Given the player shoots a word, When it is the correct next word, Then it is collected
  and the built-so-far sentence in the HUD grows; When it is a wrong word, Then a life is
  lost (3 mistakes = defeat) and the word survives; When the shot hits nothing, Then only
  accuracy/XP suffers.
- Given input, When the player holds ←/→ (A/D) or the left/right touch zones, Then the
  ship rotates smoothly and continuously around the rim (continuous angle, not lane
  snapping), and hits are resolved by angular proximity.
- Given the rewrite, Then logic stays in the pure deterministic module (injectable RNG),
  coverage stays >80%, and the 25-spec compliance still passes.

**Estimate:** M
**Priority:** Must

### Story S3: Stack-selection gate in the game creation workflow
**As a** developer starting a new game track
**I want** the game creation workflow to force an explicit Konva-vs-R3F decision
**So that** each game is built on the stack that fits it instead of defaulting to Konva

**Acceptance Criteria:**
- Given `.claude/skills/vocab-game-builder/SKILL.md`, When the Discovery Phase runs, Then
  it includes a "Rendering Stack" decision step with concrete criteria (camera/depth needs,
  lighting, 3D motion → R3F; flat/board/lane 2D → Konva; faking 3D in Konva is explicitly
  disallowed, citing the original Abyssal Well as the cautionary lesson).
- Given the skill's architecture/scaffolding sections, When a game chooses R3F, Then the
  skill provides the R3F equivalents (Canvas setup, pure-logic + thin-render rule, drei
  helpers, test-renderer patterns) mirroring the Konva guidance.
- Given `measure/lessons-learned.md`, When the track completes, Then it records the
  "don't fake 3D in a 2D canvas" lesson.

**Estimate:** S
**Priority:** Must

### Story S4: R3F game candidates brainstorm and seeded tracks
**As a** product owner planning future games
**I want** a candidates document plus seeded stub tracks for the strongest ideas
**So that** the new 3D tier has a concrete pipeline of games that exploit it

**Acceptance Criteria:**
- Given the track directory, When the brainstorm completes, Then it contains
  `r3f-game-candidates.md` listing (a) new 3D/2.5D game concepts and (b) existing
  weak/poorly-implemented or unimplemented games worth rebuilding in R3F, each with a
  one-paragraph stack-fit rationale, vocabulary/sentence mechanic, and rough size.
- Given `measure/tracks.md`, When the doc is approved, Then the top 2–3 candidates are
  seeded as unstarted stub track entries linking to the candidates doc.

**Estimate:** S
**Priority:** Should

## Non-Functional Requirements

- 2D game routes must show no bundle-size regression (three.js loaded only via
  `next/dynamic` on 3D game routes).
- All new code passes ESLint, `tsc --noEmit`, and Prettier; >80% coverage on new modules.
- Mobile-first portrait orientation (390×844 reference) preserved.

## Out of Scope

- Installing `@react-three/rapier` (documented as approved-but-deferred; installed when a
  game first needs physics).
- Building any of the brainstormed candidate games (future tracks).
- Migrating any other existing Konva game to R3F.
- Changes to shared packages (`@reading-advantage/ui`, `domain`, etc.) or the main app.
- Multiplayer/WebSocket changes.
