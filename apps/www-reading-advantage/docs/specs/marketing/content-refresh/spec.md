# Marketing Content Refresh & Primary Advantage Launch

## Overview

Bring every marketing page up to date after a year of roadmap changes, ensuring accuracy across all locales and introducing the new Primary Advantage product page. Each issue in Sprint 2 SHALL focus on a single page, using an AI-assisted discovery dialogue to confirm status, timelines, and messaging before updating localized copy. The effort rides on the consolidated localization tooling delivered earlier in the sprint.

## Requirements

### Requirement: Page-by-page fact validation workflow

- Before editing content, an AI or human reviewer SHALL conduct a structured dialogue to confirm whether existing copy remains accurate (program availability, product features, timelines, contact info).
- The dialogue SHALL be captured in the issue description or comments for auditability.

#### Scenario: Home page review
- **WHEN** the “Home page refresh” issue is in progress
- **THEN** the assignee SHALL document the Q/A transcript validating each major section (hero promise, program list, testimonials)
- **AND** unresolved answers SHALL block publication until clarified.
    - **Decisions (2025-10-23)**:
        - Hero messaging references AI tools already supporting pioneering schools in Southeast Asia (no “thousands of institutions” claim).
        - Mission headline centers on student success (“Student Success Is Our Mission”).
        - Overview headline narrows scope to Reading Advantage as the current focus offering.
        - Flagship benefits emphasize research-backed twice-weekly extensive reading (up to 40% gains), student-led sessions that reduce planning, transparent dashboards, and learner-choice motivation.
        - Innovation section titles now highlight research-backed AI, classroom launch support, and trustworthy progress tracking.
        - Impact statement clarifies “spend less time on paperwork” and focuses on responding to student data insights.
        - Thai and Simplified Chinese locales SHALL receive matching tone/content updates alongside English copy changes.

#### Scenario: Product page refresh
- **WHEN** reviewing any Advantage program page
- **THEN** the reviewer SHALL verify the current status of curriculum, launch markets, pricing, and upcoming milestones.

### Requirement: Localized content updates per page

- Once details are verified, the assignee SHALL update all supported locales (English, Thai, Simplified Chinese) using the localization CLI.
- Missing translations SHALL be tracked explicitly; no page SHALL ship with stale translations unless documented and approved.

#### Scenario: CLI usage
- **WHEN** a copy edit is ready
- **THEN** `npm run i18n:tree` SHALL be used to inspect current keys, and `npm run i18n:update` SHALL apply changes for each locale.

#### Scenario: Products overview refresh
- **WHEN** the Products overview page is reviewed
- **THEN** each Advantage program card SHALL surface current positioning, launch markets, and CTA targets validated during discovery.
- **AND** a Primary Advantage card SHALL be added that links to `/products/primary-advantage`, highlights its grades 3-6 literacy focus, and mirrors the flagship layout treatment used for Reading Advantage.
- **AND** localized copy updates SHALL roll out to all supported languages in tandem.
- **AND** Storytime Advantage SHALL be clearly identified as the K-2 literacy pathway, Primary Advantage as grades 3-6, and Reading Advantage as grades 7-12.

### Requirement: Primary Advantage product page creation

- A new page SHALL be created under the products section using existing layout components (hero, benefits, curriculum highlights, CTA).
- The page SHALL adopt Primary Advantage branding (logo color scheme) while maintaining typography and layout consistency.
- Content SHALL be localized into all supported languages with verified details about the deployed app.

#### Scenario: Navigation updates
- **WHEN** the Primary Advantage page is added
- **THEN** site navigation and product listings SHALL surface it alongside other Advantage programs.

### Requirement: Documentation updates

- `docs/prd.md` and relevant specs SHALL be updated with any new product offerings or timeline adjustments.
- `docs/appendix/roadmap.md` SHALL note key shifts discovered during the refresh.
- Each issue SHALL link to or update the spec if structural/capability changes are required.

### Requirement: Acceptance checks per issue

Each page issue SHALL include the following checklist:
1. Discovery dialogue completed and linked.
2. English copy updated and reviewed.
3. Thai and Simplified Chinese translations updated or flagged with owner/ETA.
4. Links and CTAs verified (correct targets, no dead links).
5. Screenshots captured for desktop & mobile hero sections (attach to PR or issue).
6. Release notes entry drafted if messaging changes materially.

## Dependencies

- Requires `experience/localization-maintenance` tooling for efficient translation edits.
- Relies on design system components in `src/components/` for consistent layout.
- Depends on product stakeholders for truth-source updates (program managers, marketing, sales).

## Notes & Follow-ups

- Consider creating a reusable issue template or checklist for content refresh stories.
- Evaluate whether blog posts or case studies need similar verification; if so, extend scope via additional specs.
- After completion, run analytics reviews to ensure key conversions (contact form, demo requests) align with new messaging.
