# Specification: PR and Website Strategic Alignment

## Overview
Align the website's copy with the recently integrated PR foundation documents (`docs/pr/marketing-foundation-document.md`) to ensure consistent messaging across all channels. This track focuses strictly on copy updates within the localization files, without introducing new UI components.

## Functional Requirements
- **Managed Service Timeline:** Audit and update all mentions of the Managed Service offering across the site to clearly state it is a future offering launching in "May 2027". It should not be presented as currently available.
- **Blended Learning Definition:** Audit and update all mentions of Blended Learning to ensure it is strictly defined as "Physical workbooks + digital app" and explicitly targets a May 2026 launch. Remove any references to "AI instruction + Thai teacher facilitation" as a definition.
- **Big 4 QA Protocol:** Integrate references to the proprietary "Big 4 QA Protocol" (Uninterrupted Reading, Student Agency, Data-Driven Consensus, Workbook-First Protocol) into relevant product and service page copy to emphasize quality assurance and instructional fidelity.
- **Evidence-Based Claims (Already Completed):** The "40% improvement" claims have already been replaced with the "Aka 2019" research standard across the codebase prior to this track's initialization.

## Non-Functional Requirements
- All updates must be made exclusively to the localization (`src/locales/**/*.ts`) files.
- No new React components, pages, or layout structures should be created. Existing UI structures must be reused.
- The tone should be radically honest, focusing on evidence and technology over inflated claims.

## Acceptance Criteria
- [ ] No pages imply Managed Service is currently available; all cite May 2027.
- [ ] Blended Learning is consistently defined as workbooks + app across all locales (en, th, zh).
- [ ] The Big 4 Protocol is mentioned in the features/benefits copy of relevant pages.
- [ ] Code compiles without errors and localization keys remain intact.

## Out of Scope
- Creating new UI sections or pages.
- Restructuring page layouts.
- Further modifications to the evidence-based claims (completed prior to track).