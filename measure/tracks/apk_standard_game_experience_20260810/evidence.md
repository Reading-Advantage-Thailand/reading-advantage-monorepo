# S2 first browser pass — 2026-08-20

Agent used Kimi WebBridge on the live Advantage Games public arcade.

Route: `http://localhost:3018/en/student/arcade/dragon-flight`

## Observed

1. The briefing opened with title, objective, Thai/English learning items, and controls.
2. Start guided tutorial opened the real Dragon Flight cartridge.
3. Status text was `Guided tutorial ready`.
4. Step 1 of 2 showed `See how feedback helps` and `action:select-incorrect`.
5. Pause, Next, Replay, and Skip controls were present.
6. Preview mode stated that progress is not saved.

## Screenshots

- `evidence/s2-tutorial-compact.jpg`
- `evidence/s2-tutorial-wide.jpg`

## Boundary

This is the first agent browser pass. Product-owner manual verification remains later.

---

# Wizard vs Zombie art fix — 2026-08-22

Fixes the near-black ground and sliced crypt/grave distortion. Ground overlay reduced from 0.58 to 0.18, crypt/grave sizes corrected to preserve source aspect (tower 32x80 -> 64x160, grave 48x64 -> 72x96), orb and player scales increased to match visible bbox (orb 52->68, player 88->104). Board now shows contiguous brown grave dirt, correctly proportioned crypt pillars and gravestones, and scaled mage/skeleton/crystal.

## Screenshots

- Briefing compact: `evidence/wvz-briefing-compact.jpg` (390x844)
- Briefing wide: `evidence/wvz-briefing-wide.jpg` (1440x900)
- Board compact: `evidence/wvz-art-fix-compact.jpg` (390x844 page, 960x540 canvas)
- Board wide: `evidence/wvz-art-fix-wide.jpg` (1440x900 page, 960x540 canvas)
- Canvas compact: `evidence/wvz-art-fix-canvas-compact.jpg` (960x540)
- Canvas wide: `evidence/wvz-art-fix-canvas-wide.jpg` (960x540)

Direct capture via `/dev/wvz-capture` in playing mode (same cartridge/edition as public arcade) after verifying `CI=true vitest` and `tsc --noEmit` green. Ground now reads brown (avg 58,42,27) not near-black, crypts retain 0.4 aspect, graves 0.75 aspect, no anisotropic stretch.
