# Plan — Primary UX Rework

Owner lane: C. Edits to `globals.css`, nav, and `packages/ui` belong to this lane only.
Other lanes request changes here and do not edit these files.

## Phase 0: Screen inventory and audit (2 h) — done in `7d4905521`
- [x] List every route with a screenshot at 375/768/1280 (agents, vision review) — 50 routes in `measure/qa/browser-2026-10-05/phase0/inventory.json`; PNGs kept out of Git
- [x] Rank problems per screen: broken, confusing, ugly — see [audit.md](audit.md) sections 1-2
- [x] Choose the order of screens by student traffic — see [audit.md](audit.md) section 3

## Phase 1: Foundation — done in `35a7c5b0f`..`df21a293e`
- [x] Tokens and fonts (FR-1) — `35a7c5b0f`
- [x] `packages/ui` additions and the codemod for overlapping components (FR-2) — `7590d9807`
  - New package exports: Button `glow` variant, `StatusChip` (+ `statusChipVariants`), `ShimmerSkeleton`, `cardHoverClassName`, `PageTransition`, `AnimatedCounter`.
  - Replaced with `@reading-advantage/ui` (local file deleted): alert, avatar, checkbox, label, separator, skeleton. (alert-dialog was replaced, then restored locally in Phase 2a; see below.)
  - Accepted look changes of the replaced files (Phase 2a, review L2):
    - alert: the icon sits at the top left (absolute), not in a grid column; the default fill is `bg-background` (was `bg-card`); the destructive variant gets a red border (was a card fill with red text); the title does not clamp to one line.
    - avatar: the default size is 40 px (was 32 px) where the call site sets no size.
    - checkbox: the border is the brand primary (was the input gray), `rounded-sm`, a 1 px focus ring (was 3 px); no `aria-invalid` red style and no dark-mode input fill.
    - label: no `flex gap-2` (an icon inside a label touches the text), disabled opacity 70 % (was 50 %), text can be selected.
    - separator: no visible change (1 px, border color).
    - skeleton: the fill is `bg-primary/10` (a light green tint) instead of the gray `bg-accent`.
    - alert-dialog: the package version is edge to edge with square corners below 640 px and has a light blurred overlay. Restored locally (M3).
  - Kept local (API differs; full replacement is the Semester 2 `primary_package_alignment` track):
    - alert-dialog (restored in Phase 2a, M3): at 375 px the package dialog has no side margin and no rounded corners. The local copy keeps `max-w-[calc(100%-2rem)] rounded-lg` and the `bg-black/50` overlay. The package default is not changed (other apps use it).
    - badge: `active`/`inactive`/`expired` variants in use (license table, article creation).
    - button: `accept`/`reject` variants in use (article creation).
    - card: `CardAction` export and a different padding model (`py-6` card, `px-6` parts) that 61 files rely on.
    - dialog: `closeButtonShow` prop in use (assign button).
    - input: forms rely on the `aria-invalid` error style; local `text-base` below `md` stops iOS zoom on focus.
    - progress: package indicator is fixed `neutral-900` and `h-4`; local bars use the brand primary and `h-2`.
    - tabs: local trigger is `flex-1` with an icon gap; the sign-in tabs rely on it.
    - tooltip: local `Tooltip` adds its own provider; `copy-button` uses it without a provider (the package `Tooltip` needs one).
- [x] Navigation (FR-3) — `d359ee876`
  - Bottom bar below 1024 px (glass, safe-area insets); sidebar from 1024 px. A menu button opens the full area menu in a sheet on phones, so pages that are not tabs stay reachable.
  - Student Home points to `STUDENT_HOME` (`/student/read`) until Phase 2 adds `/student/home`; Read wins the tie, so one tab is active. Teacher Home points to `/teacher/dashboard` (redirects to My Classes) until Phase 3.
  - Settings pages show the role navigation; School Profile shows only with `SCHOOL_ADMIN_ACCESS`.
  - The leaderboard sits below the page content (all widths) until Phase 2 moves it to the student home.
- [x] Page shell, skip link, landmarks (FR-7 base) — `df21a293e`
  - Open for Phase 3/4: `button-name` nodes on page-level icon buttons (admin students delete, roster and enrollment remove, add-teacher show password, article creation). The one-node `button-name` on `/`, student reports, teacher assignments, teacher reports, and student progress did not trace to a shell or shared component in a static review; it needs a browser axe run with selectors.

### Phase 1 decisions (coordinator, after the Phase 0 audit)
- Primary color is brand-700 `#047d36` for buttons and text on white (5.3:1). Tutor brand-500 `#06c755` is for large decorative fills only. The cyan logo text (1.8:1) uses `text-primary`.
- `--font-sans` is a Thai-first `next/font` stack: Noto Sans Thai (Thai subset), then Inter. Quicksand (articles) and Cabin Sketch (logo) also load through `next/font`.
- The account menu trigger becomes a real `<button>` with an accessible name.
- Below 1024 px the bottom bar replaces the stacked sidebar. The leaderboard leaves the nav column.
- `<main>` loses `overflow-hidden`; wide tables scroll in their own container.
- Not in Phase 1: the article-page and flashcard data bugs (Phase 2). Owner items: Google Classroom import, default locale `en`, email fields (labels only).

## Phase 2: Student
- [ ] Phase 1 review fixes (run 2a, task 0)
  - M1: one `--bottom-nav-h` token (`--bottom-nav-row` 3.5rem + `--safe-bottom`) sets the bottom bar height and the content bottom padding, lifts the go-to-top button (`lg:bottom-4`), and lifts toasts (`mobileOffset`, plus `--toast-offset-bottom` for 600-1023 px tablets; 24 px from 1024 px).
  - M2: `--font-sans` is Inter, then Noto Sans Thai.
  - M4: `@reading-advantage/ui/client` (tsup banner `"use client"`) serves `AnimatedCounter`; the root entry keeps every export from before Phase 1 plus the server-safe Phase 1 parts; `cardHoverClassName` is in `src/lib/card-hover.ts`. No other package component uses hooks (the Radix wrappers get `"use client"` from Radix).
  - M5: audio bar translation text is `text-primary-foreground` (`dark:text-primary`); the bar sits on top of the bottom nav below 1024 px.
  - L1 `viewport.viewportFit = "cover"`; L4 transitions name `translate`/`scale`/`box-shadow`; L5 `STUDENT_HOME` is in `lib/student-home.ts`; L6 not-found `main` without `overflow-hidden`, the phone menu closes on any link tap, `GoToTop` jumps without smooth scroll for reduced motion.
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
