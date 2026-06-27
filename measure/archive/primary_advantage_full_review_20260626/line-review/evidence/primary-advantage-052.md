# Line Review Evidence: primary-advantage-052

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-052
Files assigned: 5
Lines assigned: 617

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/school/school-profile-form.tsx` | 1-242 | reviewed | 2 |
| `apps/primary-advantage/components/shared/app-layout.tsx` | 1-95 | reviewed | 0 |
| `apps/primary-advantage/components/shared/change-role.tsx` | 1-187 | reviewed | 2 |
| `apps/primary-advantage/components/site-config.tsx` | 1-33 | reviewed | 0 |
| `apps/primary-advantage/components/site-header.tsx` | 1-60 | reviewed | 1 |

## Findings

### LR-primary-advantage-052-001 — Undefined `update`/`session` variables in school creation callback

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/school/school-profile-form.tsx:107-110`
- Evidence: After the POST to `/api/users/me/school` succeeds, the code calls `update({ ...session, user: { ...session?.user, role: "admin" } })`. Neither `update` nor `session` is declared or imported in this component. `useSession()` from `@reading-advantage/auth-client` (line 28, 68) destructures only `{ user }`. The `update` callback and `session` object are not returned. This will throw a ReferenceError at runtime when `school.roleUpgraded` is true.
- Impact: School creation succeeds on the server but crashes the client when the role-upgrade path is triggered, leaving the user on a broken page with no feedback. The session stale-matches the old role until a full page reload.
- Recommendation: Destructure `{ user, update, session }` from `useSession()` (if the client supports it) or remove the optimistic session update and rely on `router.refresh()` (line 130) to pick up the new role.

### LR-primary-advantage-052-002 — Missing Content-Type header in role-change PATCH request

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/shared/change-role.tsx:73-75`
- Evidence: `fetch(`/api/users/${userId}`, { method: "PATCH", body: JSON.stringify({ role: selectedRole }) })` sends a JSON body without a `Content-Type: application/json` header. Compare with `school-profile-form.tsx:93-94` which correctly sets the header.
- Impact: The API route may fail to parse the body if it relies on `Content-Type` to select a parser, resulting in an empty or malformed request object.
- Recommendation: Add `headers: { "Content-Type": "application/json" }` to the fetch options.

### LR-primary-advantage-052-003 — Dynamic Tailwind class interpolation prevents JIT compilation

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/shared/change-role.tsx:174-176`
- Evidence: `hover:dark:bg-${color}-900` and `dark:bg-${color}-900 hover:dark:bg-${color}-800` use string interpolation for Tailwind class names. Tailwind's JIT compiler only detects complete class strings at build time; dynamic interpolation produces classes that are never generated. This is the same anti-pattern that exists in Reading Advantage's role-selection UI.
- Impact: The selected/hover color states never render because the generated CSS rules are absent from the build output. The role cards appear unstyled on selection.
- Recommendation: Use a mapping object from `color` to full Tailwind class strings, or use inline styles for dynamic colors.

### LR-primary-advantage-052-004 — Client-side role self-service UI exposed to primary students

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/shared/change-role.tsx:46-63`
- Evidence: The `ChangeRole` component renders Student/Teacher role cards to every authenticated user. In development mode, it also exposes Admin and System roles (lines 46-63). The component is a "use client" component that calls `PATCH /api/users/${userId}` directly. While the server should reject unauthorized role changes, the UI presents role-switching as a user-facing feature to primary-age students.
- Impact: Primary students see a confusing role-management interface. In development builds, admin/system role cards are visible. Even if the server rejects the change, the UX teaches children that role-switching is a normal platform feature.
- Recommendation: Gate the component behind a role check (only render for admin/teacher), or remove it from student-accessible routes entirely. Ensure development-only roles are truly gated.

### LR-primary-advantage-052-005 — Hardcoded brand color in site header

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/site-header.tsx:29`
- Evidence: `text-[#22d3ee]` is a hardcoded hex color (cyan-400) rather than a Tailwind theme token or CSS variable. The rest of the header uses `bg-background` and other semantic tokens.
- Impact: Brand color cannot be changed via theme configuration; breaks if a dark/light theme needs different brand emphasis. Minor inconsistency with the design system.
- Recommendation: Define a `--brand` CSS variable or Tailwind theme extension and use it consistently.

## No-Finding Notes

- `apps/primary-advantage/components/shared/app-layout.tsx`: reviewed line-by-line; server component that calls `getCurrentUser()`, redirects unauthenticated users, fetches leaderboard for students, and renders nav/sidebar/main layout. No authorization bypass, no tenant-scoping violation, no missing auth check. The `getSchoolLeaderboardController` is correctly scoped by `user.schoolId`.
- `apps/primary-advantage/components/site-config.tsx`: reviewed line-by-line; simple layout toggle button using `useLayout()` hook and `trackEvent()`. No security, auth, or data concerns.
