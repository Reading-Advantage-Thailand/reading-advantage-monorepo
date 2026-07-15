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
- [x] Run React/front-end quality review and inspect the rendered page in Chrome at desktop and mobile widths.

## Phase 4: Deployment and closeout

- [x] Commit the page implementation atomically.
- [x] Deploy the immutable commit snapshot through `apps/www-reading-advantage/cloudbuild.yaml`.
- [x] Verify Cloud Run readiness/traffic, custom-domain EN/TH/ZH routes, browser rendering, CTAs, and revision logs.
- [x] Record deployment evidence, mark the track complete, archive it, and commit the Measure closeout.

## Release evidence

- Implementation commits: `a175f3ba`, `bd30da22`, `e8c3643e`.
- Final Cloud Build: `e0798e5c-3b87-4182-8692-0beac7384923` (`SUCCESS`).
- Final Cloud Run revision: `www-reading-advantage-00201-dvj` (ready, 100% traffic).
- Final image digest: `sha256:b2390a6a629a97301b0f5ac4d65d7810a105f3694276701c8a160cefaa680f89`.
- Automated gates: 1,508 tests passed; lint, type-check, i18n verification, and production build passed; React Doctor 97/100.
- Browser gates: Kimi WebBridge Chrome desktop, headless Chrome 390x844 mobile, live CTA navigation, localized EN/TH/ZH content, and no horizontal overflow passed.
