# Workspace build fixes

Date: 2026-09-08

## Result

The utils package now exports `./structured-error` as a server-specific subpath.

Ten auth routes now import the logger through that subpath. The review covered all 15 migrated auth routes.

The other five routes do not import the logger. No migrated route imports the aliased utils root.

The Accounts adapter imports the compiled private backend adapter directly.

This path preserves trusted ownership and uses the same compiled request context as the backend package.

The Primary proxy no longer exports a runtime segment option. Next.js 16 always runs Proxy on Node.js.

The repository contains no other proxy runtime export.

Advantage Games now owns copies of the existing Geist variable font files. The layout loads them through local relative paths.

The CSS variable names and weight range remain unchanged. Production builds no longer require Google Fonts access.

## Validation

The Accounts route boundary suite passed seven tests after the compiled adapter change.

The Advantage Games layout suite passed three tests.

The added test verifies both local paths, CSS variables, and the variable weight range.

`cmp` confirmed that both local files match the established repository font bytes.

Focused ESLint passed for Accounts, Accounting, Sales, Codecamp, Advantage Games, and the Primary proxy.

The structured-error package subpath resolved through Node with the expected function export.

A source audit covered 15 migrated auth routes. It also verified the proxy and both local font files.

`git diff --check` passed for all files in this repair.

No full build ran during the existing workspace build.

## Changed files

- `packages/utils/package.json`
- `apps/accounts/lib/server/company-identity-route-bindings.ts`
- `apps/accounting/app/api/auth/callback/route.ts`
- `apps/accounting/app/api/auth/logout/route.ts`
- `apps/accounting/app/api/auth/session/route.ts`
- `apps/codecamp-advantage/app/api/auth/callback/route.ts`
- `apps/codecamp-advantage/app/api/auth/login/route.ts`
- `apps/codecamp-advantage/app/api/auth/logout/route.ts`
- `apps/codecamp-advantage/app/api/auth/reset-password/route.ts`
- `apps/sales-advantage/app/api/auth/callback/route.ts`
- `apps/sales-advantage/app/api/auth/login/route.ts`
- `apps/sales-advantage/app/api/auth/logout/route.ts`
- `apps/primary-advantage/proxy.ts`
- `apps/advantage-games/src/app/layout.tsx`
- `apps/advantage-games/src/app/layout.test.tsx`
- `apps/advantage-games/src/fonts/GeistVF.woff`
- `apps/advantage-games/src/fonts/GeistMonoVF.woff`

The incremental graph update covered 13 production TypeScript files.
