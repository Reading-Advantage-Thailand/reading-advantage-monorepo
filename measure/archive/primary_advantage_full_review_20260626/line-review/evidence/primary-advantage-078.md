# Line Review Evidence: primary-advantage-078

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-078
Files assigned: 10
Lines assigned: 1014

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/data/title-a2.json | 1-609 | reviewed | 0 |
| apps/primary-advantage/data/whats-my-level-mean.json | 1-58 | reviewed | 0 |
| apps/primary-advantage/eslint.config.mjs | 1-10 | reviewed | 1 |
| apps/primary-advantage/hooks/use-current-role.ts | 1-8 | reviewed | 0 |
| apps/primary-advantage/hooks/use-current-user.ts | 1-12 | reviewed | 0 |
| apps/primary-advantage/hooks/use-layout.tsx | 1-160 | reviewed | 0 |
| apps/primary-advantage/hooks/use-lock-body.ts | 1-12 | reviewed | 0 |
| apps/primary-advantage/hooks/use-mobile.ts | 1-19 | reviewed | 0 |
| apps/primary-advantage/hooks/use-permissions.ts | 1-119 | reviewed | 0 |
| apps/primary-advantage/i18n/navigation.ts | 1-7 | reviewed | 0 |

## Findings

### LR-078-001 — Stale Prisma ignore in ESLint config

- Severity: Low
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/eslint.config.mjs:6`
- Evidence: Line 6 reads `{ ignores: [".next/", "node_modules/", "prisma/generated/"] }`. The `prisma/generated/` directory does not exist at `apps/primary-advantage/prisma/` and `@prisma/client` is not a dependency in `package.json`. The AGENTS.md for primary-advantage confirms Prisma was fully removed in Phase 8 of the Drizzle migration track. This is dead config left over from the Prisma era.
- Impact: No functional harm; dead ignore pattern adds confusion during audits and may mask future issues if the `prisma/` directory is accidentally recreated.
- Recommendation: Remove `"prisma/generated/"` from the ignores array in a cleanup task.

## No-Finding Notes

- `apps/primary-advantage/data/title-a2.json`: Static JSON data fixture containing 100 A2 Flyers-level story titles and descriptions for Grades 3-6. Pure content data with no logic, imports, or code paths. Reviewed line-by-line; no findings.
- `apps/primary-advantage/data/whats-my-level-mean.json`: Static JSON with CEFR level descriptions (A0 through C2) written in child-friendly language. No code or logic. Reviewed line-by-line; no findings.
- `apps/primary-advantage/hooks/use-current-role.ts`: Client hook wrapping `useSession()` from `@reading-advantage/auth-client` to return `user?.role`. 8 lines, minimal surface. Reviewed line-by-line; no findings.
- `apps/primary-advantage/hooks/use-current-user.ts`: Client hook wrapping `useSession()` from `@reading-advantage/auth-client` to return `user`. Drop-in replacement for old NextAuth session shape. Reviewed line-by-line; no findings.
- `apps/primary-advantage/hooks/use-layout.tsx`: React context provider managing "fixed" vs "full" layout with localStorage persistence. Handles hydration safely with `isHydrated` state, catches localStorage errors, and properly cleans up event listeners. Reviewed line-by-line; no findings.
- `apps/primary-advantage/hooks/use-lock-body.ts`: Hook that locks body scroll via `useLayoutEffect` and restores original overflow on cleanup. 12 lines. Reviewed line-by-line; no findings.
- `apps/primary-advantage/hooks/use-mobile.ts`: Standard responsive design hook using `matchMedia` with 768px breakpoint. Follows shadcn/ui pattern. Reviewed line-by-line; no findings.
- `apps/primary-advantage/hooks/use-permissions.ts`: Client hook exposing permission-checking utilities (`hasPermission`, `withPermissions` HOC, `PermissionGuard` component). Delegates to `@/lib/permissions` which implements role hierarchy and school admin checks. Reviewed line-by-line; no findings.
- `apps/primary-advantage/i18n/navigation.ts`: 7-line file creating next-intl navigation wrappers (`Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`) from the routing config. Reviewed line-by-line; no findings.
