# Mobile Performance Baseline - 2026-04-08

## Hotspots Identified

### High Impact

| Game | Issue | Location | Impact |
|------|-------|----------|--------|
| wizard-vs-zombie | Math.random() in Layer render | WizardZombieGame.tsx:678 | Causes re-render every frame |
| All games | Multiple setState calls in game loop | Game components | 3-6 re-renders per tick |
| All games | DOM-based floating texts | Game components | Reflow on every update |
| All games | DOM-based indicators | Game components | Reflow on position change |

### Medium Impact

| Game | Issue | Location | Impact |
|------|-------|----------|--------|
| All games | VirtualDPad re-renders | VirtualDPad.tsx | Thumb position update triggers re-render |
| All games | Indicators as DOM elements | DungeonLiberatorGame.tsx:288-314 | Position updates cause reflow |
| dungeon-liberator | Trail ropePoints calculation | DungeonLiberatorGame.tsx:414-422 | Allocated on every render |
| All games | Missing useCallback on handlers | Multiple game components | New function refs on every render |

### Low Impact (Warnings)

| Game | Issue | Location | Impact |
|------|-------|----------|--------|
| All games | Unescaped entities in JSX | Multiple files | Lint warnings only |
| griffin-sky-joust | any type in game logic | griffin-sky-joust:94 | Type safety issue |

## Optimization Targets

### Frame Time
- Target: < 16.67ms per frame (60 FPS target)
- Warning threshold: > 20ms per frame (50 FPS minimum)
- Critical threshold: > 33ms per frame (30 FPS minimum)

### Memory Allocation Guardrails
- Game loop allocations: < 100 bytes per tick
- Render pass allocations: < 1KB per frame
- No new object allocation in hot paths (use object pooling)

### Render Budget
- Konva Stage: Max 2 layers
- DOM overlays: < 10 elements per game
- Total draw calls: < 50 per frame

## Priority Fixes

1. **VirtualDPad optimization** - Memoize handlers, use CSS transform only
2. **Remove Math.random() from render** - Pre-compute or use frame-based seed
3. **Batch state updates in game loops** - Use functional setState or single state object
4. **Memoize Konva component callbacks** - Prevent unnecessary re-renders