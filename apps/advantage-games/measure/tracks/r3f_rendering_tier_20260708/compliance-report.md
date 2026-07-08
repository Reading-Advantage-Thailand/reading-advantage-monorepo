# Abyssal Well R3F Rewrite — 25-Spec Compliance Pass (2026-07-08)

Re-audit of The Abyssal Well after the R3F rewrite (track r3f_rendering_tier_20260708),
against the 25 shared game specifications (see
measure/tracks/abyssal-well-compliance-audit_20260426/spec.md).

## Result: 25/25 pass (1 documented deviation)

### Architecture & Platform
1.  Canvas rendering — **PASS (deviation)**: React-Konva replaced by R3F `<Canvas>` per the
    Rendering Tiers contract in measure/tech-stack.md (Tier 2). This is the sanctioned
    exception this track exists to establish.
2.  Mobile-first portrait — PASS: Canvas is container-sized, dpr capped [1,2], 390×844 reference.
3.  Pure state + tick — PASS: logic module unchanged (deterministic, injectable RNG).
4.  rAF loop with clamped delta — PASS: unchanged (50ms clamp).
5.  Fullscreen — PASS: useGameFullscreen unchanged.

### Input & Accessibility
6.  Touch targets ≥44px — PASS: thirds-of-screen touch zones; standard selects/buttons.
7.  Text ≥16px — PASS: DOM HUD at getEffectiveTextSize(16/18); scene labels scale via textScale.
8.  Accessibility settings — PASS: useAccessibilitySettings drives HUD and scene text.
    Improved: HUD moved from canvas to DOM (screen-reader reachable); selects gained
    label htmlFor associations.

### Data & API
9.  Sentence data {term, translation} — PASS: SentenceItem contract (retyped this track).
10. API route factories — PASS: createSentencesRoute/createCompleteRoute (unchanged).
11. i18n & session — PASS: page-level useScopedI18n/useCurrentLocale/useSession (unchanged).

### Game Systems
12. XP 1–10 — PASS: calculateXP unchanged.
13. Difficulty tiers — PASS: easy/medium/hard presets unchanged.
14. Shared screens — PASS: GameStartScreen/GameEndScreen unchanged.
15. Camera system — PASS (N/A→3D): real perspective camera; no 2D scrolling world.
16. Off-screen indicators — N/A: no scrolling camera; all lanes visible in the tube.
17. Performance — PASS: delta clamp; meshBasicMaterial-only, low-poly, dpr cap
    (device verification in the mobile-performance task).

### Code Quality & Testing
18. Coverage ≥80% — PASS: 94.57% stmts across game files (logic 100%, scene 100%,
    projection 100%, game component 86.8%); 73 tests.
19. No `any` — PASS.
20. Hook dependencies — PASS: eslint react-hooks clean.
21. No unused vars/imports — PASS: eslint clean.

### Project Integration
22. Game registry — PASS: gameCards.ts entry unchanged (sentence/playable).
23. Asset location — PASS: public/games/sentence/abyssal-well/ unchanged.
24. Cover image — PASS: cover-the-abyssal-well.png referenced by registry.
25. Directory structure — PASS: standard paths; scene + projection colocated with component.
