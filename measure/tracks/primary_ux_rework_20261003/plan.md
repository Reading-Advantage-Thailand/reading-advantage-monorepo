# Plan — Primary UX Rework

Owner lane: C. Edits to `globals.css`, nav, and `packages/ui` belong to this lane only.
Other lanes request changes here and do not edit these files.

## Phase 0: Screen inventory and audit (2 h) — done in `7d4905521`
- [x] List every route with a screenshot at 375/768/1280 (agents, vision review) — 50 routes in `measure/qa/browser-2026-10-05/phase0/inventory.json`; PNGs kept out of Git
- [x] Rank problems per screen: broken, confusing, ugly — see [audit.md](audit.md) sections 1-2
- [x] Choose the order of screens by student traffic — see [audit.md](audit.md) section 3

## Phase 1: Foundation
- [ ] Tokens and fonts (FR-1)
- [ ] `packages/ui` additions and the codemod for overlapping components (FR-2)
  - New package exports: Button `glow` variant, `StatusChip` (+ `statusChipVariants`), `ShimmerSkeleton`, `cardHoverClassName`, `PageTransition`, `AnimatedCounter`.
  - Replaced with `@reading-advantage/ui` (local file deleted): alert, alert-dialog, avatar, checkbox, label, separator, skeleton.
  - Kept local (API differs; full replacement is the Semester 2 `primary_package_alignment` track):
    - badge: `active`/`inactive`/`expired` variants in use (license table, article creation).
    - button: `accept`/`reject` variants in use (article creation).
    - card: `CardAction` export and a different padding model (`py-6` card, `px-6` parts) that 61 files rely on.
    - dialog: `closeButtonShow` prop in use (assign button).
    - input: forms rely on the `aria-invalid` error style; local `text-base` below `md` stops iOS zoom on focus.
    - progress: package indicator is fixed `neutral-900` and `h-4`; local bars use the brand primary and `h-2`.
    - tabs: local trigger is `flex-1` with an icon gap; the sign-in tabs rely on it.
    - tooltip: local `Tooltip` adds its own provider; `copy-button` uses it without a provider (the package `Tooltip` needs one).
- [ ] Navigation (FR-3)
- [ ] Page shell, skip link, landmarks (FR-7 base)

### Phase 1 decisions (coordinator, after the Phase 0 audit)
- Primary color is brand-700 `#047d36` for buttons and text on white (5.3:1). Tutor brand-500 `#06c755` is for large decorative fills only. The cyan logo text (1.8:1) uses `text-primary`.
- `--font-sans` is a Thai-first `next/font` stack: Noto Sans Thai (Thai subset), then Inter. Quicksand (articles) and Cabin Sketch (logo) also load through `next/font`.
- The account menu trigger becomes a real `<button>` with an accessible name.
- Below 1024 px the bottom bar replaces the stacked sidebar. The leaderboard leaves the nav column.
- `<main>` loses `overflow-hidden`; wide tables scroll in their own container.
- Not in Phase 1: the article-page and flashcard data bugs (Phase 2). Owner items: Google Classroom import, default locale `en`, email fields (labels only).

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
