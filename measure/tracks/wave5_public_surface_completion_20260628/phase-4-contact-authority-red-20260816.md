# RC-P4-001 Contact Authority Red Evidence

## Acceptance Artifact

- Track: `wave5_public_surface_completion_20260628`
- Finding: RC-P4-001, Contact display values are not single-source
- Severity: medium
- Acceptance artifact: `phase4-review-c-11a78ebda.json`
- Current HEAD base: `c572d0b87`
- Role: Mid Red

The acceptance artifact reports that ContactPage uses locale data for visible email, phone, and TikTok values.
It identifies contact.ts, ContactPage, contact locale data, Footer, and ContactForm as the relevant paths.

## Current Callers

- ContactPage imports `contactDetails` and uses supportEmail, phoneHref, and tiktokUrl.
- Footer imports `contactDetails` and uses supportEmail, phoneNumber, tiktokLabel, lineQrSrc, and lineQrAlt.
- ContactForm imports `contactDetails` and uses supportEmail for its mailto action.
- ContactPage still uses `t("phone.number")` and `t("social.tiktok")` for visible contact values.
- The existing Phase 4 test checks support email parity but does not enforce phone or social authority.

## Red Scope

The focused test adds three contracts:

1. ContactPage, Footer, and ContactForm reference approved raw values through contactDetails.
2. Raw email, phone, and TikTok authority fields do not duplicate approved contact values in en, th, or zh locale data.
3. A duplicate email value fails the detector while translated labels without raw values remain allowed.

The authority check excludes translated labels and descriptions.
It checks only email.address, phone.number, and social.tiktok raw-value fields.

## Verification

| Command | Result |
|---|---|
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-4-contact-authority.red.test.tsx --maxWorkers=1 --testTimeout=30000` | Expected Red: 2 authority contracts fail; the duplicate-value counterexample passes. |
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-4-browser-regressions.red.test.tsx src/__tests__/phase-4-browser-regressions-remaining.red.test.tsx src/__tests__/phase-4-browser-regressions-final.red.test.tsx src/__tests__/phase-4-accessibility-navigation-contact.red.test.tsx --maxWorkers=1 --testTimeout=30000` | 13/13 pass. |
| `CI=true ../../node_modules/.bin/vitest run src/__tests__/phase-3-i18n.red.test.ts src/__tests__/phase-3-group-b-types.test.ts --maxWorkers=1 --testTimeout=30000` | 10/10 pass. |
| `../../node_modules/.bin/tsc --noEmit -p tsconfig.json` | Pass. |
| `../../node_modules/.bin/eslint src/__tests__/phase-4-contact-authority.red.test.tsx` | Pass. |
| `../../node_modules/.bin/prettier --check src/__tests__/phase-4-contact-authority.red.test.tsx` | Pass. |
| `git diff --check` on the focused Red scope | Pass. |
| `build-graph update ./graph.db apps/www-reading-advantage/src/__tests__/phase-4-contact-authority.red.test.tsx` | Pass. |

## Boundary

- Production source was not changed.
- Existing Phase 3, Phase 4, and browser tests were not changed.
- Locale display labels and descriptions were not treated as contact authority.
- Registry, metadata, configuration, lockfiles, and generated files were not changed.
- UX-P4-003 remains successor-owned by `www_crm_lead_intake_20260722`.
- Unrelated worktree changes remain untouched.

## Green Handoff

- Use contactDetails.phoneNumber and contactDetails.tiktokLabel for visible ContactPage values.
- Keep contactDetails.phoneHref and contactDetails.tiktokUrl as the link authorities.
- Remove raw email, phone, and TikTok values from locale authority fields.
- Keep translated labels and descriptions as presentation text.
- Rerun the targeted Red, Phase 4/browser 13, Phase 3 10, and listed diagnostics.

MEASURE_AGENT_RESULT
role: mid-red
status: complete
track: wave5_public_surface_completion_20260628
phase: Phase 4 RC-P4-001 contact authority remediation
phase_base_sha: c572d0b87
role_base_sha: c572d0b87
finding: ContactPage raw email, phone, and TikTok values are not single-source
successor_owned: UX-P4-003 -> www_crm_lead_intake_20260722
focused_result: 2 authority contracts fail; duplicate-value counterexample passes
files_changed: apps/www-reading-advantage/src/__tests__/phase-4-contact-authority.red.test.tsx; measure/tracks/wave5_public_surface_completion_20260628/plan.md; measure/tracks/wave5_public_surface_completion_20260628/phase-4-contact-authority-red-20260816.md
green_handoff: Route visible raw contact values through contactDetails and remove raw authority values from locale fields. Keep translated labels and UX-P4-003 successor ownership.
END_MEASURE_AGENT_RESULT
