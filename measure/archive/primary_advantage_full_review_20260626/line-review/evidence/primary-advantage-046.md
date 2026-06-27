# Line Review Evidence: primary-advantage-046

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-046
Files assigned: 3
Lines assigned: 599

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/nav/new-mobile-nav.tsx` | 1-147 | reviewed | 2 |
| `apps/primary-advantage/components/nav/sidebar-nav.tsx` | 1-283 | reviewed | 2 |
| `apps/primary-advantage/components/nav/user-account-nav.tsx` | 1-169 | reviewed | 4 |

## Findings

### LR-primary-advantage-046-001 — `MobileLink` double-navigates: `Link` + `router.push` race condition bypasses locale prefixing

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/nav/new-mobile-nav.tsx:135-140`
- Evidence: The `MobileLink` component renders a `<Link href={href}>` (line 135) which already handles client-side navigation via next-intl's locale-aware router. However, the `onClick` handler on line 137-140 also calls `router.push(href.toString())` before closing the popover. This triggers two competing navigations: the `Link` component resolves the locale-prefixed path (e.g., `/en/student/read`) while `router.push(href.toString())` pushes the raw `href` value (e.g., `/student/read`) without locale prefixing. The `useRouter` import on line 5 is from `@/i18n/navigation`, which may or may not add locale prefixing on `.push()`, but the double-fire is still a race condition.
- Impact: Mobile users tapping a nav link may experience a flicker, double-render, or navigation to a non-locale-prefixed URL, which could 404 or fall back to the default locale. For primary students on mobile devices (the primary use case for a mobile nav), this creates a confusing UX. No Reading Advantage counterpart exists for this file, so this is a fork-specific regression.
- Recommendation: Remove the `router.push(href.toString())` call from the `onClick` handler. Keep only `onOpenChange?.(false)` to close the popover after the `Link` navigates. If the `Link` component does not reliably close the popover, use `router.push(href)` (with locale-aware router) instead of duplicating navigation.

### LR-primary-advantage-046-002 — 26-line commented-out tree-rendering block in `MobileNav`

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/nav/new-mobile-nav.tsx:89-114`
- Evidence: Lines 89-114 contain a fully commented-out JSX block that previously rendered a tree-based navigation structure using `group.type === "folder"` and `item.type === "page"` checks. The active code path (lines 76-85) renders a flat `items.map()` instead. The commented-out block references `tree?.children?.map(...)` and `source.pageTree` (the import on line 7 is also commented out).
- Impact: Dead code increases the file's effective noise-to-signal ratio and creates confusion about whether tree-based navigation is planned. For a line-review, 26 lines of dead JSX reduce readability. No functional impact.
- Recommendation: Either remove the commented-out block entirely (the flat items approach is the current contract) or add a brief comment explaining why tree-based navigation is deferred.

### LR-primary-advantage-046-003 — `sidebar-nav.tsx` uses pervasive `any` types in helper functions

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/nav/sidebar-nav.tsx:65,69,74,81,85,90`
- Evidence: Six helper functions accept `any` typed parameters instead of `SidebarNavItem`:
  - `isAnyChildActive(items: any[])` — line 65
  - `hasExactChildMatch(items: any[])` — line 69
  - `hasItemPermission(item: SidebarNavItem | any)` — line 74
  - `shouldHideItem(item: SidebarNavItem | any)` — line 81
  - `isItemLocked(item: SidebarNavItem | any)` — line 85
  - `filterItems(itemsList: any[])` — line 90
  The `SidebarNavItem | any` union resolves to `any`, making the `SidebarNavItem` annotation meaningless. The component already imports `SidebarNavItem` from `@/types` (line 5) but does not use it consistently.
- Impact: TypeScript cannot catch property-access errors on sidebar items at compile time. If `SidebarNavItem` adds or renames a field (e.g., `requiredPermissions`), callers using `any` will silently pass invalid shapes. This undermines the type-safety contract that the rest of the component relies on.
- Recommendation: Replace `any[]` with `SidebarNavItem[]` in all six helpers. Remove the `| any` union from `hasItemPermission`, `shouldHideItem`, and `isItemLocked`. If `SidebarNavItem`'s type definition is incomplete, widen it in `types/index.d.ts` instead of using `any`.

### LR-primary-advantage-046-004 — `sidebar-nav.tsx:107` uses `window.history.back()` instead of Next.js router

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/nav/sidebar-nav.tsx:107`
- Evidence: Line 107: `<button onClick={() => window.history.back()}>`. The component already imports `useRouter` or has access to the Next.js router through `next-intl` navigation, but the "back" button bypasses the framework's client-side navigation and calls the browser History API directly. This is inside a conditional block that renders only when the pathname starts with `/settings` (line 103).
- Impact: `window.history.back()` may navigate the user to an external site if the browser history stack includes an external referrer. It also skips Next.js's route-change lifecycle (page-transition events, shallow routing). Minor UX inconsistency for primary students navigating settings.
- Recommendation: Use `router.back()` from Next.js's `useRouter()` hook (which is already imported from `@/i18n/navigation` on line 2) for consistent client-side navigation behavior.

### LR-primary-advantage-046-005 — `user-account-nav.tsx:138` hardcodes external Google Form URL in a primary-student-facing menu

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/nav/user-account-nav.tsx:136-142`
- Evidence: Line 138: `href="https://docs.google.com/forms/d/e/1FAIpQLSe_Ew100kef6j4O4IuiHm4ZeGhOj5FN6JRyJ7-0gvZV9eFgjQ/viewform?usp=sf_link"`. The "Contact Us" dropdown item links to a hardcoded personal Google Form URL with `target="_blank"`. The URL is not translatable (the label `t("contactUs")` is translated, but the destination is fixed). The URL contains a long encoded form ID that cannot be updated without a source change and redeployment.
- Impact: Primary students (ages 5-12) clicking "Contact Us" are navigated to an external Google Form outside the app's control. The form may collect personal data (Google account, IP) without age-appropriate consent. The hardcoded URL cannot be changed per-school, per-locale, or per-deployment. This is a primary-student adaptation risk because the Reading Advantage equivalent (if any) targeted older students.
- Recommendation: Replace the hardcoded URL with a configurable contact/support URL from environment variables or a school-level setting. Add i18n support for the link destination. Consider routing through an in-app contact form that respects the app's data-handling policies for minors.

### LR-primary-advantage-046-006 — `user-account-nav.tsx:17` imports `useCurrentUser` but never uses it

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/nav/user-account-nav.tsx:17`
- Evidence: Line 17: `import { useCurrentUser } from "@/hooks/use-current-user";`. The `useCurrentUser` hook is imported but never called or referenced anywhere in the component. The component receives its user data via the `user: AuthUser` prop (line 21-22) and does not need the hook.
- Impact: Dead import adds a unnecessary dependency and may trigger tree-shaking warnings. No functional impact. Indicates incomplete cleanup from a refactor.
- Recommendation: Remove the unused import on line 17.

### LR-primary-advantage-046-007 — `user-account-nav.tsx:159` unreachable `setIsLoading(false)` after full-page redirect

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/nav/user-account-nav.tsx:154-159`
- Evidence: Lines 154-159: the logout handler sets `setIsLoading(true)` (line 156), awaits `logout()` (line 157), then sets `window.location.href = "/"` (line 158), and finally calls `setIsLoading(false)` (line 159). The `window.location.href` assignment triggers a full-page navigation, so the React component unmounts and `setIsLoading(false)` on line 159 never executes. The `isLoading` state therefore remains `true` until the page unloads.
- Impact: The logout button shows a spinner (`Loader2`) that never stops before the page navigates away. This is a minor cosmetic issue but is technically dead code. The pattern is common across both Reading Advantage and Primary Advantage (same root cause).
- Recommendation: Remove `setIsLoading(false)` on line 159 since it is unreachable, or replace `window.location.href = "/"` with `router.push("/")` if the intent is to stay in SPA navigation (though a full reload after logout is reasonable to clear all client state).

### LR-primary-advantage-046-008 — `user-account-nav.tsx:106-130` role-gated menu items use client-side role without server-side verification hint

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/nav/user-account-nav.tsx:106-130`
- Evidence: Lines 106-130 conditionally render "Teacher Dashboard", "Admin Dashboard", and "System Dashboard" links based on `user?.role === Role.teacher`, `Role.admin`, and `Role.system`. The `user` object comes from the `AuthUser` type (line 16) via the `@reading-advantage/auth-client` package. The component trusts the client-side `user.role` claim for UI gating. If the auth session's role claim is stale (e.g., after a role downgrade), the menu still shows the old dashboard links. The server-side route protection is the actual authorization gate, but the UI provides no feedback when a user clicks a dashboard link they can no longer access.
- Impact: A teacher whose role was downgraded to student sees the "Teacher Dashboard" link until their session refreshes. Clicking the link leads to a server-side rejection with no graceful UX. This is the same pattern used in Reading Advantage (same root cause).
- Recommendation: Consider adding a server-side role re-validation on session refresh, or add error-boundary handling in the dashboard routes that redirects unauthorized users with a clear message. The UI gating is a convenience, not a security boundary, so this is a medium-severity UX issue.

## No-Finding Notes

- `apps/primary-advantage/components/nav/new-mobile-nav.tsx`: reviewed line-by-line (lines 1-147); aside from findings 001 and 002, the component uses standard Radix Popover primitives, proper i18n via `useTranslations("MainNav")`, and accessible hamburger-menu animation. No additional findings.
- `apps/primary-advantage/components/nav/sidebar-nav.tsx`: reviewed line-by-line (lines 1-283); aside from findings 003 and 004, the component correctly uses `hasPermission`/`hasAnyPermission` from `@/lib/permissions` for client-side UI gating, proper Collapsible/Tooltip Radix primitives, and i18n via `useTranslations("Sidebar")`. The permission system (`lib/permissions.ts`) defines a role hierarchy and permission map that is reasonable for the app's domain. No additional findings.
- `apps/primary-advantage/components/nav/user-account-nav.tsx`: reviewed line-by-line (lines 1-169); aside from findings 005-008, the component correctly uses the `@reading-advantage/auth-client` adapter for logout, renders role badges with translated labels, and uses proper Radix DropdownMenu primitives. No additional findings.
