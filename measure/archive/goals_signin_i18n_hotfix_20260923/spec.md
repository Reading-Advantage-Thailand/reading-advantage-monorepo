# Specification: Goals and Signin i18n Hotfix

Track ID: `goals_signin_i18n_hotfix_20260923`. Type: bug. App: `apps/reading-advantage`.

## Overview

Track `structural_ux_alignment_20260911` FR-6 listed goals pages and auth pages
for the hardcoded-English pass, but the student goals page and the signin form
labels were missed. Thai users saw English strings: the goals title, subtitle,
stat labels, filter tabs, empty state, and error state, plus the "Username" and
"Password" signin labels. Found by owner manual verification S5.19 on
2026-09-23.

## Functional Requirements

- FR-1: The student goals page renders all user-facing strings from i18n scopes.
- FR-2: The signin form labels render from i18n scopes.
- FR-3: New keys exist in all five locales (en, th, cn, tw, vi).

## Acceptance Criteria

- AC-1: `/th/student/goals` renders no hardcoded English strings.
- AC-2: `/th/auth/signin` renders Thai field labels.
- AC-3: `tsc --noEmit` clean for the touched files; `__test__/structural-ux-part-b-i18n.test.ts` passes.

## Out of Scope

- Static page metadata (project pattern keeps it English).
- The marketing tagline "Extensive reading app incorporating AI."
- Missing Thai genre keys on the read page (separate tech-debt entry).
