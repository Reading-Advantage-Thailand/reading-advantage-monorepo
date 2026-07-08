# Tech Stack

## Core Framework
*   **Framework:** Next.js 15 (App Router)
*   **Language:** TypeScript

## Styling and UI
*   **Styling:** Tailwind CSS
*   **Component Library:** shadcn/ui (following the main app's convention)
*   **Icons:** Lucide React (standard with shadcn/ui)

## Animation and State Management
*   **Animation:** Framer Motion (for high-quality UI transitions and game effects)
*   **Canvas Rendering:** See **Rendering Tiers** below.
*   **State Management:**
    *   **React State/Context:** For simple, component-level game state.
    *   **Zustand:** For more complex global state or shared game logic (aligned with main project patterns).

## Rendering Tiers

Added 2026-07-08 (track: r3f_rendering_tier_20260708). Every game commits to exactly one
rendering tier at track creation time (see the "Rendering Stack" decision step in
`.claude/skills/vocab-game-builder/SKILL.md`).

### Tier 1 — React-Konva (2D, the default)
*   **Stack:** `konva` + `react-konva`.
*   **Use for:** Flat gameplay — boards, lanes, side/top views, match/tap/drag mechanics.
*   **Rule:** Faking 3D in Konva (manual perspective projection, depth-scaled sprites) is
    **disallowed**. The original Konva Abyssal Well proved this dead-ends: no real camera,
    depth sorting, or lighting, and every effect becomes bespoke trigonometry. If a game
    needs depth, it is a Tier 2 game.

### Tier 2 — React Three Fiber (3D / 2.5D)
*   **Stack:** `three`, `@react-three/fiber`, `@react-three/drei`,
    `@react-three/postprocessing` (runtime); `@react-three/test-renderer`, `@types/three` (dev).
*   **Use for:** Real 3D (camera moving through space, tube/corridor shooters, flight) and
    2.5D (fixed perspective or orthographic camera, billboarded sprites, parallax depth).
*   **Physics:** `@react-three/rapier` is the approved physics engine but is **deferred** —
    do not install until a game actually needs physics simulation.

### Rules for all R3F games
*   **Pure logic + thin render layer:** Game state and tick logic live in deterministic,
    dependency-injected TS modules under `src/lib/games/` (injectable RNG, no three.js
    imports) — identical to the Konva-game architecture. The R3F layer only projects that
    state into the scene graph.
*   **Bundle isolation:** R3F games are loaded with `next/dynamic` (`ssr: false`). 2D game
    routes must never pull three.js into their client bundles.
*   **Testing:** Logic modules are tested with plain Jest; the render layer is tested with
    `@react-three/test-renderer` (scene-graph assertions, no GPU required). Coverage target
    is the same >80% as Konva games.
*   **Mobile performance budget:** Portrait 390×844 reference; device pixel ratio capped at
    2 (`dpr={[1, 2]}`); low-poly/stylized geometry; `instancedMesh` for repeated objects;
    prefer `meshBasicMaterial`/few lights over full PBR lighting rigs.

## Development and Deployment
*   **Package Manager:** npm or pnpm (to be determined by environment)
*   **Linting:** ESLint
*   **Formatting:** Prettier
