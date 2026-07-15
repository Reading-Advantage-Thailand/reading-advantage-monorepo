# Codecamp Live Product Page Deployment Evidence — 2026-07-15

## Outcome

The production Codecamp Advantage page now presents Codecamp as the first Advantage
application to implement Mastery Advantage end to end. It accurately describes the
four-phase, 20-module, 106-lesson new-cohort pathway, Measure-driven development,
Advantage Play Kit game creation, targeted tutoring, instructor evidence, and the
shadow-mode boundary for advisory pull-request review.

## Verification

- Focused page contract: 4/4 Vitest tests passed.
- Full www suite: 17 test files and 1,508 tests passed.
- `i18n:verify`, ESLint, TypeScript, and the Next.js production build passed.
- React Doctor improved from 85/100 to 97/100; the sole remaining advisory is the
  intentionally composed long-form product page component.
- Custom-domain routes `/en`, `/th`, and `/zh/products/codecamp-advantage` returned 200.
- Kimi WebBridge verified the English desktop page, localized Thai and Chinese mastery
  headings, correct locale-aware Codecamp CTAs, and no horizontal overflow.
- Chrome at 390x844 verified the responsive hero and mobile navigation.
- The live CTA opened `https://codecamp.reading-advantage.com/en` successfully.

## Deployment

- Project: `www-reading-advantage`
- Region: `asia-southeast1`
- Cloud Build: `e0798e5c-3b87-4182-8692-0beac7384923` (`SUCCESS`)
- Cloud Run revision: `www-reading-advantage-00201-dvj`
- Traffic: 100% to the latest ready revision
- Image digest: `sha256:b2390a6a629a97301b0f5ac4d65d7810a105f3694276701c8a160cefaa680f89`
- New revision errors after cutover: none

The gcloud default Cloud Run region was also restored and verified as
`asia-southeast1`, matching the existing service and DNS-routing constraint.

## Build-context correction

Builds `430f848c-2925-48ba-a2fe-f57387546a32` and
`e5052625-ec81-48a1-9865-b7d486c5cc30` failed before Docker execution because the
root `.gcloudignore` excluded the www app. Commit `bd30da22` made both deployed app
Dockerfiles available to Cloud Build. No failed build reached an image push or Cloud
Run deployment step.
