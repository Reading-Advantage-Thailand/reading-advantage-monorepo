# Line Review Evidence: primary-advantage-020

Reviewer: coder-deepseek-v4-flash/primary-advantage-020
Files assigned: 6
Lines assigned: 1059

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/app/api/users/me/school/route.ts | 1-505 | reviewed | 3 |
| apps/primary-advantage/app/api/users/search/route.ts | 1-70 | reviewed | 1 |
| apps/primary-advantage/cloudbuild.yaml | 1-84 | reviewed | 2 |
| apps/primary-advantage/components/admin/admin-dashboard-header.tsx | 1-127 | reviewed | 1 |
| apps/primary-advantage/components/admin/admin-overview-charts.tsx | 1-181 | reviewed | 1 |
| apps/primary-advantage/components/admin/admin-quick-actions.tsx | 1-92 | reviewed | 1 |

## Findings

### LR-PA-020-001 — Missing owner/admin authorization check on PATCH /api/users/me/school

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/api/users/me/school/route.ts:303-316`
- Evidence: The PATCH handler (lines 283-409) validates only that `currentUser` exists and has a school association. It does NOT verify that the caller is the school owner or an admin before allowing updates to school name, contactName, or contactEmail. The comment on line 282 says "Update current user's school" but the implementation does not enforce ownership. Contrast with DELETE (line 445) which correctly checks `userSchool.ownerId !== currentUser.id`.
- Impact: Any user who belongs to a school can modify the school's profile fields (name, contact name, email). This is an authorization gap.
- Recommendation: Add an owner or admin role check before allowing PATCH mutations, consistent with the DELETE handler pattern.

### LR-PA-020-002 — `as any` type assertions bypass Drizzle type safety on DB writes

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/api/users/me/school/route.ts:203` and `:340`
- Evidence: Lines 203 and 340 use `} as any).returning()` and `} as any)` on Drizzle insert/update calls for the `schools` table. The comment on line 197 says "replaces Prisma `school.create`". The `as any` casts suppress TypeScript validation and could hide schema mismatch bugs (e.g., if columns are renamed in the Drizzle schema but not updated here).
- Impact: Silent type-incorrect DB writes during ongoing or future schema changes. Reduces type-safety guarantees after Prisma→Drizzle migration.
- Recommendation: Remove `as any` casts by constructing the insert/update value objects using typed helpers or explicit field mapping that matches the Drizzle schema.

### LR-PA-020-003 — Inconsistent schoolId nullification on DELETE when owner lacks admin role

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/api/users/me/school/route.ts:461-494`
- Evidence: On DELETE (lines 411-504), the school row is deleted (line 462). Then the code checks `hasAdminRole` (line 466). Only inside the `if (hasAdminRole)` block does it clear `schoolId` on the user record (line 493). If the school owner does NOT have an explicit "admin" role (e.g., their role is something else), the `schoolId` field on their `users` row is never set to `null`, leaving a dangling reference to a deleted school.
- Impact: The user's `schoolId` points to a non-existent school, causing downstream queries that join on `users.schoolId` to silently return empty results or produce null joins. This creates a persistent orphan state.
- Recommendation: Always clear `users.schoolId = null` for the owner regardless of role status. The schoolId nullification should happen unconditionally after the school is deleted.

### LR-PA-020-004 — Missing school/tenant scoping on GET /api/users/search

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/app/api/users/search/route.ts:26-38`
- Evidence: The user search query on lines 31-38 searches across ALL users matching the name/email pattern, filtered only by `ne(users.id, currentUser.id)`. There is no where clause scoping to `currentUser.schoolId`. In a multi-tenant architecture (school-based), a user at school A can discover names and emails of users at school B.
- Impact: Cross-tenant information disclosure. A school admin can search for and see users from other schools.
- Recommendation: Add `eq(users.schoolId, currentUser.schoolId)` or join through the user's schoolId to scope search results to the current user's tenant.

### LR-PA-020-005 — Commented-out Prisma migration step with no Drizzle replacement in Cloud Build

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/cloudbuild.yaml:21-25`
- Evidence: Lines 21-25 contain a commented-out step for running `npx prisma migrate deploy`. The app has been migrated to Drizzle, but there is no replacement Drizzle migration command. The deployment pipeline has no automated database migration step, meaning schema changes must be applied manually or through a separate process.
- Impact: Schema drift risk during deployments. New Drizzle migrations may not be applied automatically, causing runtime errors when the app expects schema changes that haven't been applied.
- Recommendation: Add a Cloud Build step (or Cloud Run Job) to run `pnpm --filter @reading-advantage/db migrate` or equivalent before the deploy step, similar to the commented-out Prisma step.

### LR-PA-020-006 — Stale Google OAuth secret references in cloudbuild.yaml

- Severity: Low
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/cloudbuild.yaml:42-43`
- Evidence: Lines 42-43 pass `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` as secrets to the Cloud Run deployment. Per AGENTS.md, the default auth model is username/password with session-based auth, and Firebase Auth / Google OAuth is being migrated away. These may be stale configurations from a Firebase Auth era.
- Impact: Unnecessary secrets in deployment config create maintenance overhead and potential confusion about which auth provider is active.
- Recommendation: Verify whether Google OAuth is still in use. If not, remove the stale secret references from cloudbuild.yaml and any related env config.

### LR-PA-020-007 — Hardcoded notification badge count

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/admin/admin-dashboard-header.tsx:63`
- Evidence: The notification bell badge on line 63 uses a hardcoded value of `3` instead of a dynamic count from an API or database query. The same hardcoded value appears again on line 122 for the mobile variant.
- Impact: Users see a static/incorrect notification count. This is acceptable for early UI prototypes but must be connected to a real data source before production.
- Recommendation: Replace hardcoded `3` with a state variable populated from an API endpoint or server action that returns the actual unread notification count.

### LR-PA-020-008 — Production-incomplete mock data in admin dashboard charts

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/admin/admin-overview-charts.tsx:10-34`
- Evidence: Lines 11-34 define hardcoded mock data objects for userGrowth, topArticles, and activityByLevel charts. The comment on line 10 explicitly states "Mock data for charts - in a real app, this would come from an API." All chart visualizations render from this static data.
- Impact: Admin dashboard charts display fictional numbers rather than real school metrics. This is a known incomplete feature that would mislead users in production.
- Recommendation: Connect chart data to real API endpoints or server actions that query actual user/article/activity counts from the database.

### LR-PA-020-009 — React key={index} anti-pattern

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/admin/admin-quick-actions.tsx:70`
- Evidence: The `.map()` on line 67 renders action buttons using `key={index}` (line 70). The `actions` array is static and does not have unique identifiers, so the index-based key is the only available option. While this works for static lists, it is a React anti-pattern that can cause issues with re-rendering or re-ordering.
- Impact: Minimal for this static list, but the pattern could be replicated in dynamic lists where index keys cause actual bugs.
- Recommendation: Add unique IDs to action objects and use them as keys, or keep as-is with a note that this is acceptable for static lists only.

## No-Finding Notes

All 6 assigned files had findings (see above). No files in this batch were clean.

