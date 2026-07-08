# Implementation Plan: R3F 3D Rendering Tier

Track: r3f_rendering_tier_20260708

## Phase S1: Adopt the R3F stack
_Story ref: spec.md#story-s1_

- [~] Task: Define rendering-tier contract in tech-stack.md
    - [ ] Add "Rendering Tiers" section: Konva = 2D default, R3F = 3D/2.5D option
    - [ ] Document pure-logic + thin-render-layer rule for R3F games
    - [ ] Document per-game `next/dynamic` loading requirement (no three.js on 2D routes)
    - [ ] Document mobile perf budget (low-poly, DPR cap ≤2, instancing, portrait 390×844)
    - [ ] Document `@react-three/rapier` as approved-but-deferred physics choice
- [ ] Task: Install R3F dependencies
    - [ ] Add `three`, `@react-three/fiber`, `@react-three/drei`,
          `@react-three/postprocessing` to dependencies (catalog: where available)
    - [ ] Add `@react-three/test-renderer`, `@types/three` to devDependencies
    - [ ] Verify `pnpm install` and `pnpm build` pass
- [ ] Task: Write failing smoke test for R3F test harness (Red)
    - [ ] Test: minimal scene renders under `@react-three/test-renderer` in Jest,
          scene-graph assertions (mesh present, position/props correct)
    - [ ] Add any required Jest config/mocks (WebGL/canvas) to jest.config.ts / jest.setup.ts
- [ ] Task: Implement R3F smoke component to pass tests (Green)
    - [ ] Create `src/components/games/r3f/SmokeScene.tsx` (or equivalent) minimal component
    - [ ] Confirm tests pass without a GPU; document harness pattern in a code comment
- [ ] Task: Verify quality gates for Phase S1
    - [ ] `pnpm lint`, `pnpm check-types`, `CI=true pnpm test` all pass
- [ ] Task: Measure - User Manual Verification 'Phase S1: Adopt the R3F stack' (Protocol in workflow.md)

## Phase S2: Rewrite The Abyssal Well in R3F
_Story ref: spec.md#story-s2_

- [ ] Task: Retype Abyssal Well logic contract to SentenceItem
    - [ ] Write/adjust failing tests asserting `SentenceItem[]` input typing (Red)
    - [ ] Change `abyssalWell.ts` / `abyssalWellConfig.ts` from `VocabularyItem` to
          `SentenceItem`; all existing logic tests pass (Green)
    - [ ] Mark the Abyssal Well line of the VocabularyItem/SentenceItem tech-debt item resolved
- [ ] Task: Write failing render-layer tests for R3F Abyssal Well (Red)
    - [ ] Scene-graph tests via @react-three/test-renderer: tube geometry, lane positions,
          enemy meshes track logic-state depth, projectile meshes, camera setup
    - [ ] Component tests: start screen, HUD (lives/sentence/target word), game end screen,
          fullscreen + accessibility hooks wired, i18n/session mocks
- [ ] Task: Implement R3F render layer (Green)
    - [ ] Create `AbyssalWellScene` (R3F Canvas: perspective camera into the well, lane
          geometry, enemy/projectile meshes, drei Text for words, postprocessing bloom)
    - [ ] Rewrite `AbyssalWellGame.tsx` to compose scene + existing start/end screens,
          HUD, input handling (lane move + fire), rAF-driven tick of the pure logic module
    - [ ] Load the game via `next/dynamic` (ssr: false) at the existing route
    - [ ] Delete the Konva render code from the game component
- [ ] Task: Compliance and coverage pass
    - [ ] Run the 25-spec compliance checklist; fix any failures
    - [ ] Coverage >80% across the game's files
- [ ] Task: Mobile performance verification
    - [ ] DPR cap + low-poly/instanced geometry in place
    - [ ] Manual check at 390×844 portrait; stable frame rate on mid-range device/emulation
- [ ] Task: Verify quality gates for Phase S2
    - [ ] `pnpm lint`, `pnpm check-types`, `CI=true pnpm test` all pass
    - [ ] Confirm 2D game routes show no three.js in their client bundles (build output check)
- [ ] Task: Measure - User Manual Verification 'Phase S2: Rewrite The Abyssal Well in R3F' (Protocol in workflow.md)

## Phase S3: Stack-selection gate in the game creation workflow
_Story ref: spec.md#story-s3_

- [ ] Task: Define stack-decision criteria (acceptance draft)
    - [ ] Draft decision criteria: camera/depth/lighting/3D motion → R3F; flat/board/lane
          2D → Konva; faking 3D in Konva explicitly disallowed (Abyssal Well v1 lesson)
- [ ] Task: Update vocab-game-builder skill
    - [ ] Add "Rendering Stack" decision step to Discovery Phase in
          `.claude/skills/vocab-game-builder/SKILL.md`
    - [ ] Add R3F scaffolding guidance mirroring Konva sections (Canvas setup, pure-logic
          rule, drei helpers, test-renderer patterns, next/dynamic loading)
    - [ ] Cross-reference tech-stack.md Rendering Tiers section
- [ ] Task: Record lessons learned
    - [ ] Add "don't fake 3D in a 2D canvas" + R3F harness lessons to
          `measure/lessons-learned.md` (respect 50-line bound; condense old entries if needed)
- [ ] Task: Verify quality gates for Phase S3
    - [ ] Docs-only phase: verify skill file loads (front-matter valid), links resolve
- [ ] Task: Measure - User Manual Verification 'Phase S3: Stack-selection gate' (Protocol in workflow.md)

## Phase S4: R3F game candidates brainstorm and seeded tracks
_Story ref: spec.md#story-s4_

- [ ] Task: Audit existing games for R3F rebuild candidates
    - [ ] Review UNPUBLISHED-GAMES-REPORT.md and weak/unimplemented games for 3D fit
- [ ] Task: Write r3f-game-candidates.md
    - [ ] New 3D/2.5D concepts: each with stack-fit rationale, vocab/sentence mechanic,
          rough size (S/M/L)
    - [ ] Rebuild candidates from existing catalog with same rationale format
- [ ] Task: Seed follow-up tracks
    - [ ] Add top 2–3 candidates as unstarted stub entries in measure/tracks.md linking
          to the candidates doc
- [ ] Task: Verify quality gates for Phase S4
    - [ ] Docs-only phase: links resolve, tracks.md format consistent
- [ ] Task: Measure - User Manual Verification 'Phase S4: Candidates brainstorm' (Protocol in workflow.md)
