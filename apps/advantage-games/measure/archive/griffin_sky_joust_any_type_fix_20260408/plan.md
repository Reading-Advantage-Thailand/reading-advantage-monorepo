# Plan: Griffin Sky-Joust `any` Type Fix

## Task Status Markers
- `[ ]` - Pending
- `[~]` - In Progress
- `[x]` - Completed

---

## Phase 1: Fix `any` Type

### Task 1.1: Replace `any` with proper type
**File:** `src/components/games/sentence/griffin-sky-joust/GriffinSkyJoustGame.tsx`  
**Line:** 151

- [x] Replace `const handleFlap = useCallback((e?: any) => {` with proper Konva event type
- [x] Update usage within function if needed

**Implementation:**
```typescript
import type { KonvaEventObject } from 'konva/lib/Node'
// ...
const handleFlap = useCallback((e?: KonvaEventObject<MouseEvent | TouchEvent>) => {
```

---

## Phase 2: Verify

- [x] Run `npm run typecheck` - verify no errors
- [x] Run `npm run build` - verify build succeeds
- [x] Run `npm test -- --testPathPattern="griffin-sky-joust"` - verify tests pass (unit tests pass, build succeeds)

---

## Phase 3: Finalize

- [x] Commit changes
- [x] Update tech-debt.md to mark issue as resolved
