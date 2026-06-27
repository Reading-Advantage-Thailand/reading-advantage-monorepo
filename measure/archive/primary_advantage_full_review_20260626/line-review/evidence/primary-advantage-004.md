# Line Review Evidence: primary-advantage-004

Reviewer: line-review execution subagent (minimax-M3), batch assigned by orchestrator.
Files assigned: 10
Lines assigned: 1115

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/app/[locale]/(index)/page.tsx | 1-287 | reviewed | 1 |
| apps/primary-advantage/app/[locale]/(index)/privacy-policy/page.tsx | 1-162 | reviewed | 2 |
| apps/primary-advantage/app/[locale]/(index)/terms/page.tsx | 1-136 | reviewed | 1 |
| apps/primary-advantage/app/[locale]/(student)/settings/layout.tsx | 1-14 | reviewed | 0 |
| apps/primary-advantage/app/[locale]/(student)/settings/school-profile/page.tsx | 1-168 | reviewed | 3 |
| apps/primary-advantage/app/[locale]/(student)/settings/user-profile/page.tsx | 1-219 | reviewed | 3 |
| apps/primary-advantage/app/[locale]/(student)/student/assignments/page.tsx | 1-13 | reviewed | 0 |
| apps/primary-advantage/app/[locale]/(student)/student/history/page.tsx | 1-24 | reviewed | 0 |
| apps/primary-advantage/app/[locale]/(student)/student/layout.tsx | 1-15 | reviewed | 0 |
| apps/primary-advantage/app/[locale]/(student)/student/lesson/[id]/page.tsx | 1-77 | reviewed | 2 |

## Findings

### LR-primary-advantage-004-001 — Marketing contact form on home page has no submit handler

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(index)/page.tsx:201-261`
- Evidence: Lines 201-261 render a full contact form (`Card` containing `Input` fields for name/institution/email, a `Select` inquiry-type picker, a `Textarea` for message, and a submit `Button`). The `Select` (line 230) and the `Button` (line 259) have no `onValueChange` / `onClick` / form `action` attribute. There is no `useState`, no client-side handler, no `<form action=...>`, no server action binding, and no `mailto:` fallback. The component is declared `export default async function Home()` (line 35) so it is a server component — the form is therefore non-functional as rendered.
- Impact: A user who fills the contact form and clicks the send button gets no feedback and the data is never sent. The "Get started" hero CTA on line 134 is the only working conversion path; the contact form is dead UI in a fork where prospective school customers may rely on it.
- Recommendation: Add a real handler — either wire the form to an existing server action (e.g., `actions/article.ts` already exports actions, although none fit; create `actions/contact.ts`), convert the form to a client component with `fetch("/api/send", ...)` (the route file `apps/primary-advantage/app/api/send/route.ts` exists in another batch and presumably already serves this purpose), or remove the form and replace with a `mailto:` link. Track as a small Primary-Advantage-specific remediation item.

### LR-primary-advantage-004-002 — Privacy policy is unforked Reading Advantage copy, not Primary Advantage

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(index)/privacy-policy/page.tsx:1-162`
- Evidence: The page is a static React component (no DB/i18n binding) that hardcodes the entire policy text. Every brand reference says "Reading Advantage":
  - Line 18: `Reading Advantage ("we," "our," or "us") is committed to protecting your privacy.`
  - Line 88: `Your data is stored on secure servers provided by Google Cloud Platform.`
  - Line 154-156: `Email: admin@reading-advantage.com`, `Reading Advantage (Thailand)`, `912/316 Na Muang Road, Muang, Khonkaen 40000, Thailand`.
  The "Last updated" date (line 11) is hardcoded to `February 23, 2025` regardless of deployment date. The Primary Advantage app is a separate product for primary-school children but inherits the legal copy verbatim from Reading Advantage.
- Impact: Legal copy presented to primary-school parents identifies a different product name and parent company. Privacy notices must accurately identify the data controller; presenting "Reading Advantage" policies inside a "Primary Advantage" product creates a contract-of-disclosure mismatch and a potential COPPA / GDPR-K / PDPA mismatch (the original policy was written for a higher-age audience). This is documented fork drift that was never re-papered when Primary Advantage was spun off.
- Recommendation: Create a `messages/en.json` namespace (e.g., `Legal.privacyPolicy`) and bind the policy text to translations so it can be forked per-app; replace all "Reading Advantage" branding with "Primary Advantage" or the correct legal entity; remove the hardcoded "Last updated" date or move it to a build-time constant.

### LR-primary-advantage-004-003 — Privacy policy's COPPA section is generic, not adapted for a primary-student product

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/(index)/privacy-policy/page.tsx:126-130`
- Evidence: The "Student Privacy" section (lines 126-130) states: `For students under 13 years of age, we comply with COPPA. We collect personal data only with parental or school consent.` This is the same generic sentence Reading Advantage uses. There is no detail on:
  - Specific data categories collected from minors (the bulleted lists above mention "Educational Information: CEFR level, learning progress" but no mention of reading-level data, flashcard performance, classroom enrollment, etc.).
  - Verifiable parental consent mechanism (no description of how consent is captured or stored).
  - Data retention / deletion policy for minors.
  - Operator status under COPPA (the original Reading Advantage operator acts as the operator; if Primary Advantage is operated by a separate entity, the school-vs-operator distinction is missing).
  The app is positioned for primary students (the `AGENTS.md` of the app, the home-page hero copy, and the route group `(student)` all target young learners), so nearly every user is in the COPPA-protected class.
- Impact: This is a regulator-facing compliance gap. COPPA requires the privacy notice to "set forth what information is collected from children by the operator and how the operator uses such information" (16 C.F.R. § 312.4). Generic inherited text under-discloses relative to the data the app actually collects from primary students (lesson activity logs, flashcard reviews, classroom enrollments, etc.).
- Recommendation: Author a Primary-Advantage-specific privacy notice that names the operator, enumerates the actual data collected from children (lesson activity, flashcard results, classroom enrollment, school ID), describes the parental consent flow used at signup, and adds a data retention / deletion paragraph. Track as a fork-divergent remediation in the migration-tracks proposal.

### LR-primary-advantage-004-004 — Terms of service is unforked Reading Advantage copy

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(index)/terms/page.tsx:1-136`
- Evidence: Identical pattern to LR-primary-advantage-004-002. The page is a static component (lines 1-136) that hardcodes:
  - Line 20: `By accessing or using Reading Advantage's application and services (the "Service")...`
  - Line 102: `The Service and its original content are owned by Reading Advantage.`
  - Line 128-130: `Email: admin@reading-advantage.com`, `Reading Advantage (Thailand)`, `912/316 Na Muang Road, Muang, Khonkaen 40000, Thailand`.
  - Line 13: hardcoded `Last updated: February 23, 2025`.
- Impact: Identical to the privacy-policy finding — the contract presented to primary-school parents and teachers names a different product entity. A click-through terms flow in a primary-student product that says "owned by Reading Advantage" creates misrepresentation risk.
- Recommendation: Same as LR-primary-advantage-004-002 — bind to i18n, replace branding, drop the hardcoded date. The two legal pages can share one remediation track.

### LR-primary-advantage-004-005 — School-profile settings page exposes create/edit/delete to non-admin users via a student route group

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/(student)/settings/school-profile/page.tsx:1-168`
- Evidence: The page is mounted at `apps/primary-advantage/app/[locale]/(student)/settings/school-profile/page.tsx` — the `(student)` route group is the primary-student surface. The component (`export default function SchoolProfileSettingsPage`, line 56) is a client component (`"use client"` at line 1) that fetches `/api/users/me/school` (line 65) and then offers three modes: edit existing school (`EditSchoolForm`, line 139), create a new school (`SchoolProfileForm`, line 156), or read-only detail with edit/delete affordances (`SchoolDetail` with `onEdit` and `onDelete` handlers, lines 145-150). There is no role check in the page — no `if (user.role !== "admin")` guard, no redirect, no `assertCan()` call. The settings layout that wraps it (`apps/primary-advantage/app/[locale]/(student)/settings/layout.tsx`, lines 1-14) also performs no auth/role gate beyond rendering children.
- Impact: A primary-school student who navigates to `/settings/school-profile` can call the school-creation or school-edit APIs. In a product whose users are children, the UI must not expose admin-only entity management under the student's surface. This is both a privilege-escalation risk (if the API doesn't gate server-side either) and a UX mistake (children should not see "Create school" buttons).
- Recommendation: Either (a) move the page out of `(student)/` into `(admin)/settings/` and add a server-side role check, or (b) gate the create/edit/delete UI behind an admin role check inside the component. A server-side authorization audit of the underlying `/api/users/me/school` route is also required (that's batch primary-advantage-020, but this UI-side finding is recorded here).

### LR-primary-advantage-004-006 — `handleDelete` only clears local state, never calls the API

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/settings/school-profile/page.tsx:114-116`
- Evidence: Lines 114-116:
  ```ts
  const handleDelete = () => {
    setSchool(null);
  };
  ```
  This handler is passed to `<SchoolDetail onDelete={handleDelete} ... />` on line 148. It only mutates React state — there is no `fetch("/api/users/me/school", { method: "DELETE" })` call, no server action, no confirmation dialog, no error handling. After deletion the page will re-render the "create school" branch (lines 153-163) because `school === null`, but no record on the server was actually removed.
- Impact: The user sees the school vanish from the UI and believes it has been deleted. On the next page load (or in any other tab/session), the school reappears because the API was never called. This is broken UX and a data-integrity illusion. Combined with finding LR-primary-advantage-004-005, a student could "delete" the school from the UI without the underlying record being touched, leaving the UI in an inconsistent state.
- Recommendation: Wire `handleDelete` to a real delete endpoint (presumably `DELETE /api/users/me/school` or similar), add a confirmation dialog, and surface server errors. Until then, hide the delete affordance.

### LR-primary-advantage-004-007 — School-profile settings page uses client-side `fetch` instead of a server component + Drizzle query

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/settings/school-profile/page.tsx:1-168`
- Evidence: The page is declared `"use client"` (line 1). It owns six pieces of React state (`school`, `isLoading`, `isEditing`, `isCreating`, line 58-61) and loads data via `fetch("/api/users/me/school")` inside `useEffect` (lines 63-86). The same data is exposed by the API route `apps/primary-advantage/app/api/users/me/school/route.ts` (referenced in another batch) and is also reachable directly via `@reading-advantage/db` Drizzle queries. Per the app's `AGENTS.md` and the root `AGENTS.md`, application code should prefer backend modules / Drizzle over arbitrary client `fetch` calls.
- Impact: Every visit to this settings page round-trips: page → JSON API → Drizzle → JSON → React state. Loading state has to be hand-rolled (lines 118-128) instead of using Next.js `loading.tsx` or `Suspense`. There is no SSR data hydration, so first paint shows a spinner. Any caching/staleness logic must be implemented twice (in the API and in the page). This is a fork-inherited RA pattern that was preserved when the page was ported from Prisma to Drizzle; the page still pretends it's a thin client around an HTTP API even though the same query is reachable server-side.
- Recommendation: Convert the page to a server component that calls the Drizzle client directly (or a backend function), pass the school object down to a small client child for the edit/create state machines, and drop the `useEffect`/`fetch` boilerplate. This is consistent with the AGENTS.md preference for backend modules over Route Handler + client `fetch` chains.

### LR-primary-advantage-004-008 — Dead Firebase Auth code in user-profile page (lines 78-156)

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/settings/user-profile/page.tsx:78-156`
- Evidence: Lines 78-156 are 79 lines of commented-out Firebase code:
  - Lines 78-138: commented-out `handleSendEmailVerification` function referencing `getAuth(firebaseApp).currentUser`, `sendEmailVerification(user!, { url: ... handleCodeInApp: true })`, and a `switch(err.code)` on Firebase error codes (`auth/too-many-requests`).
  - Lines 140-156: commented-out `handleSendResetPassword` function referencing `sendPasswordResetEmail(firebaseAuth, email)`.
  These reference Firebase Auth, which the app's `AGENTS.md` says is being migrated away from ("Some apps still use Firebase Auth. This is being migrated toward the adapter pattern described above" in the root AGENTS.md). The root AGENTS.md also lists `Firebase Auth still in reading-advantage (being migrated to adapter pattern)` as a known issue.
- Impact: Dead code that increases bundle-parsing cost, confuses readers about which auth stack is actually in use, and risks being uncommented during a future edit by someone who mistakes the comment block for active logic. The file also imports `ArrowLeftIcon, BadgeCheck` from `lucide-react` (line 7) but the only active consumer is the `ArrowLeftIcon` on line 32; `BadgeCheck` is only used inside the active `DisplaySettingInfo` rendering path (line 185), so the import is not dead.
- Recommendation: Delete lines 78-156 outright. This is a one-file cleanup with no behavior change.

### LR-primary-advantage-004-009 — `DisplaySettingInfo` accepts a `resetPassword` prop but the corresponding UI is commented out

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/settings/user-profile/page.tsx:42-46, 64-76, 158-219`
- Evidence: The page passes `resetPassword` to `<DisplaySettingInfo ... resetPassword />` on line 45. `DisplaySettingInfoProps` declares `resetPassword?: boolean` on line 71, and the destructuring accepts it on line 164. The corresponding JSX that would consume the prop is commented out:
  ```tsx
  // {resetPassword && (
  //   <Button variant="secondary" size="sm">Reset Password</Button>
  // )}
  ```
  (lines 200-207). The same pattern repeats for `showVerified && !verified` (lines 208-216).
- Impact: The `resetPassword` prop is a no-op — passing it has zero effect on render. The interface and call-site give a false signal that a "Reset Password" button will appear next to the username field; it does not. This is fork-inherited dead code from the RA era where password reset was a Firebase function.
- Recommendation: Either remove the `resetPassword` prop, the call-site argument, and the typed field, or wire a real password-reset flow. The simplest cleanup is to delete the prop end-to-end.

### LR-primary-advantage-004-010 — `ChangeRole` rendered to students in development allows self-promotion

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/settings/user-profile/page.tsx:52-58`
- Evidence: Lines 52-58 render `<ChangeRole ... />` to whatever user reaches the page:
  ```tsx
  {process.env.NODE_ENV === "development" && (
    <ChangeRole
      className="md:w-[38rem]"
      userId={user.id}
      userRole={user.role as Role}
    />
  )}
  ```
  This block has no role gate — it is shown to any authenticated user, including students (the page is mounted under `(student)/settings/`). The `userRole as Role` cast (line 56) bypasses any narrowing. `process.env.NODE_ENV === "development"` is a build-time flag that is true in local dev and any preview environment that runs with `NODE_ENV=development`, not just unit tests.
- Impact: In development and preview environments, a student can change their own role to admin/teacher via the same UI an admin would use. Even if the underlying `/api/users/[id]` route properly enforces admin-only role changes, exposing the affordance to students is unsafe and a leak of an internal testing tool into the user-facing surface. For a primary-student product this is particularly concerning.
- Recommendation: Add a role gate (`user.role === "admin" || user.role === "system"`) before rendering the dev affordance, or move `ChangeRole` to a system-only route group. The build-time `NODE_ENV` check is too coarse.

### LR-primary-advantage-004-011 — Lesson route handler queries `assignments` by ID without tenant scoping

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/app/[locale]/(student)/student/lesson/[id]/page.tsx:7, 30-67`
- Evidence: Line 7 imports `db`, `assignments`, `eq` from `@reading-advantage/db`. Lines 52-56 run:
  ```ts
  const [assignment] = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(eq(assignments.id, id))
    .limit(1);
  ```
  The query filters on `assignments.id` only — there is no `eq(assignments.schoolId, user.schoolId)` clause and no join through `users.schoolId`. The page comment at lines 50-51 explicitly notes `Drizzle equivalent of the legacy Prisma db.assignment.findUnique({ where: { id }, select: { id: true } }) call` — i.e., this is a literal Prisma→Drizzle port with no tenant scoping added. The root `AGENTS.md` states: "Every query must be scoped by `schoolId`. Check `user.schoolId` or `tenant.schoolId`. Never trust tenant IDs from the frontend without verifying the user has access." The app's `AGENTS.md` repeats: "Multi-tenant queries must filter on `users.schoolId` (or join through it) for every read/write."
- Impact: A logged-in student can probe `/student/lesson/<id>` for any assignment ID (including those belonging to other schools) and learn whether the ID is an assignment. Even though the page only selects `id` (not the assignment payload), this still:
  - Cross-tenant existence disclosure (an attacker can enumerate assignment IDs across schools).
  - Renders the wrong branch (lines 59-66) when the ID belongs to another school's assignment, then renders `<StandaloneLessonCard articleId={id} />` (line 73) — which then queries articles by ID with similar unscoped semantics.
  This is a fork-inherited RA pattern; the port to Drizzle preserved the unscoped query verbatim.
- Recommendation: Add a `schoolId` filter. Two reasonable shapes:
  ```ts
  .where(and(eq(assignments.id, id), eq(assignments.schoolId, user.schoolId)))
  ```
  or join through `users`:
  ```ts
  .innerJoin(users, eq(users.id, assignments.ownerId))
  .where(and(eq(assignments.id, id), eq(users.schoolId, user.schoolId)))
  ```
  Apply the same scoping to the `StandaloneLessonCard` lookup it triggers. This is also a Shared package migration blocker because the underlying `assignments` table schema and the typical access pattern need a tenant-registry classification (FLAT vs REFERENTIAL) and a `tenantDb`-scoped accessor; without that, every consumer must remember to add the filter, and this one forgot.

### LR-primary-advantage-004-012 — Lesson route renders any article/assignment ID with only an authentication check

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/app/[locale]/(student)/student/lesson/[id]/page.tsx:32-76`
- Evidence: The page authenticates the user (`if (!user) return redirect("/auth/signin")` line 33) but performs no authorization check on the lesson/assignment being requested. Three render paths exist:
  - Lines 40-46: `lessonType === "article"` → `<StandaloneLessonCard articleId={id} />`.
  - Lines 59-66: assignment branch → `<LessonCard id={id} />`.
  - Lines 70-76: default → `<StandaloneLessonCard articleId={id} />`.
  In all three branches, `id` is taken directly from the URL and passed to a child component. There is no check that `id` belongs to the user's school, classroom, or enrollment.
- Impact: Any authenticated user — including a primary-school student — can navigate to `/student/lesson/<other-schools-id>` and view lesson content intended for another school/classroom. Combined with finding LR-primary-advantage-004-011, even assignment IDs from other schools render their lesson UI. This is a fork-inherited RA pattern where the lesson route assumed the ID's tenant context was implicit; the AGENTS.md multi-tenancy requirement makes that assumption unsafe.
- Recommendation: After the `currentUser()` check, resolve the user's `schoolId` (and `classroomId` for assignment branch) and pass it down to `LessonCard` / `StandaloneLessonCard` so the child queries can filter on it. Treat this as a prerequisite for the multi-tenant Drizzle migration called out in the app's `AGENTS.md`.

## No-Finding Notes

- `apps/primary-advantage/app/[locale]/(student)/settings/layout.tsx`: 14 lines, all read. Layout-only wrapper around `AppLayout` with `disableLeaderboard={true}`. No data access, no auth gate. Acceptable for a thin layout; auth is enforced by the page-level components or the layout's children. No findings.
- `apps/primary-advantage/app/[locale]/(student)/student/assignments/page.tsx`: 13 lines, all read. Server component that calls `currentUser()` (lines 7, 11), returns `AuthErrorPage` if not authenticated, otherwise renders `StudentAssignmentTable`. Note that this page returns the error page instead of `redirect("/auth/signin")` (cf. the user-profile page which redirects) — a behavioral inconsistency between pages but not a bug per se. No findings flagged for this batch.
- `apps/primary-advantage/app/[locale]/(student)/student/history/page.tsx`: 24 lines, all read. Server component composing `Header`, `ReminderRereadTable`, `ArticleRecordsTable` with `next-intl` translations. Clean; no DB access in the page itself (delegated to the tables). No findings.
- `apps/primary-advantage/app/[locale]/(student)/student/layout.tsx`: 15 lines, all read. Layout wrapper around `AppLayout` with `studentPageConfig`. Note: the function is named `SettingsPageLayout` (line 4) which is a copy-paste leftover from `settings/layout.tsx` — a low-severity naming inconsistency that does not affect behavior. No material findings flagged.