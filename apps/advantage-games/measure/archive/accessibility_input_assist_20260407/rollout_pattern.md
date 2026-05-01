# Accessibility Integration Rollout Pattern

## Overview

This document describes how to integrate `useAccessibilitySettings` into new games.

## Integration Steps

### 1. Import the Hook

```typescript
import { useAccessibilitySettings } from '@/hooks/useAccessibilitySettings'
```

### 2. Initialize in Component

```typescript
const { getEffectiveTouchTarget, getEffectiveTextSize } = useAccessibilitySettings()
```

### 3. Apply Touch Target Scaling

For scaling UI components (VirtualDPad, buttons):

```typescript
// For CSS transform scaling (VirtualDPad)
const touchTarget = getEffectiveTouchTarget(128) // base size in pixels
<div style={{ transform: `scale(${touchTarget / 128})`, transformOrigin: 'bottom right' }}>
  <VirtualDPad onInput={setVirtualInput} />
</div>

// For inline size scaling (buttons)
const touchTarget = getEffectiveTouchTarget(56) // base button size
<button
  style={{
    width: touchTarget,
    height: touchTarget,
  }}
>
  CAST
</button>
```

### 4. Apply Text Scaling

For text elements, use `getEffectiveTextSize` to get the scaled font size in pixels:

```typescript
const textScale = getEffectiveTextSize(16) // base font size in pixels
<h1 style={{ fontSize: `${textScale * 1.875}rem` }}>Title</h1>
<span style={{ fontSize: `${textScale * 0.75}rem` }}>Subtitle</span>
```

## Scaling Formulas

| Pattern | Formula |
|---------|---------|
| Touch Target (CSS transform) | `scale(getEffectiveTouchTarget(base) / base)` |
| Touch Target (inline) | `width/height: getEffectiveTouchTarget(base)` |
| Text Size | `fontSize: getEffectiveTextSize(base)` |

## Game-Type Specific Guidelines

### Vocabulary Games (e.g., WizardZombieGame)
- Apply text scaling to: game title, subtitle, button labels, instruction text
- Apply touch target scaling to: CAST button, VirtualDPad

### Sentence Games (e.g., DungeonLiberatorGame)
- Apply touch target scaling to: VirtualDPad (via CSS transform)
- Text scaling optional based on game UI

## Testing

Run accessibility tests after integration:
```bash
npx jest src/hooks/useAccessibilitySettings.test.ts --verbose
```

## File Locations

- Hook: `src/hooks/useAccessibilitySettings.ts`
- Types: `src/types/accessibility.ts`
- Tests: `src/hooks/useAccessibilitySettings.test.ts`
