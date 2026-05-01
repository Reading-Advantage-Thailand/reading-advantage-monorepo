# Track: Griffin Sky-Joust `any` Type Fix

## Issue
Line 151 of `GriffinSkyJoustGame.tsx` uses `any` type for event parameter in `handleFlap` callback.

```typescript
const handleFlap = useCallback((e?: any) => {
```

This violates TypeScript best practices and reduces type safety.

## Solution
Replace `any` with proper Konva event type or `undefined`.

## Files Affected
- `src/components/games/sentence/griffin-sky-joust/GriffinSkyJoustGame.tsx`

## Acceptance Criteria
- [ ] Replace `e?: any` with proper type annotation
- [ ] All TypeScript checks pass
- [ ] Build succeeds
- [ ] Unit tests pass
