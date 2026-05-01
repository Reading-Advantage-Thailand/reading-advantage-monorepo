# Identity Authentication Retirement

## Overview

Permanently remove all authentication functionality from the marketing site. The application is a static brochure experience that links to external platforms where products actually live; therefore we SHALL eliminate Firebase dependencies, login forms, auth context, related UI, and configuration. After this change the site MUST build and deploy as a purely static, unauthenticated experience with no dormant auth code paths.

## Requirements

### Requirement: Remove all UI affordances for login/signup

- The site SHALL NOT display “Login”, “Sign in”, “Sign up”, or similar copy in navigation, headers, footers, modals, or call-to-action components.
- Shared components SHALL have props updated or removed so they no longer expect auth-related callbacks or strings.

#### Scenario: Header render
- **WHEN** any locale renders the header on desktop or mobile
- **THEN** navigation SHALL omit login/signup links
- **AND** the right-rail SHALL only show publicly relevant controls (e.g., locale switcher, contact CTA).

#### Scenario: Legacy CTA components
- **WHEN** hero sections, cards, or buttons are displayed
- **THEN** they SHALL reference demo/contact funnels instead of account authentication.

### Requirement: Eliminate authentication routes and redirects

- The `/login` route SHALL be removed from the app router; hitting `/login` SHALL respond with a static 404 or redirect to `/`.
- Any remaining code that programmatically navigates to `/login` or `/signup` SHALL be deleted or updated to the new destination.

#### Scenario: Direct navigation
- **WHEN** a user enters `/login` in the URL bar
- **THEN** the site SHALL return a 301 to `/` (or configured marketing landing page)
- **AND** NO login form SHALL render at any point.

### Requirement: Remove client-side auth infrastructure

- `AuthContext`, hooks, and providers SHALL be deleted along with all imports/usages.
- Firebase initialization modules, environment variables, and helper utilities SHALL be removed.
- Any component-level logic depending on `user`, `signIn`, `signOut`, or `signInWithGoogle` SHALL be refactored to non-auth equivalents.

#### Scenario: Build process
- **WHEN** `npm run build` executes
- **THEN** the bundle SHALL NOT include Firebase SDK code
- **AND** tree-shaking SHALL confirm there are zero auth-related exports.

### Requirement: Package & configuration cleanup

- `package.json` SHALL drop Firebase/auth-related dependencies and scripts.
- `.env` samples/documentation SHALL remove auth environment variables.
- CI/CD workflows SHALL be reviewed to ensure no auth-specific secrets or steps remain.

### Requirement: Documentation & messaging updates

- `docs/prd.md`, `docs/appendix/tech-stack.md`, and any relevant specs SHALL reflect that the platform is unauthenticated.
- `README.md` and marketing copy SHALL avoid mentioning login/account access.
- Release notes SHALL document the removal to prevent confusion for stakeholders accustomed to prior demos.

### Requirement: Telemetry & regression checks

- Analytics/tagging configuration SHALL remove events tied to login success/failure.
- Automated smoke tests (if any) SHALL be updated to verify absence of auth UI.
- A manual QA checklist SHALL verify that static deployments show no auth remnants.

## Dependencies

- Supersedes prior Firebase setup work; no future dependency on `identity/authentication` unless a new spec reintroduces it.
- Touchpoints include navigation components, layout shell, routing, build configuration, and documentation.

## Notes & Follow-ups

- Archive historical auth implementation notes in `docs/appendix/` if knowledge retention is required.
- Confirm with product/marketing that external platforms handling auth are linked prominently.
- If future gated content is envisaged, a fresh spec will be authored rather than resurrecting deprecated code.
