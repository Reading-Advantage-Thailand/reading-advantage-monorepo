# Implementation Plan: CodeCamp Live Product Page Alignment

## Phase 1: Source-of-truth audit

- [x] Audit the deployed CodeCamp curriculum, model rollout, mastery boundaries, and browser evidence.
- [x] Audit the current www page, locale module, tests, product guidelines, and Cloud Run configuration.
- [x] Record the public-page contract and stale-claim removals in this track.

## Phase 2: Red/Green implementation

- [x] Add Red tests for the live CTA, curriculum proof points, Measure/APK content, advisory PR semantics, and cross-page claim consistency.
- [x] Update the CodeCamp product page with the production-aligned information architecture and CTAs.
- [x] Update EN/TH/ZH locale content with structural parity and accurate claims.
- [x] Update metadata and focused visual/semantic assertions required by the new page.

## Phase 3: Verification and review

- [x] Run focused Vitest tests and i18n verification.
- [x] Run www lint, type-check, full tests, and production build.
- [~] Run React/front-end quality review and inspect the rendered page in Chrome at desktop and mobile widths.

## Phase 4: Deployment and closeout

- [ ] Commit the page implementation atomically.
- [ ] Deploy the immutable commit snapshot through `apps/www-reading-advantage/cloudbuild.yaml`.
- [ ] Verify Cloud Run readiness/traffic, custom-domain EN/TH routes, browser rendering, CTAs, and revision logs.
- [ ] Record deployment evidence, mark the track complete, archive it, and commit the Measure closeout.
