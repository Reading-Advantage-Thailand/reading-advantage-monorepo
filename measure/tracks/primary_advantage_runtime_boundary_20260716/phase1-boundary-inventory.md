# Phase 1 Boundary Inventory

## Status

In progress. This inventory records the baseline discovered on 2026-07-16;
implementation may not start until the complete route/API disposition matrix
and canonical role contract are recorded.

## Hosted build evidence

TypeScript 7 migration CI run `29463854491` reached the Primary Advantage
build and failed on the existing runtime boundary. The same run proves the
new pinned graph process independently: `build-graph` scanned 3,018 files,
26,015 nodes, and 44,220 edges before the application build began.

The Primary failure includes a client import chain through
`user-reading-chart.tsx` → `@reading-advantage/db` → `postgres`. The proxy
chain is independently visible in source and must be removed before the
aggregate build can pass.

## Executable import denominator

### Proxy chain

```
apps/primary-advantage/proxy.ts
  -> apps/primary-advantage/lib/session.ts
  -> @reading-advantage/db (packages/db/src/index.ts)
  -> packages/db/src/client.ts
  -> postgres
```

`proxy.ts` currently calls `currentUser()` for sign-in redirects and protected
route checks. Its matcher excludes `/api`, so proxy matching cannot be treated
as API authorization.

### Client components

These four `"use client"` components have executable root-database imports and
are the fixed browser-runtime denominator:

1. `components/dashboard/user-reading-chart.tsx` — `activityType.ARTICLE_READ`.
2. `components/student-assignment-table.tsx` — `assignmentStudents` is used to
   infer a row type but is still an executable schema import.
3. `components/system/edit-license-form.tsx` — executable `licenses` schema import.
4. `components/system/license-table.tsx` — executable `licenses` schema import.

`components/articles/questions/mc-question-card.tsx` imports a database enum
but is an async server component, so it is not part of the browser denominator.
`types/index.d.ts` contains a declaration-only database type query; it does not
emit browser code but must be audited as part of the client-contract cleanup.

## Authorization inventory

### Canonical server roles

The authoritative roles in `packages/db/src/schema/users.ts` and
`packages/auth/src/roles.ts` are:

```
INTERN | STUDENT | TEACHER | ADMIN | SYSTEM | SALES_REP | SALES_ADMIN
```

`validateSession` returns this server value through `lib/session.ts`.
Primary's proxy and `types/enum.ts`, however, compare lower-case values. The
old route-group policy intends admin=`admin|system`,
teacher=`teacher|admin|system`, student=`student|teacher|admin|system`,
system=`system`, and settings=`user|student|teacher|admin|system`.

The implementation must use the uppercase shared server roles as the canonical
authorization contract, express the intended route groups with those values,
and keep any lower-case conversion presentation-only. `INTERN`, `SALES_REP`,
and `SALES_ADMIN` require an explicit allowed/denied disposition before code is
changed; they may not be silently omitted.

### Server surfaces

Student, settings, admin, teacher, and system layouts delegate to
`components/shared/app-layout.tsx`. It validates sign-in with `getCurrentUser()`
but does not enforce a role; page grouping currently relies on the proxy.
Several individual pages import `lib/session.ts`; initial audit examples include
student settings/profile/assignments/lesson/read/reports and teacher
assignments/dashboard/reports/student-progress. Phase 1 must enumerate their
role needs rather than infer them from directory names alone.

There are 64 API handlers. Thirty directly import `@/lib/session`; the other
34 require a disposition because a controller may resolve sessions indirectly
or an endpoint may be intentionally public. `debug/init-roles` is a direct DB
role-mutation endpoint without an evident session guard and is a separately
owned security finding unless the API matrix demonstrates an existing boundary.

## Existing tests and gates

Primary has no proxy/session/import-boundary test. Its Vitest configuration
includes `lib/**/*` and `**/__tests__/**`; existing app tests are unrelated.
Shared auth tests cover validation mechanics but do not prove Primary's proxy,
layout, or API behavior.

Existing scoped commands are:

```
CI=true pnpm --filter primary-advantage test
pnpm --filter primary-advantage check-types
pnpm turbo run lint --filter=primary-advantage
pnpm --filter primary-advantage build
```

`check-types:compat` is not a Primary manifest script. The pre-existing
`next.config.ts` setting `typescript.ignoreBuildErrors: true` is baseline debt;
this track must neither enable nor broaden it.

## Hosted CI trigger

Root CI runs on a pull request only for a limited path set and omits
`apps/primary-advantage/**`. A Primary-source-only pull request therefore does
not trigger the root build. The implementation must add that path and prove its
hosted behavior before this track can satisfy its CI acceptance criterion.
