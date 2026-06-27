# Line Review Evidence: primary-advantage-051

Reviewer: coder-deepseek-v4-flash/primary-advantage-051
Files assigned: 6
Lines assigned: 1051

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/providers/session-provider.tsx` | 1-5 | reviewed | 0 |
| `apps/primary-advantage/components/providers/theme-provider.tsx` | 1-11 | reviewed | 0 |
| `apps/primary-advantage/components/school/add-admin-dialog.tsx` | 1-208 | reviewed | 1 |
| `apps/primary-advantage/components/school/create-school-card.tsx` | 1-37 | reviewed | 0 |
| `apps/primary-advantage/components/school/edit-school-form.tsx` | 1-235 | reviewed | 0 |
| `apps/primary-advantage/components/school/school-detail.tsx` | 1-555 | reviewed | 2 |

## Findings

### LR-primary-advantage-051-001 — Undefined `update`/`session` references in school delete handler

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/school/school-detail.tsx:123-127`
- Evidence: The `handleDelete` function at line 111 calls `await update({...session, user: { ...session?.user, role: "User" }})` on line 124-127. However, line 106 destructures only `user` from `useSession()` (`const { user } = useSession();`). The variables `update` and `session` are not in scope at this point, causing a runtime ReferenceError when a user successfully deletes a school.
- Impact: School deletion triggers an uncaught runtime error, preventing the success toast and route refresh from completing. The school is deleted on the server but the client hangs on an error.
- Recommendation: Destructure `update` and `session` from `useSession()` on line 106, or replace session update logic with a proper session refresh mechanism.

### LR-primary-advantage-051-002 — Hardcoded English labels in license section with inconsistent i18n

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/school/school-detail.tsx:330,338,346,356,366,393,403,415,428,465,503,524-540`
- Evidence: The license section renders labels such as "License Name" (line 330), "Description" (line 338), "License Key" (line 346), "Max Users" (line 356), "Status" (line 366), "Start Date" (line 393), "Expiry Date" (line 403), "License Duration" (line 415), "Current Usage" (line 428), "No license found" (line 465), "Admin" badge (line 503), and the "Remove Admin" confirmation dialog (lines 524-540) as hardcoded English strings. Other sections of the same component correctly use `t()` translations from the `Settings.schoolProfile` namespace.
- Impact: Non-English locales display mixed translated and untranslated strings in the school profile, degrading UX for international users.
- Recommendation: Move all license-section labels, badges, and dialog text into the `Settings.schoolProfile` translation namespace and use the existing `t()` function.

### LR-primary-advantage-051-003 — Hardcoded "Add Admin" button text

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/school/add-admin-dialog.tsx:190`
- Evidence: Line 190 renders `<Button ...>Add Admin</Button>` with a hardcoded English string, while the rest of the component uses `t()` translations (e.g., `t("addsAdmins")`, `t("addAdminHeader")`, `t("searchUsers")`).
- Impact: The "Add Admin" button text is not translated for non-English users.
- Recommendation: Replace `"Add Admin"` with `t("addAdminButton")` (or a new key) and add the translation to all locale message files.

## No-Finding Notes

- `apps/primary-advantage/components/providers/session-provider.tsx` (1-5): Simple pass-through wrapper re-exporting `AuthProvider` from `@reading-advantage/auth-client`. Follows the shared adapter pattern. No issues.
- `apps/primary-advantage/components/providers/theme-provider.tsx` (1-11): Standard next-themes wrapper with correct `"use client"` directive and proper TypeScript typing via `React.ComponentProps`. No issues.
- `apps/primary-advantage/components/school/create-school-card.tsx` (1-37): Simple card component with create button. Properly uses `useTranslations` with nested key. No issues.
- `apps/primary-advantage/components/school/edit-school-form.tsx` (1-235): School edit form with Zod validation. Properly handles empty-string-to-undefined conversion for optional email/contact fields. Full i18n coverage. No issues.
