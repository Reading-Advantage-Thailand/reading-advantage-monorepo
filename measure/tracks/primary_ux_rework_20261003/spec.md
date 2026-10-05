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
  `--primary` to brand green. Thai-first font stack: Noto Sans Thai first, then Inter
  (owner decision 2026-10-05; this reverses the Phase 2 review fix M2). Fix the broken `.animate-glow`
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
  The locale toggle works. The default locale is `th` (owner decision 2026-10-05;
  `i18n/routing.ts` has `defaultLocale: "en"` today).
- FR-9 (sound): Port the Tutor Web Audio sound set with a mute switch stored per student.
- FR-10 (responsive): Every screen passes at 375, 768, and 1280 px.
- FR-11 (README): Remove claims that no code supports (offline mode, stickers) or
  mark them as planned.

- FR-12 (no Google): Remove Google support from Primary: no Google sign-in and no
  Google Classroom import (owner decision 2026-10-05). Google sign-in is already gone
  (Lane B closed public sign-up; Lane M made teacher sign-in username-only); confirm no
  button, route, or copy remains. The Google Classroom import has no API route in the
  app, so it is a dead button and dialog. Remove from `components/teacher/my-classes.tsx`
  the import button, the import dialog and its state, the `classroom_v1` import, and the
  `importedFromGoogle` and `alternateLink` branches; remove the `TeacherMyClasses.import.*`
  keys in all five message files, the `public/96x96_yellow_stroke_icon@1x.png` asset, the
  unused `Icons.google` and `Icons.googleColor`, and the `googleapis` dependency when
  nothing else imports it. Update the two tests that pass `importedFromGoogle`. Keep
  `utils/google.ts` (the Vertex AI provider), `@ai-sdk/google*`, and
  `@google-cloud/storage`: they are AI and storage adapters, not Google login. No schema
  change (no `importedFromGoogle` column exists).

## Owner decisions (2026-10-05)

Source: Daniel, in the review session of 2026-10-05.

1. Font stack: Noto Sans Thai first, then Inter (FR-1).
2. Default locale: `th` (FR-8).
3. Remove Google support: Google sign-in and Google Classroom import (FR-12).

Still open for the owner (from the same review): Lane C merge timing (Phases 0-2 now
or after Phase 4); mascot art in empty and error states (gap list V9); the visual
baseline tool; whether the sound set (FR-9) is the first Lane C item to cut; the sign-in
look and the profile "Me" tab (audit ranks 1 and 10, in no phase today); shell-only
scope for admin and system screens; the vocabulary "Manage" tab; email fields on the
add-student, add-teacher, and forgot-password forms.

## Non-goals

- No change to game internals.
- No new activity types (see the teacher/lesson track for lesson flow).

## Acceptance Criteria

- Vision-based browser QA sweep (one agent per screen group) at the three widths
  with screenshots stored in `measure/qa/browser-<date>/`. No Critical or High findings.
- axe (or equivalent) reports 0 serious violations on each screen.
- Visual regression baselines recorded for the main screens (closes the open
  Tailwind v4 visual-regression debt item).
