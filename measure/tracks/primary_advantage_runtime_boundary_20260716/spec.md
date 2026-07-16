# Specification: Primary Advantage Runtime Boundary Repair

## Overview

Restore a buildable Primary Advantage app by separating browser/proxy code from
Node-only Postgres and server-session validation. This is an existing Primary
Advantage defect that blocks the TypeScript 7 migration's aggregate build gate;
it is deliberately owned by this dedicated bug track rather than the compiler
migration.

The reproducible import path is `proxy.ts` → `lib/session.ts` →
`@reading-advantage/db` → `postgres`. Four client components also execute-import
the root database barrel: `user-reading-chart.tsx`, `student-assignment-table.tsx`,
`edit-license-form.tsx`, and `license-table.tsx`.

The Phase 1 audit also found a role-policy ambiguity: the shared database and
auth adapter use uppercase roles (`INTERN`, `STUDENT`, `TEACHER`, `ADMIN`,
`SYSTEM`, `SALES_REP`, `SALES_ADMIN`), while Primary's proxy and presentation
types currently compare lower-case strings. The track must reconcile that
boundary before moving proxy authorization behind server guards.

## Functional Requirements

### FR-1: Enforce runtime-safe import boundaries

`apps/primary-advantage/proxy.ts` and every `"use client"` component must have
no direct or transitive executable dependency on `@reading-advantage/db`,
`postgres`, or server-only session helpers. Database access and cookie/session
resolution remain Node-only.

### FR-2: Preserve authoritative authentication and authorization

Session tokens must be validated with `validateSession(db, token)` on the
server before a protected route, API, or role-sensitive action is authorized.
Phase 1 must select and document one canonical server-role representation plus
an explicit presentation mapping, including dispositions for `INTERN`,
`SALES_REP`, and `SALES_ADMIN`. The proxy may make only an optimistic redirect
decision from cookie presence; it must not treat a cookie or client-provided
role as a valid session or authorization decision.

### FR-3: Provide browser-safe client contracts

Replace the four client database imports with browser-safe DTOs, type-only
contracts, and runtime constants. Preserve the reading chart's article filter,
student assignment display, and license edit/list behavior without importing
Drizzle schemas or the database barrel into a client bundle.

### FR-4: Keep Node dependencies server-only

Only after the proxy/client import paths are clean, add the minimum proven
Next.js configuration required to externalize `postgres` for Node server
bundles, if that configuration is still needed. Do not introduce browser or
proxy polyfills, webpack fallbacks, or ignored build errors.

### FR-5: Make the regression detectable

Add focused behavioral and import-boundary tests. They must fail if a proxy or
client component regains an executable database path, or if malformed, expired,
or revoked sessions can access a server-protected surface.

### FR-6: Make Primary changes exercise hosted CI

The root CI pull-request path filter must include
`apps/primary-advantage/**`, so a Primary-only repair cannot bypass the root
build that exposed this defect.

## Non-Functional Requirements

- Preserve the actual shared server-role policy after Phase 1 makes its
  canonical representation and presentation mapping explicit; do not silently
  drop `INTERN`, `SALES_REP`, or `SALES_ADMIN`.
- Keep the repair independent of the TypeScript 7 migration, Next.js version
  upgrades, database schema/migrations, provider changes, and deployment.
- Do not weaken server authorization, trust client claims, add shims, enable or
  broaden the pre-existing `ignoreBuildErrors` setting, or suppress failing
  tests.
- Add Google-style JSDoc to every newly exported function, class, interface,
  and type alias.

## Acceptance Criteria

1. `pnpm --filter primary-advantage build` succeeds on CI's Node version
   without a `postgres`/Node-builtin proxy or browser-bundle failure.
2. `proxy.ts` has no executable path to `@reading-advantage/db`, `postgres`,
   `next/headers`, or the Node-only session resolver.
3. The four known client components have no executable root-database or
   Drizzle-schema import and retain their current browser-visible behavior.
4. Missing, malformed, expired, and revoked session cookies cannot pass a
   protected server-side route/API guard; every shared server role has an
   explicit allowed/denied disposition and valid users retain only their
   intended route groups.
5. The scoped lint, test, TypeScript compatibility check, native type check,
   and build gates have recorded outcomes; unrelated pre-existing failures are
   classified rather than suppressed.
6. A hosted root build confirms the original TypeScript 7 aggregate-gate
   blocker is removed without claiming unrelated app failures are fixed.
7. A Primary-source-only pull request triggers the root CI workflow and
   exercises the hosted graph/build path.

## Out of Scope

- TypeScript 7 migration changes, TypeScript alias changes, benchmark changes,
  or TS7 CI-lane promotion.
- Next.js 16.3+ adoption or any major framework upgrade.
- Database schema changes, Prisma/Drizzle migration work, authentication-model
  changes, cookie-policy changes, or broad legacy API/domain refactors.
- Cloud Run/deployment changes and the existing Primary type-error backlog.
- A broad remediation of every legacy Primary API authorization finding; Phase
  1 records a complete API disposition matrix and files independently owned
  findings rather than silently expanding this runtime-boundary repair.
