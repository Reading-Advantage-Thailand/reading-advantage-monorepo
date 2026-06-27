# Line Review Evidence: primary-advantage-067

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-067
Files assigned: 10
Lines assigned: 1198

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/ui/sidebar.tsx` | 1-726 | reviewed | 0 |
| `apps/primary-advantage/components/ui/skeleton.tsx` | 1-13 | reviewed | 0 |
| `apps/primary-advantage/components/ui/sonner.tsx` | 1-25 | reviewed | 0 |
| `apps/primary-advantage/components/ui/table.tsx` | 1-116 | reviewed | 0 |
| `apps/primary-advantage/components/ui/tabs.tsx` | 1-66 | reviewed | 0 |
| `apps/primary-advantage/components/ui/textarea.tsx` | 1-18 | reviewed | 0 |
| `apps/primary-advantage/components/ui/tooltip.tsx` | 1-61 | reviewed | 0 |
| `apps/primary-advantage/components/update-user-license.tsx` | 1-126 | reviewed | 4 |
| `apps/primary-advantage/components/user-avatar.tsx` | 1-26 | reviewed | 0 |
| `apps/primary-advantage/components.json` | 1-21 | reviewed | 0 |

## Findings

### LR-primary-advantage-067-001 — update-user-license: direct client-side fetch bypasses server actions

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/update-user-license.tsx:55-61`
- Evidence: The component makes a direct `fetch(\`/api/licenses/${userId}\`, { method: "PATCH", ... })` call (line 55) with `userId` passed as a prop from the client. Root AGENTS.md requires business logic in backend modules and server actions, not direct client-side API calls. The RA fork (`apps/reading-advantage/components/update-user-license.tsx:52`) has the same pattern with `/api/v1/licenses/${userId}`, indicating this is a shared root cause carried forward.
- Impact: Client-side code exposes the userId parameter and API route structure. No server-side authorization layer is enforced by the component; any client can call the endpoint with arbitrary userId values.
- Recommendation: Replace with a server action that performs authentication/authorization before updating the license.

### LR-primary-advantage-067-002 — update-user-license: unused `useSession` import

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/update-user-license.tsx:20`
- Evidence: `import { useSession } from "@reading-advantage/auth-client"` is imported on line 20 but never used in the component. The commented-out `// const { update } = useSession();` on line 45 confirms the session hook was considered but left dead. The RA fork does not have this import.
- Impact: Dead import adds bundle weight and confuses future maintainers about whether session integration was intended.
- Recommendation: Remove the unused import or complete the session integration.

### LR-primary-advantage-067-003 — update-user-license: unused `expired` prop

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/update-user-license.tsx:31`
- Evidence: The `expired` prop is declared (`expired?: string` on line 31) but never referenced in the component body. The RA fork uses `expired` to display the current license expiry date (`const date = new Date(expired)` on RA line 44, displayed on RA line 115). In Primary Advantage, the expiry display is commented out (lines 111-112) and the prop is unused.
- Impact: Dead code; developer confusion about whether license expiration handling was intentionally removed or accidentally orphaned during the fork.
- Recommendation: Either restore expiry display with i18n or remove the `expired` prop.

### LR-primary-advantage-067-004 — update-user-license: hardcoded English strings not internationalized

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/update-user-license.tsx:66,79-80,84-85`
- Evidence: Toast messages use hardcoded English strings: `"An error occurred."` (line 66), `"User license updated"` and `"The user license has been updated to ${data.license}"` (lines 79-80), `"Please try again later."` (line 85). The component imports and uses `useTranslations` for form labels (`t("license")` on line 100, `t("activate")` on line 121) but toast notifications are not translated. The RA fork had all hardcoded English too, but Primary Advantage targets primary students in non-English locales.
- Impact: Primary students and teachers in non-English locales will see English toast messages for license operations, creating a confusing UX. The partial i18n (form labels translated, toasts not) is inconsistent.
- Recommendation: Wrap toast message strings with the translation function.

## No-Finding Notes

- `apps/primary-advantage/components/ui/sidebar.tsx`: reviewed line-by-line (726 lines); standard shadcn/ui Sidebar component with Radix primitives, proper accessibility (`data-slot`, `data-sidebar`, `aria-label`, `sr-only`), cookie-based state persistence, keyboard shortcut (Ctrl/Cmd+B), and responsive mobile Sheet fallback. No security, auth, or tenant concerns in this UI primitive. Note: Reading Advantage has no equivalent `components/ui/sidebar.tsx` — it uses custom sidebar components (`sidebar-nav.tsx`, `sidebar-teacher-nav.tsx`, `sidebar-goals-widget.tsx`). This is an intentional product divergence adopting the shadcn/ui sidebar pattern.
- `apps/primary-advantage/components/ui/skeleton.tsx`: reviewed line-by-line (13 lines); minimal shadcn/ui Skeleton wrapper, no findings.
- `apps/primary-advantage/components/ui/sonner.tsx`: reviewed line-by-line (25 lines); thin Sonner/Toaster wrapper with next-themes integration, no findings.
- `apps/primary-advantage/components/ui/table.tsx`: reviewed line-by-line (116 lines); standard shadcn/ui Table with responsive overflow, proper accessibility, no findings.
- `apps/primary-advantage/components/ui/tabs.tsx`: reviewed line-by-line (66 lines); Radix Tabs wrapper, no findings.
- `apps/primary-advantage/components/ui/textarea.tsx`: reviewed line-by-line (18 lines); standard textarea with `aria-invalid` support and `field-sizing-content`, no findings.
- `apps/primary-advantage/components/ui/tooltip.tsx`: reviewed line-by-line (61 lines); Radix Tooltip wrapper with Portal rendering, no findings.
- `apps/primary-advantage/components/user-avatar.tsx`: reviewed line-by-line (26 lines); fork of RA `user-avatar.tsx` with lucide-react icon instead of custom `Icons.user`, `referrerPolicy="no-referrer"` preserved, no findings.
- `apps/primary-advantage/components.json`: reviewed line-by-line (21 lines); standard shadcn/ui config, no findings.
