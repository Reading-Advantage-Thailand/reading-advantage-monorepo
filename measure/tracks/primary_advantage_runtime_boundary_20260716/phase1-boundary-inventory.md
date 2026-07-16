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

### API disposition matrix

The following source-level classification is an inventory, not an assertion
that every endpoint is correctly authorized. Phase 2/3 must make protected
endpoint behavior explicit and file separately owned findings where that would
otherwise expand the runtime-boundary repair.

| Classification | Files / behavior | Count |
|---|---|---:|
| Direct session guard | `classroom/[id]`, `classroom`, `classrooms`; `debug/auth`, `debug/school`; 12 flashcard route files; `lessons/[articleId]/activity`, `lessons/[articleId]/progress`, `lessons`; `licenses/[id]`, `licenses`; `schools/ranking`, `schools`, `students/leaderboard`; `upload/classes`, `upload/csv`; and seven `users/**` route files call `currentUser`/`getCurrentUser` and locally reject absent users. | 29 |
| Direct session read without local decision | `users/[id]` PATCH reads `currentUser()` but does not use it for target or role authorization. | 1 |
| Controller-mediated session guard | Article custom-generation/save/approve routes; assignment progress; classroom available-students/enroll/generate-code/unenroll/students; and student/teacher CRUD routes delegate to controller functions that call `currentUser`. | 14 |
| Mixed controller behavior | `assignments/[id]`: POST delegates to guarded progress work, while GET calls `fetchAssignmentById` without an evident session check. | 1 |
| Controller-mediated no local session in called function | Article fetch/generate/question routes, assignment fetch routes, student-assignment fetch, teacher-assignment fetch, and activity-log update delegate to functions without an evident session check. | 8 |
| Inactive route file | `articles/questions/feedback/route.ts` has no active exported handler. | 1 |
| Shared auth adapters | `auth/impersonate`, `login`, `logout`, `register`, `reset-password`, and `session` delegate to the shared auth adapter. | 6 |
| No evident auth | `assistant/lesson-chatbot`, `debug/init-roles`, `send`, and `upload/csv/cleanup` have no evident route-source session guard. | 4 |

Direct role checks are inconsistent:
`licenses` and `schools` use uppercase values, while `classrooms`, uploads,
and some school-admin handlers use lower-case role data. This is why the track
cannot carry both representations into its server guards.

### Protected page/layout disposition

The admin, teacher, system, student, and settings layouts all delegate to
`components/shared/app-layout.tsx`. That component validates only that a user
exists; it does not apply a route role group. Consequently the proxy is the
only current source of page-role enforcement, despite excluding all API routes.

Individual pages have inconsistent checks: several student and teacher pages
redirect or raise on an absent user, teacher reports has a commented role
restriction, and the article-read page uses a lower-case substring role check.
The final Phase 1 matrix must translate each protected group to the selected
uppercase canonical roles and distinguish intentionally public index/auth
surfaces from protected routes.

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
