# Implementation Plan: PR and Website Strategic Alignment

## Phase 1: Alignment Audit & Translation Prep
- [ ] Task: Audit all locale files for Managed Services, Blended Learning, and feature lists.
  - [ ] Identify target files (e.g., `managed-service.ts`, `blended-learning.ts`, `services/page.ts`, `home.ts`).
  - [ ] Draft the exact English copy updates needed for the Managed Service timeline, Blended Learning definition, and Big 4 QA Protocol.
  - [ ] Draft the corresponding Thai (`th`) and Chinese (`zh`) translations for the new copy.
- [ ] Task: Measure - User Manual Verification 'Alignment Audit & Translation Prep' (Protocol in workflow.md)

## Phase 2: Copy Implementation
- [ ] Task: Apply updates to Blended Learning copy
  - [ ] Update `blended-learning.ts` (and any other relevant files) to define it as "Physical workbooks + digital app" launching May 2026. Apply to en, th, zh locales.
- [ ] Task: Apply updates to Managed Service copy
  - [ ] Update `managed-service.ts` (and any other relevant files) to clearly state the May 2027 launch date and future availability. Apply to en, th, zh locales.
- [ ] Task: Integrate Big 4 QA Protocol copy
  - [ ] Inject the "Big 4 QA Protocol" into relevant feature or quality assurance sections (e.g., `services/page.ts` or product overviews). Apply to en, th, zh locales.
- [ ] Task: Measure - User Manual Verification 'Copy Implementation' (Protocol in workflow.md)

## Phase 3: Final Review
- [ ] Task: Validate site copy and build
  - [ ] Search the codebase to ensure no old definitions ("AI instruction + Thai teacher") exist.
  - [ ] Search the codebase to ensure Managed Service has no "available now" language.
  - [ ] Run `npm run build` to ensure no localization keys were broken during the update.
- [ ] Task: Measure - User Manual Verification 'Final Review' (Protocol in workflow.md)