# Technical Debt

## Resolved (all audited games)
- fullscreen, accessibility, text sizes, calculateXP, difficulty naming, API factories, i18n/session, hook deps, unused imports, component tests, assets.

## Remaining
- VocabularyItem[] vs SentenceItem[] naming consistency (Griffin Riders Escape, Gryphon Patrol, Village Guardian). Abyssal Well resolved 2026-07-08 (track r3f_rendering_tier_20260708).

---

## Village Guardian Compliance Audit (2026-04-26)

### Resolved
- useGameFullscreen, useAccessibilitySettings, text sizes, API factories, useSession/useScopedI18n, hook deps, unused imports, component tests, asset dir, lint

### Remaining
- None

---

## Dungeon Liberator Compliance Audit (2026-04-26)

### Resolved
- rAF loop, text sizes, SentenceItem typing, API factories, useSession, calculateDungeonLiberatorXP, difficulty tiers, asset dir, tests, lint

### Remaining
- None

---

## Shadow Gate Dungeon Compliance Audit (2026-04-26)

### Resolved
- fullscreen, accessibility, text sizes, API factories, useSession/useScopedI18n, hook deps, component tests, asset dir, lint

### Remaining
- None

---

## Rune Forge Chamber Compliance Audit (2026-04-26)
- Resolved: accessibility labels, test mocks, lint
- Remaining: None

---

## Babel Architect Phaser Exemplar (2026-07-08)

### Resolved
- Full implementation: logic module, Phaser adapter/scene, React shell, API routes, page, tests, asset manifest, catalog playable (27 tests, 0 lint errors).

### Remaining
- Preferred asset-pack (Pixel Crawler by Anokolisa) ingestion not done; visuals are code-generated placeholders behind a stable manifest.
- Browser/e2e smoke test deferred; Phaser requires a real DOM so manual verification is pending.
- Keyboard input supports number keys 1-9 only; arrow-key navigation not wired.
