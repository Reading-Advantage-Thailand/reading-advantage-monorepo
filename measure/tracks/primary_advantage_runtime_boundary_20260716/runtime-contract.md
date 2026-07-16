# Runtime Boundary Contract

## Decision

Primary authorization uses the uppercase shared `@reading-advantage/auth` role
values as its sole canonical server representation:

```
INTERN | STUDENT | TEACHER | ADMIN | SYSTEM | SALES_REP | SALES_ADMIN
```

Any lower-case labels in menus or presentation types are display-only. They
must never be compared with a validated session role or used in a server
authorization decision.

## Route policy

The browser/Proxy-safe route policy is exact, not hierarchy-derived:

| Route prefix | Requires a session | Allowed canonical roles |
|---|---:|---|
| `/admin` | yes | `ADMIN`, `SYSTEM` |
| `/teacher` | yes | `TEACHER`, `ADMIN`, `SYSTEM` |
| `/student` | yes | `STUDENT`, `TEACHER`, `ADMIN`, `SYSTEM` |
| `/system` | yes | `SYSTEM` |
| `/settings` | yes | all validated roles |

`INTERN`, `SALES_REP`, and `SALES_ADMIN` are denied from the four
role-restricted groups above. This preserves the existing Primary route-policy
denominator: it never granted a route group to those role names. All validated
roles may reach `/settings`, matching the existing authenticated-settings
intent. Their default post-sign-in destination in Primary is the neutral home
route until an app-owned route is explicitly added; numeric shared role
hierarchy must not make `SALES_ADMIN` a Primary administrator.

Prefix matching must operate after locale removal and must not treat
`/administer` as `/admin`.

## Browser, proxy, and server seams

1. `@reading-advantage/auth/browser` is a browser/proxy-safe package subpath.
   It exports `SESSION_COOKIE_NAME`, `ROLES`, and the erased `Role` type only.
   Its import graph must not reach database, session, server, password, or
   rate-limit modules.
2. `lib/auth/route-policy.ts` is browser/proxy-safe and uses that subpath to
   resolve a path to `{ requiresSession, allowedRoles? }`.
3. `proxy.ts` reads only `request.cookies.get(SESSION_COOKIE_NAME)`.
   It redirects a missing cookie from a protected route to sign-in, allows an
   opaque present cookie through to the server, and redirects a present cookie
   from sign-in only to the neutral localized home route. It performs no
   `validateSession`, user lookup, role lookup, or dashboard redirect.
4. `lib/auth/server-route-guard.ts` is Node-only. It receives an opaque token,
   calls `validateSession(db, token)`, then applies the route policy to the
   resulting canonical role. A cookie value never supplies a role claim.
5. Protected layouts and explicitly protected APIs call the Node guard. The
   API inventory remains the authoritative scope list; endpoints outside this
   repair receive an explicit disposition or a separate remediation finding.

## Client contracts

`lib/contracts/client.ts` is the browser-safe owner for:

- `ARTICLE_READ` and the pure reading-summary/deduplication helper used by the
  chart;
- JSON-shaped assignment DTOs plus pagination fields used by
  `student-assignment-table.tsx`;
- JSON-shaped license and school DTOs used by the license list and edit form.

The four browser components must depend on these contracts rather than Drizzle
schemas or `InferSelectModel`. Server components may retain database imports
where their runtime boundary permits them.

## CI contract

Root pull-request CI must include `apps/primary-advantage/**`. The track’s
Primary-only pull request proves the root graph and build path execute; the
hosted full build remains the TS7 migration’s aggregate evidence.
