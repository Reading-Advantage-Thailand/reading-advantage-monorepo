# Spec — Primary UX Rework

Track ID: `primary_ux_rework_20261003`
Type: feature
Program: [primary-tutor-parity-program](../../primary-tutor-parity-program.md)

## Context

Primary uses the default shadcn grayscale theme, two navigation variants side by
side, 33 local UI files, and screens with known papercuts. Tutor Advantage has a
Thai-first green brand, a glass bottom nav, soft shadows, and motion. The goal is
one family of apps that feel the same, with Primary keeping its own school and
teacher needs.

## Functional Requirements

- FR-1 (tokens): Port the Tutor brand ramp, surface, radius, shadow, and ease tokens
  to Primary `styles/globals.css`, with the Tutor `.dark` block. Set shadcn
  `--primary` to brand green. Thai-first font stack. Fix the broken `.animate-glow`
  keyframe name and the Geist/Quicksand conflict. Keep the Chibi Quest RPG look in
  game areas and make the shell consistent with it.
- FR-2 (components): Put the new shared classes and components (button with glow,
  status chip, shimmer skeleton, card-hover, page transition, animated counter)
  into `packages/ui`. Do not add to local `components/ui`. Local files that the new
  package components replace are deleted in the same change.
- FR-3 (navigation): One navigation. Mobile: 4-tab glass bottom bar. Large screens:
  sidebar. Students: Home, Read, Games, Me. Teachers: Home, Classes, Assignments,
  Reports. Remove `main-nav`, `new-main-nav`, `mobile-nav`, `new-mobile-nav`.
  Active tab state, `aria-current`, safe-area insets, localized labels.
- FR-4 (student home): New `student/home` screen. Shows today's lesson from the
  class book, continue reading, streak, XP, a games shortcut, and the Reedy meter
  slot (filled by the Reedy track). Default landing after login.
- FR-5 (student screens): Redesign read list, article view, lesson flow, assignments,
  vocabulary, sentences, history, reports, and the games catalog. Each screen has a
  loading skeleton, an empty state, and an error state with a retry action.
- FR-6 (teacher screens): Redesign dashboard, my-classes, class roster, assignments,
  reports, and student-progress. The content of the book and progress screens belongs
  to `primary_teacher_books_lesson_support_20261003`; this track supplies the shell,
  layout, and components for them.
- FR-7 (accessibility): Skip link, landmarks, `aria-live` for async status, keyboard
  path for every clickable element, visible focus, contrast at least WCAG AA,
  `prefers-reduced-motion` for every animation.
- FR-8 (i18n): All new copy exists in en and th (and the current vi, cn, tw files get
  the keys with English fallback). Fix the 42 keys at the wrong depth for Chinese.
  The locale toggle works.
- FR-9 (sound): Port the Tutor Web Audio sound set with a mute switch stored per student.
- FR-10 (responsive): Every screen passes at 375, 768, and 1280 px.
- FR-11 (README): Remove claims that no code supports (offline mode, stickers) or
  mark them as planned.

## Non-goals

- No change to game internals.
- No new activity types (see the teacher/lesson track for lesson flow).

## Acceptance Criteria

- Vision-based browser QA sweep (one agent per screen group) at the three widths
  with screenshots stored in `measure/qa/browser-<date>/`. No Critical or High findings.
- axe (or equivalent) reports 0 serious violations on each screen.
- Visual regression baselines recorded for the main screens (closes the open
  Tailwind v4 visual-regression debt item).
