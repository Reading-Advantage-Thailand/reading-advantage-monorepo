# Plan — Primary UX Rework

Owner lane: C. Edits to `globals.css`, nav, and `packages/ui` belong to this lane only.
Other lanes request changes here and do not edit these files.

## Phase 0: Screen inventory and audit (2 h)
- [x] List every route with a screenshot at 375/768/1280 (agents, vision review) — 50 routes in `measure/qa/browser-2026-10-05/phase0/inventory.json`; PNGs kept out of Git
- [x] Rank problems per screen: broken, confusing, ugly — see [audit.md](audit.md) sections 1-2
- [x] Choose the order of screens by student traffic — see [audit.md](audit.md) section 3

## Phase 1: Foundation
- [ ] Tokens and fonts (FR-1)
- [ ] `packages/ui` additions and the codemod for overlapping components (FR-2)
- [ ] Navigation (FR-3)
- [ ] Page shell, skip link, landmarks (FR-7 base)

## Phase 2: Student
- [ ] Student home (FR-4)
- [ ] Read list and article view
- [ ] Lesson flow shell (steps shown as a progress rail)
- [ ] Games catalog, vocabulary, sentences, history, reports, assignments

## Phase 3: Teacher
- [ ] Shell and dashboard
- [ ] My-classes, roster, assignments, reports, student-progress layouts

## Phase 4: Quality
- [ ] States: loading, empty, error on every screen
- [ ] Accessibility pass with axe and a keyboard walk-through
- [ ] i18n keys and the locale toggle
- [ ] Sound set and mute
- [ ] README cleanup

## Gates
- [ ] Vision QA sweep at three widths, no Critical/High
- [ ] Visual baselines recorded
