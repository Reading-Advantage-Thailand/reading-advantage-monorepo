# Specification: CodeCamp Live Product Page Alignment

## Summary

Update the public CodeCamp Advantage product page to represent the application that
is actually live at `codecamp.reading-advantage.com`. Replace pre-launch language and
stale curriculum/technology claims with an accurate, localized product story for the
20-module new-cohort pathway, 106 lessons, Measure-driven development, Mastery
Advantage evidence, the activity-bound intervention tutor, interactive diagrams/media,
and the Advantage Play Kit game-creation unit.

## Goals

1. Present CodeCamp as a live product and link directly to the production application.
2. Explain the current four-phase, 20-module learning path without implying existing
   cohorts were silently migrated.
3. Show how Measure, Mastery Advantage, trusted activity checks, targeted tutoring,
   and production delivery form one evidence-driven learning loop.
4. Replace generic or stale technology-track claims with the stack and workflow the
   current curriculum actually teaches.
5. Preserve English, Thai, and Simplified Chinese locale parity.
6. Deploy the updated www application to Cloud Run and verify the custom domain in Chrome.

## Functional Requirements

- The hero must show a live-program status and offer a primary CTA to the production
  CodeCamp app plus a secondary inquiry CTA.
- The page must state the production curriculum denominator accurately: 20 modules
  and 106 lessons for newly assigned cohorts, with an honest note that existing cohorts
  retain their original sequence.
- The page must include the Measure module and APK game-creation unit in Phase D.
- The learning-system section must distinguish deterministic/mastery evidence from
  tutoring support and advisory AI review.
- PR-review copy must not claim that shadow-mode model output currently approves work,
  blocks merges, or mutates Mastery.
- The technology/tooling section must reflect Next.js, React, TypeScript, PostgreSQL,
  Drizzle, GitHub, Docker/Cloud Run, Measure, and Advantage Play Kit rather than generic
  MERN/Django tracks.
- All visible prose must live in the existing locale module for EN/TH/ZH.
- Existing metadata, accessibility, responsive behavior, and localized navigation must remain valid.

## Acceptance Criteria

- No `Coming Soon`, waitlist, `18-module`, MERN-track, Django-track, or automated
  pass/fail PR-review claim remains on the CodeCamp page.
- The Codecamp cards on `/products` no longer contradict the dedicated page with
  `Coming 2027`, 15-week, cross-curricular, or multi-stack claims.
- EN/TH/ZH contain the same required structural keys and curriculum denominators.
- Page tests assert the live CTA, 20-module/106-lesson proof points, Measure/APK content,
  and guarded advisory semantics.
- Focused tests, locale verification, type-check, lint, and production build pass.
- Cloud Build succeeds, the new Cloud Run revision receives 100% traffic, and the live
  EN/TH page is browser-verified without new revision errors.

## Non-Goals

- Activating PR-review mastery mutation or bypassing its human-labelled fixture/canary gate.
- Assigning Unit 20 retroactively to existing CodeCamp interns.
- Redesigning unrelated product pages or the global marketing design system.
