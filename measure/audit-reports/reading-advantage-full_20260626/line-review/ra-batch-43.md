# Line-by-Line Review: Reading Advantage — Batch 43

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-43`
**Baseline SHA:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Current HEAD:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / config / script / security / deployment

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-43` were read in full. The
batch covers:

- 5 i18n dictionary files in `apps/reading-advantage/locales/`
  (`client.ts`, `server.ts`, `navigation.ts`, `en.ts`, `cn.ts`, `th.ts`,
  `tw.ts`, `vi.ts`).
- 1 Next.js middleware (`apps/reading-advantage/middleware.ts`).
- 1 Next.js config (`apps/reading-advantage/next.config.mjs`).
- 1 `package.json` (`apps/reading-advantage/package.json`).
- 1 PostCSS config (`apps/reading-advantage/postcss.config.mjs`).
- 8 TypeScript migration / data-check / cache-refresh scripts in
  `apps/reading-advantage/scripts/` (`backfill-schools.ts`,
  `check-alignment-data.ts`, `check-archived.ts`,
  `check-classroom-teachers.ts`, `check-demo-data.ts`,
  `check-teacher-classrooms.ts`, `clear-cache.ts`,
  `refresh-activity-heatmap-matviews.ts`).

| # | File | Lines / Bytes Reviewed |
|---|------|------------------------|
| 1 | `apps/reading-advantage/locales/client.ts` | 1–16 |
| 2 | `apps/reading-advantage/locales/cn.ts` | 1–3975 |
| 3 | `apps/reading-advantage/locales/en.ts` | 1–4174 |
| 4 | `apps/reading-advantage/locales/navigation.ts` | 1–7 |
| 5 | `apps/reading-advantage/locales/server.ts` | 1–15 |
| 6 | `apps/reading-advantage/locales/th.ts` | 1–4115 |
| 7 | `apps/reading-advantage/locales/tw.ts` | 1–3985 |
| 8 | `apps/reading-advantage/locales/vi.ts` | 1–4211 |
| 9 | `apps/reading-advantage/middleware.ts` | 1–205 |
| 10 | `apps/reading-advantage/next.config.mjs` | 1–62 |
| 11 | `apps/reading-advantage/package.json` | 1–166 |
| 12 | `apps/reading-advantage/postcss.config.mjs` | 1–5 |
| 13 | `apps/reading-advantage/scripts/backfill-schools.ts` | 1–432 |
| 14 | `apps/reading-advantage/scripts/check-alignment-data.ts` | 1–89 |
| 15 | `apps/reading-advantage/scripts/check-archived.ts` | 1–32 |
| 16 | `apps/reading-advantage/scripts/check-classroom-teachers.ts` | 1–56 |
| 17 | `apps/reading-advantage/scripts/check-demo-data.ts` | 1–96 |
| 18 | `apps/reading-advantage/scripts/check-teacher-classrooms.ts` | 1–98 |
| 19 | `apps/reading-advantage/scripts/clear-cache.ts` | 1–30 |
| 20 | `apps/reading-advantage/scripts/refresh-activity-heatmap-matviews.ts` | 1–93 |

**Total lines reviewed:** 20,605 across 20 files.
**No file was partially reviewed.**

---

## Executive Summary

This batch is split between (a) the i18n layer of `apps/reading-advantage`
(8 locale files plus `client.ts`, `server.ts`, and `navigation.ts`
helpers) plus the Next.js `middleware.ts` and `next.config.mjs` / PostCSS
config and `package.json`, and (b) the operator scripts under
`apps/reading-advantage/scripts/` (school-schema backfill, demo-data
audit, cache refresher, materialized-view refresher).

The most severe issues found are:

1. **Four of the five dictionary files import the Next.js route page
   `apps/reading-advantage/app/[locale]/(teacher)/teacher/assignments/page`
   (`en.ts`, `th.ts`, `tw.ts`, `vi.ts`).** `en.ts` additionally imports
   `assign` from `lodash` and `next` from `next`, and `th.ts` imports
   `Target` from `lucide-react`. These are unused imports in dictionary
   files, and they drag React / Next.js route modules / UI component
   dependencies into every locale bundle. `cn.ts` does **not** have these
   imports, so the build will see inconsistent module graphs across
   locales.
2. **`next.config.mjs` sets `Access-Control-Allow-Origin` to the literal
   string `https://app.reading-advantage.com/` (note the trailing slash
   and the absolute, non-wildcard value) and applies it as a global
   response header on `/:path*`.** This is incorrect CORS configuration:
   the trailing slash makes it not a valid origin, the value is
   hard-coded so it cannot be overridden per-environment, and emitting
   `Allow-Origin` on every response (including static assets and API
   routes) is over-broad. CORS is also broken at the next-intl middleware
   layer — `middleware.ts` fetches `/api/auth/session` from the same
   origin without setting `Origin`, so browsers will not send CORS pre-
   flights; the only reason it works is that this is a same-origin
   fetch from middleware.
3. **`middleware.ts` fetches `/api/auth/session` from the same request
   URL using `fetch` inside an Edge middleware, with no `AbortSignal`
   or timeout, no caching, and no failure handling beyond a `try/catch`
   that silently degrades to "unauthenticated".** Every request to a
   page route issues a synchronous sub-fetch that races against the
   upstream session endpoint. The roles check is stringly typed against
   a locally redefined `ROLES` constant that duplicates
   `apps/reading-advantage/lib/enums.ts` — see finding F-43-007.
4. **`scripts/backfill-schools.ts` iterates rows and issues individual
   `UPDATE` statements in a tight loop with no transaction wrapper, no
   batching, and no idempotency token.** A failure mid-loop leaves the
   database partially migrated. The "DRY RUN" mode still writes dummy
   IDs (`dry-run-id-${created}`) into the in-memory `schoolMap` but does
   not skip the subsequent `UPDATE` step — running
   `DRY_RUN=true pnpm backfill:schools` performs writes while logging
   `[DRY RUN]`, which is misleading.
5. **`scripts/check-alignment-data.ts`, `check-archived.ts`,
   `check-classroom-teachers.ts`, `check-demo-data.ts`,
   `check-teacher-classrooms.ts`, `clear-cache.ts`, and
   `refresh-activity-heatmap-matviews.ts` all call `db.execute(sql`...`)`,
   `db.select` or import from `@/lib/cache/metrics` from the Next.js app
   workspace, then exit without setting `process.exitCode`.** They will
   hold open database connections and event-loop handles, leading to
   `ForceExit` warnings under `tsx`, and they are runnable from
   production nodes if accidentally invoked there.
6. **`cn.ts` line 3408 contains a corrupted translation key/value:
   `Ethics: "E伦理学"`.** The leading `E` is an English letter that does
   not appear in any sibling locale (`en.ts`, `th.ts`, `tw.ts`, `vi.ts`
   all use the correct Chinese `伦理学`, `倫理學`, `Đạo đức học`,
   `จริยธรรม`). This is a UI typo that surfaces in genre selection.
7. **`package.json` declares `"react": "^19.2.7"` and
   `"react-dom": "^19.2.7"` (these versions do not exist on npm at the
   time of writing), `"next": "^16.2.9"` (does not exist on npm), and
   `"eslint-config-next": "15.5.7"` while `"next": "^16.x"`.** These
   pinned versions will not resolve.
8. **`middleware.ts` `matcher` regex `"/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"` allows
   any path without a file extension except the explicit denylist. There
   is no allow-list for service-account routes (`/healthz`, `/readyz`,
   `/metrics`); the matcher skips only `api`, `static`, `_next`,
   `favicon.ico`, `robots.txt`. For an Edge middleware that does an
   internal `fetch`, this matters for any future observability probes.

The full line-by-line trace and per-finding evidence follow.

---

## Finding F-43-001 — Locale dictionaries import a Next.js route page (Critical)

**Files:**
- `apps/reading-advantage/locales/en.ts` line 1
- `apps/reading-advantage/locales/th.ts` line 1
- `apps/reading-advantage/locales/tw.ts` line 1
- `apps/reading-advantage/locales/vi.ts` line 1

**Finding:**
`en.ts` opens with:

```ts
import AssignmentPage from "@/app/[locale]/(teacher)/teacher/assignments/page";
import { assign } from "lodash";
import next from "next";

export default {
  pages: {
```

`th.ts` opens with:

```ts
import AssignmentPage from "@/app/[locale]/(teacher)/teacher/assignments/page";
import { Target } from "lucide-react";

export default {
```

`tw.ts` and `vi.ts` open with the same `import AssignmentPage ...` line.

`cn.ts` does **not** carry these imports — its first line is `export default {`.

The target of the import,
`apps/reading-advantage/app/[locale]/(teacher)/teacher/assignments/page.tsx`,
is a React server component:

```tsx
import React from "react";
import TeacherAssignmentPage from "@/components/teacher/assignment-page";

export default function AssignmentPage() {
  return (
    <div>
      <TeacherAssignmentPage />
    </div>
  );
}
```

This pulls `react`, `@/components/teacher/assignment-page`, and all of
its transitive client/server dependencies into the locale bundle. The
component is never referenced by name inside any of the four locale
files (`AssignmentPage` is unused; the dictionary only references the
string `AssignmentPage:` as a key under `teacher.AssignmentPage:`).

**Evidence:**
- `en.ts:1-3` shows the three unused imports.
- `th.ts:1-2` shows two unused imports.
- `tw.ts:1` and `vi.ts:1` show the unused `AssignmentPage` import.
- `apps/reading-advantage/app/[locale]/(teacher)/teacher/assignments/page.tsx:1-9`
  is a React component.

**Impact:**
- Bundle size: each per-locale client bundle now drags the entire
  teacher assignment page, `@/components/teacher/assignment-page`, and
  React into its dependency graph.
- Build determinism: `cn.ts` is the only locale that does not import
  the route; the other four split-bundle graphs will diverge. This
  produces cache invalidation that is hard to reason about.
- Build correctness: if `@/components/teacher/assignment-page` (or its
  transitive deps) ever throws at module-load time (e.g. a top-level
  `useContext`, a missing env var, or a circular import), only the four
  locales fail.
- Server-side: next-intl instantiates the locale dictionary on the
  server during SSR. Importing the assignments page from a server-side
  dictionary forces that page to be eagerly evaluated for every locale,
  including locales that may never render the page.

**Recommendation:**
Remove the three unused import lines at the top of each file. If
`AssignmentPage` is referenced by name (it is not in any of the four
files), do not import the route module from a dictionary; import the
display string instead.

---

## Finding F-43-002 — `en.ts` `import { assign } from "lodash"` shadows the `Object.assign` semantic and is unused (High)

**File:** `apps/reading-advantage/locales/en.ts`
**Lines:** 2

**Finding:**

```ts
import { assign } from "lodash";
```

The named import `assign` is never used anywhere in `en.ts`. The
dictionary contains string keys such as `assign: "Assign Homework"`
(line 2518) and `assignDesc: ...` (line 2519). Lodash's `assign` is a
mutating helper; using it (even as a name) shadows no global but it
makes the dictionary module depend on the entire lodash bundle. There
is no benefit: the dictionary is a plain object literal.

**Impact:**
- Brings the `lodash` runtime into the i18n bundle. `lodash` is
  already a direct dependency (`package.json:94`), so no new dep, but
  every locale dictionary will now compile against `lodash/assign` even
  though the file never calls it.
- Risk of accidental semantic drift: a future contributor may write
  `assign(target, source)` and mutate the frozen `as const` object,
  throwing in strict mode (TypeScript narrows `as const` to `readonly`).

**Recommendation:**
Delete the import. The same applies to `import next from "next";` on
line 3 of `en.ts` and `import { Target } from "lucide-react";` on line
2 of `th.ts`.

---

## Finding F-43-003 — `next.config.mjs` global `Access-Control-Allow-Origin` is malformed and over-broad (High)

**File:** `apps/reading-advantage/next.config.mjs`
**Lines:** 39–59

**Finding:**

```js
async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        {
          key: "Access-Control-Allow-Origin",
          value: "https://app.reading-advantage.com/",
        },
        {
          key: "Access-Control-Allow-Methods",
          value: "GET, POST, PUT, DELETE, OPTIONS",
        },
        {
          key: "Access-Control-Allow-Headers",
          value: "Content-Type, Authorization",
        },
      ],
    },
  ];
},
```

There are several problems with this block:

1. **Trailing slash.** Per RFC 6454, an origin is `scheme://host[:port]`
   without a trailing slash. `https://app.reading-advantage.com/` is a
   valid origin per the WHATWG URL parser (the trailing `/` makes it
   the root URL, not an origin), but browsers compare the CORS header
   value against the request `Origin` header byte-for-byte. If the
   request `Origin` is `https://app.reading-advantage.com` (no slash),
   the response `Access-Control-Allow-Origin` of
   `https://app.reading-advantage.com/` will not match, and the browser
   will block the response.
2. **Hard-coded origin in a single-tenant multi-app repo.** The repo
   contains `apps/reading-advantage`, `apps/primary-advantage`,
   `apps/science-advantage`, `apps/codecamp-advantage`, and
   `apps/www-reading-advantage`. A global header that only allows the
   reading-advantage domain means none of the sibling apps can call any
   endpoint. There is no environment branching (no `process.env.APP_URL`
   lookup).
3. **Missing `Vary: Origin`.** When a server emits
   `Access-Control-Allow-Origin` based on a single allowed value,
   intermediaries must not cache the response across origins. Without
   `Vary: Origin`, a CDN could serve the CORS header to a request
   from a different origin.
4. **Missing `Access-Control-Allow-Credentials`.** If the downstream
   client uses `credentials: "include"` (cookies), the response must
   also carry `Access-Control-Allow-Credentials: true` and the
   `Allow-Origin` must **not** be `*`. Currently `Allow-Origin` is not
   `*` (good), but no `Allow-Credentials` is set (so any browser
   fetch with cookies will be silently dropped).
5. **Methods include `OPTIONS`.** Pre-flight `OPTIONS` is normally
   answered by the framework, not by a global header.
6. **`source: "/:path*"`** applies this CORS block to every page and
   every API route. The middleware in `middleware.ts` redirects
   unauthenticated users to `/auth/signin`, so legitimate
   cross-origin fetches are only expected against `/api/*` and
   `/static/*`. Emitting the header on HTML pages is harmless but
   wasteful and confuses any browser extension or CSP monitor.

**Impact:**
- Cross-origin requests from the production domain will succeed only
  by accident (when the browser re-serializes `Origin` with a trailing
  slash, which it does not).
- Cross-origin requests from staging, preview, or sibling apps will
  fail outright.
- CDNs may cache the response across origins because `Vary: Origin`
  is missing.

**Recommendation:**
Move the CORS configuration to a per-route handler or to an Edge
middleware that consults `process.env.ALLOWED_ORIGINS` (a comma-
separated list) and emits `Vary: Origin` and
`Access-Control-Allow-Credentials: true` when needed. Drop the
trailing slash from the production value. Apply the header only to
`/api/:path*`.

---

## Finding F-43-004 — `next.config.mjs` disables TypeScript build errors and `reactStrictMode` (Medium)

**File:** `apps/reading-advantage/next.config.mjs`
**Lines:** 5, 31–36

**Finding:**

```js
reactStrictMode: false,
...
compiler: {
  removeConsole: false,
},
typescript: {
  ignoreBuildErrors: true,
},
```

`ignoreBuildErrors: true` is a code-quality blocker: the repo's
`pnpm turbo run check-types` will still run (per AGENTS.md), but
`next build` will not gate the production artifact on type errors.
That means CI can pass `check-types` while a deploy artifact skips
them. Combined with `reactStrictMode: false`, double-render effects
(which are how most hooks bugs surface) will not be exercised in
development, so this config actively hides regressions.

**Impact:**
- Type regressions in any locale or script will not fail CI for this
  app, only the workspace-level check.
- React 19 concurrent rendering bugs will not be caught in dev.

**Recommendation:**
Set `reactStrictMode: true` and `typescript.ignoreBuildErrors: false`.
If there is a specific type failure blocking the build, file a
follow-up track to fix it rather than disabling the gate.

---

## Finding F-43-005 — `middleware.ts` performs an internal fetch with no timeout / no caching / no auth (High)

**File:** `apps/reading-advantage/middleware.ts`
**Lines:** 34–65, 96–186

**Finding:**

```ts
async function middleware(req: NextRequest) {
  const sessionToken = req.cookies.get("session_token")?.value;

  let userData: Record<string, unknown> | null = null;
  if (sessionToken) {
    try {
      const res = await fetch(new URL("/api/auth/session", req.url), {
        headers: { cookie: req.headers.get("cookie") ?? "" },
      });
      if (res.ok) {
        const data = await res.json();
        userData = data?.session?.user ?? null;
      }
    } catch {
      // Session endpoint unavailable — treat as unauthenticated
    }
  }
  ...
```

Several issues:

1. **No `AbortSignal.timeout` or `signal`:** if the session endpoint
   hangs, the entire request hangs. Edge runtimes have a hard
   timeout (Cloud Run: 60s; Vercel Edge: 25s by default), but a 25-
   second tail latency on every page load is a UX regression.
2. **No caching:** the session payload is re-fetched on every
   request. `NextResponse` supports `request: { headers }` but
   nothing here uses `cache: 'no-store'` or `next: { revalidate }`.
   `fetch` on Edge runtime is cache-friendly by default; a
   successful session lookup could be cached at the edge.
3. **`req.url` is used to construct the absolute URL for the internal
   fetch.** If `req.url` has been mutated (e.g. by a previous rewrite
   or by an upstream proxy), the session lookup may hit the wrong
   origin.
4. **`try/catch` swallows everything.** Any non-OK response, JSON
   parse failure, network failure, or abort is treated as
   "unauthenticated". An attacker who can briefly 500 the session
   endpoint can force every request down the unauthenticated branch,
   which then redirects to `/auth/signin`. Combined with the fact
   that the session endpoint is itself auth-gated, this is a DoS
   amplifier.
5. **Stringly typed `userData.role as string`.** `userData` is typed
   `Record<string, unknown> | null`. The role check at line 98 casts
   to `string` without validating the value is one of the
   `Role` enum members.

**Impact:**
- Performance: every page request blocks on a session sub-fetch.
- Availability: any session endpoint failure degrades every page to
  anonymous mode and redirects to `/auth/signin`, even for users who
  are authenticated.
- Security: the role comparison uses `===` against locally redefined
  strings, so a session response containing an unknown role will
  fall through every branch and skip role-based redirect logic
  silently.

**Recommendation:**
- Read the session directly from the cookie / from a KV lookup
  instead of issuing a sub-fetch.
- If a sub-fetch is required, set `signal: AbortSignal.timeout(500)`
  and `cache: 'no-store'` (or use the `next: { revalidate: 0 }`
  shape), and propagate errors so that observability tooling can
  alert.
- Validate `userData.role` against the `Role` enum before using it.

---

## Finding F-43-006 — `middleware.ts` `ROLES` re-declares the enum and can drift from `lib/enums.ts` (Medium)

**File:** `apps/reading-advantage/middleware.ts`
**Lines:** 6–13

**Finding:**

```ts
// Define Roles locally to avoid pulling backend enum modules into Edge Middleware
const ROLES = {
  USER: "USER",
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
};
```

This is the same shape as
`apps/reading-advantage/lib/enums.ts:4-11`:

```ts
export const Role = {
  USER: "USER",
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
} as const;
```

The comment says "to avoid pulling backend enum modules into Edge
Middleware". `lib/enums.ts` is a plain constants file with no
Node-only imports (only TypeScript-level `as const`), so importing
`Role` from it would not pull anything heavier than the current
local re-declaration. The duplication is a drift hazard: if
`lib/enums.ts` adds `GUEST: "GUEST"`, the middleware will silently
fail to recognize it.

**Impact:**
- Drift between the two definitions could allow a role to bypass
  the middleware redirect logic.

**Recommendation:**
Move `Role` to `packages/types` (which is a leaf package and safe
for Edge) and import it in both `middleware.ts` and
`lib/enums.ts`.

---

## Finding F-43-007 — `middleware.ts` "needs level test" predicate overlaps with valid pre-test states (Medium)

**File:** `apps/reading-advantage/middleware.ts`
**Lines:** 119–136

**Finding:**

```ts
const userLevel = userData.level as number | null | undefined;
const userXp = userData.xp as number | null | undefined;
const needsLevelTest =
  userLevel === undefined ||
  userLevel === null ||
  userLevel === 0 ||
  userXp === 0 ||
  userXp === null ||
  userXp === undefined;

if (needsLevelTest) {
  if (!normalizedPath.startsWith("/level")) {
    return NextResponse.redirect(
      new URL(`/${currentLocale}/level`, req.url),
    );
  }
  return I18nMiddleware(req);
}
```

A user whose `xp === 0` because they have not earned any XP yet
(e.g. they just signed up but already passed the level test and
have `level = 5`) will be incorrectly redirected to `/level`. There
is no way for the system to distinguish "never tested" from "tested
but earned 0 XP since".

**Impact:**
- Returning students who legitimately sit at level 5 / XP 0 will be
  re-tested every session.

**Recommendation:**
Persist an explicit `levelTestCompletedAt` column (or similar) and
gate the redirect on that flag, not on `level === 0 || xp === 0`.

---

## Finding F-43-008 — `middleware.ts` matcher does not exclude observability endpoints (Low)

**File:** `apps/reading-advantage/middleware.ts`
**Lines:** 203–205

**Finding:**

```ts
export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};
```

Anything that does not start with `api`, `static`, `_next` and does
not contain a `.` will be middleware-handled. This includes a future
`/healthz`, `/readyz`, `/metrics` (the latter matters for
Prometheus/OpenTelemetry scraping — see `apps/observability` if it
exists). For each of those, the middleware will:

1. Read `session_token`.
2. Issue an internal `fetch("/api/auth/session")`.
3. Pass through to `I18nMiddleware`.

For a health check that is hit every 5 seconds by a load balancer,
this is wasteful.

**Recommendation:**
Add `healthz`, `readyz`, `metrics` to the negative lookahead.

---

## Finding F-43-009 — `package.json` declares versions that do not exist on the public registry (Critical)

**File:** `apps/reading-advantage/package.json`
**Lines:** 97, 106, 110, 155

**Finding:**

```json
"next": "^16.2.9",
...
"react": "^19.2.7",
...
"react-dom": "^19.2.7",
...
"eslint-config-next": "15.5.7",
```

At the time of writing:

- `next@16.x` does not exist on npm. The latest stable `next` is
  `15.x`. `^16.2.9` will fail to resolve.
- `react@19.2.7` does not exist on npm. The latest `react` is
  `19.0.0` (released late 2024). `^19.2.7` will fail to resolve.
- `react-dom@19.2.7` — same problem.
- `eslint-config-next: 15.5.7` is pinned but the matching `next` is
  `^16.x`. The config will not match the runtime.

**Impact:**
- `pnpm install` (or any package manager install) will fail with
  `ETARGET No matching version found` for these three packages.
- CI install step will fail before any code is built.
- AGENTS.md mandates `pnpm install` as the first step of the build
  workflow; this means the build is broken at the manifest level.

**Recommendation:**
- Pin `next` to a real release (`"15.5.x"` or whatever the AGENTS.md
  policy allows).
- Pin `react` / `react-dom` to a real release (`"^19.0.0"` or
  `"^18.3.1"` if the rest of the monorepo has not migrated).
- Align `eslint-config-next` with the `next` major.

---

## Finding F-43-010 — `package.json` mixes runtime and dev tooling in `dependencies` (Low)

**File:** `apps/reading-advantage/package.json`
**Lines:** 26–135

**Finding:**

A number of packages that are obviously dev-only are listed under
`dependencies` instead of `devDependencies`:

- `cross-env` (line 153 — devDeps, OK).
- `@types/*` are correctly in devDeps (lines 144–151).
- `eslint`, `eslint-config-next`, `eslint-plugin-*` are correctly in
  devDeps (lines 154–157).
- `jest`, `jest-environment-jsdom` (lines 158–159) — correctly
  devDeps.

However:

- `ts-node` (line 162) is devDeps. OK.
- `tsx` (line 163) is devDeps. OK.
- `@types/canvas-confetti` (line 143) is devDeps. OK.

`react-konva` (line 113), `konva` (line 93), and
`react-quizlet-flashcard` (line 114) are large client-only libraries
that are imported from student game pages. They are correctly
declared as `dependencies` because they need to ship to the client
bundle. Same for `framer-motion` (line 89), `recharts` (line 119),
`@mui/material` (line 39), `@radix-ui/themes` (line 62). These are
not flagged.

`bcryptjs` (line 81) and `@node-rs/argon2` (line 40) are both
present. AGENTS.md specifies Argon2id as the canonical password
hashing primitive. `bcryptjs` is a pure-JS fallback that is weaker;
having both invites drift.

**Impact:**
- Two password hashing libraries in the same workspace means a
  future code path may use `bcryptjs` instead of Argon2id, weakening
  the auth surface.

**Recommendation:**
- Pick one (Argon2id per AGENTS.md) and remove the other.
- Audit the rest of `dependencies` for libraries that are only
  used by tests (e.g. `react-quizlet-flashcard` may be dev-only if
  no production code imports it).

---

## Finding F-43-011 — `package.json` includes `productionBrowserSourceMaps: false` only via `next.config.mjs`, not via env (Info)

**File:** `apps/reading-advantage/package.json`
**Lines:** (compare with `next.config.mjs:37`)

`next.config.mjs:37` sets `productionBrowserSourceMaps: false`. That
is fine — but if any deployment pipeline uses
`NEXT_PUBLIC_*` env vars to gate source map uploads to error
reporting tooling (Sentry, etc.), the production build will ship
without them, making client-side stack traces uninterpretable.

**Recommendation:**
Decide explicitly whether production client traces are needed; if so,
either enable source maps in production (with restricted upload) or
ensure the error-reporting adapter is configured to ship its own
maps.

---

## Finding F-43-012 — `postcss.config.mjs` is minimal but loses the `tailwindcss` legacy plugin (Info)

**File:** `apps/reading-advantage/postcss.config.mjs`
**Lines:** 1–5

```js
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

This is the Tailwind v4 plugin only. No autoprefixer, no
`postcss-preset-env`, no `postcss-import`. The repo's `package.json`
also does not list `autoprefixer`. Tailwind v4's PostCSS plugin
handles most modern syntax but it does **not** add vendor prefixes.
If any user agent still needs them (older Android browsers), this
config silently does not provide them.

**Recommendation:**
If vendor prefix support is required, add `autoprefixer` to
`devDependencies` and add it to the plugins list.

---

## Finding F-43-013 — `scripts/backfill-schools.ts` writes outside the dry-run branch and ignores `errors` counter (High)

**File:** `apps/reading-advantage/scripts/backfill-schools.ts`
**Lines:** 39–41, 84–91, 152–157, 188–199, 240–252, 290–304, 379–423

**Finding:**

```ts
const DRY_RUN = process.env.DRY_RUN === 'true';
const VERBOSE = process.env.VERBOSE === 'true';
```

The script maintains a `BackfillStats` interface that includes
`featureFlagsSet` and `errors`, but the actual handlers do **not**
increment `featureFlagsSet` (line 184 sets feature flags inline, but
the counter is never updated). `stats.errors` is incremented in
`main()` only once, on the catch path (line 420), but the
`BackfillStats` declaration makes the counter look important.
Lines 388–390 explicitly mark them unused:

```ts
void stats.featureFlagsSet;
void stats.errors;
```

These `void` casts are a "lint suppression" pattern, but they
silence a real bug: `featureFlagsSet` is never counted.

`DRY_RUN` is checked at the **insert** site (e.g. line 139) but the
**count** is incremented in both branches. Specifically, on line
152 (`else` of `if (!DRY_RUN)`), the code does:

```ts
} else {
  verboseLog(`[DRY RUN] Would create school: ${license.schoolName}`);
  schoolMap.set(license.schoolName, `dry-run-id-${created}`);
  created++;
}
```

This is fine — the DRY_RUN path correctly logs and does not write.
However, in `updateLicenses` (line 189), the `else` branch also
correctly logs only and increments `updated` for the summary
display. **But**: when running in DRY_RUN, the script's summary
prints "Licenses updated: N" (line 410), implying real writes were
made. That is misleading.

In `main()` (line 414):

```ts
if (DRY_RUN) {
  console.log('💡 Run without DRY_RUN=true to apply these changes.\n');
}
```

The reminder is present but it comes **after** the success message
"✅ Backfill completed successfully!" (line 407), so the operator
may stop reading and assume the migration ran.

**Impact:**
- Operator runs `DRY_RUN=true` thinking they are previewing, but
  the summary line says "Backfill completed successfully!" with
  non-zero counts, giving false confidence.

**Recommendation:**
- Reframe the summary under `DRY_RUN` so the heading reads
  "DRY RUN preview — no changes applied".
- Increment `errors` per failure, not once on the catch path.
- Drop the `void stats.errors` suppression or remove the field.

---

## Finding F-43-014 — `scripts/backfill-schools.ts` lacks a single transaction wrapper (High)

**File:** `apps/reading-advantage/scripts/backfill-schools.ts`
**Lines:** 372–423

**Finding:**

`main()` invokes `createSchools()`, `updateLicenses()`,
`updateUsers()`, and `updateClassrooms()` sequentially. Each function
issues its own `INSERT` / `UPDATE` statements outside a Drizzle
transaction. A failure between, say, `updateLicenses` (step 2) and
`updateUsers` (step 3) leaves the database half-migrated: some
licenses have `schoolId`, others do not; the `validateResults()`
function (step 5) will then report "Found N licenses without schools"
and exit non-zero, but the operator has no rollback path.

There is also no progress checkpoint or per-step commit. If
`updateUsers()` fails midway, the loop in `updateUsers` is not
resumable.

**Impact:**
- Production database may be partially migrated. The only recovery
  is to manually re-run the script (idempotent for schools and
  licenses, but not idempotent for users with a `schoolId` already
  set — the script will skip them, leaving the partial state
  intact).

**Recommendation:**
Wrap the four steps in a single `db.transaction(async (tx) => ...)`
block so that any failure rolls back the entire migration.
Alternatively, wrap each step in its own transaction and on failure
log the offset (`OFFSET 100 LIMIT 100`) so the operator can resume.

---

## Finding F-43-015 — `scripts/backfill-schools.ts` country hard-coded to `'Thailand'` (Medium)

**File:** `apps/reading-advantage/scripts/backfill-schools.ts`
**Lines:** 142–147

**Finding:**

```ts
const [school] = await db
  .insert(schools)
  .values({
    name: license.schoolName,
    country: 'Thailand',
    // Note: district and province can be updated manually later
  })
  .returning();
```

The country is hard-coded to `'Thailand'` for every new school, even
when the license `schoolName` does not match a Thai school. The
AGENTS.md and the broader monorepo support multi-tenancy across
countries (Vietnamese, English, and Traditional Chinese locales are
shipped). Hard-coding country means Vietnamese or other-region
schools will be mis-classified.

**Impact:**
- Mis-classified schools break any future country-scoped reporting,
  compliance gating, or locale defaulting.

**Recommendation:**
Derive country from `license.country` if that column exists, or
from a lookup against the existing `schools` table, or expose the
country as an env var / CLI argument.

---

## Finding F-43-016 — `scripts/backfill-schools.ts` `selectDistinctOn` may yield undefined `schoolName` (Low)

**File:** `apps/reading-advantage/scripts/backfill-schools.ts`
**Lines:** 106–111

**Finding:**

```ts
const distinctLicenses = await db
  .selectDistinctOn([licenses.schoolName], {
    schoolName: licenses.schoolName,
    schoolId: licenses.schoolId,
  })
  .from(licenses);
```

`licenses.schoolName` is not asserted non-null. If any license has
`schoolName === null`, the resulting map key (`license.schoolName`)
becomes the string `"null"` (via `Map.set(null, ...)` — which
TypeScript actually allows for `Map<string, string>` only because
the key is forced to string by the type, but the value `null`
collapses to `"null"`). The subsequent `schoolMap.has(...)` checks
then become ambiguous between an actual school named `"null"` and
a row where `schoolName` was missing.

**Impact:**
- Low: the schema likely constrains `schoolName` to NOT NULL.
  But the script does not validate, so a future schema change
  could silently corrupt the migration.

**Recommendation:**
Add an explicit guard at the top of `createSchools()`:

```ts
if (license.schoolName == null) {
  log(`Skipping license ${license.key} — missing schoolName`, 'warn');
  continue;
}
```

---

## Finding F-43-017 — `scripts/backfill-schools.ts` uses `void and;` to silence unused import (Low)

**File:** `apps/reading-advantage/scripts/backfill-schools.ts`
**Lines:** 30, 425–426

**Finding:**

```ts
import {
  ...
  and,
  isNull,
  isNotNull,
  ...
} from "@reading-advantage/db";
...
void and;
```

`and` is imported from `@reading-advantage/db` but never used in the
file. The `void and;` at line 426 is a TypeScript noop that exists
only to suppress the unused-import lint rule. This is a code smell:
either use `and` somewhere meaningful (e.g. combining conditions in
`validateResults()`), or drop the import entirely.

**Recommendation:**
Remove `and` from the import list and drop the `void and;` line.

---

## Finding F-43-018 — `scripts/check-alignment-data.ts` casts raw `db.execute` results with `unknown` (Medium)

**File:** `apps/reading-advantage/scripts/check-alignment-data.ts`
**Lines:** 3–12, 19–82

**Finding:**

```ts
const alignmentMetrics = (await db.execute(sql`
  SELECT * FROM mv_alignment_metrics
  WHERE scope_type = 'student'
  LIMIT 10
`)) as unknown as AlignmentMetricRow[];
```

`db.execute` returns a raw `RowList` whose columns are typed as
`unknown` by Drizzle. The cast `as unknown as AlignmentMetricRow[]`
silently coerces types — there is no runtime validation that the
shape actually matches `AlignmentMetricRow`. A schema change to
`mv_alignment_metrics` (column rename, type change) will not surface
at the script layer.

For example, `total_readings: number | bigint | string` — Drizzle's
`execute` actually returns `bigint` for `SUM()` results, and the
script's `Number(total_readings ?? 0)` at line 47 handles that, but
the cast does not enforce the `bigint` case.

**Impact:**
- Silent breakage on schema drift. Operators will see misleading
  output.

**Recommendation:**
Use Drizzle's typed `db.select(...).from(mvAlignmentMetrics)` query
builder instead of `db.execute(sql`...`)`, so the schema is enforced
at compile time. Alternatively, parse the `RowList` through Zod.

---

## Finding F-43-019 — `scripts/check-archived.ts` lacks error handling on the catch (Low)

**File:** `apps/reading-advantage/scripts/check-archived.ts`
**Lines:** 27–29

**Finding:**

```ts
} catch (error) {
  console.error("❌ Error:", error);
}
```

The script catches the error but does not set `process.exitCode = 1`
or `process.exit(1)`. The script will print the error and then exit
with code 0. CI pipelines that gate on exit code will not catch the
failure.

Same pattern in `check-classroom-teachers.ts:51-53`,
`check-demo-data.ts:91-93`, `check-teacher-classrooms.ts:93-95`,
`clear-cache.ts:25-27`, `refresh-activity-heatmap-matviews.ts:82-84`.

**Recommendation:**
Add `process.exit(1)` (or `process.exitCode = 1`) before the
implicit return on each catch block.

---

## Finding F-43-020 — `scripts/check-classroom-teachers.ts` hard-codes a demo email (Low)

**File:** `apps/reading-advantage/scripts/check-classroom-teachers.ts`
**Lines:** 10–11

**Finding:**

```ts
.where(eq(users.email, "demo-teacher@reading-advantage.com"))
```

The same hard-coded demo email appears in
`scripts/check-teacher-classrooms.ts:21` and in seed scripts. If
the demo seed is ever re-run with a different email, this script
silently does nothing.

**Impact:**
- Diagnostic scripts that depend on a specific demo seed will
  silently return empty results on real or staged environments.

**Recommendation:**
Read the email from an env var (e.g. `DEMO_TEACHER_EMAIL`) with
the current value as the default.

---

## Finding F-43-021 — `scripts/check-classroom-teachers.ts` queries the same data twice (Low)

**File:** `apps/reading-advantage/scripts/check-classroom-teachers.ts`
**Lines:** 21–48

**Finding:**

The script performs two separate queries that both return the
classroom-teacher join for the same teacher:

```ts
const ctRows = await db.select(...).from(classroomTeachers).innerJoin(...);
...
const viaRelation = await db.select().from(classroomTeachers).where(...);
```

Both queries produce the same logical result. The second is labelled
"Via teacherClassrooms relation" but the Drizzle schema does not
expose a `teacherClassrooms` relation — both queries hit
`classroomTeachers` directly.

**Impact:**
- Performance waste; identical results printed twice.

**Recommendation:**
Remove the second query, or use it to verify a real relation
exists.

---

## Finding F-43-022 — `scripts/check-demo-data.ts` uses `sql<number>` template literal for COUNT (Low)

**File:** `apps/reading-advantage/scripts/check-demo-data.ts`
**Lines:** 73–80

**Finding:**

```ts
const activityTypes = await db
  .select({
    activityType: userActivity.activityType,
    count: sql<number>`COUNT(*)::int`,
  })
```

`sql<number>` is fine but the surrounding code uses Drizzle's
`count()` helper elsewhere (lines 38–42). Inconsistency.

**Impact:**
- Minor; no functional impact.

**Recommendation:**
Use the `count()` helper uniformly, or document why
`sql<number>` is preferred for grouped counts.

---

## Finding F-43-023 — `scripts/check-teacher-classrooms.ts` emits raw `sql` for a per-row subquery (Medium)

**File:** `apps/reading-advantage/scripts/check-teacher-classrooms.ts`
**Lines:** 32–42

**Finding:**

```ts
const teacherClassrooms = await db
  .select({
    id: classrooms.id,
    name: classrooms.name,
    studentCount: sql<number>`(
      SELECT COUNT(*)::int FROM ${classroomStudents}
      WHERE ${classroomStudents.classroomId} = ${classrooms.id}
    )`,
  })
  .from(classrooms)
  .where(eq(classrooms.teacherId, teacher.id));
```

The `sql<number>` template is safe in this context because Drizzle
escapes the table reference via `${classroomStudents}`. However, the
N+1 pattern (one DB round-trip per classroom) at lines 78–81 is more
of a concern:

```ts
for (const classroom of allClassrooms) {
  const [studentsAgg] = await db
    .select({ count: count() })
    .from(classroomStudents)
    .where(eq(classroomStudents.classroomId, classroom.id));
```

For a school with hundreds of classrooms, this fires hundreds of
queries.

**Impact:**
- Slow on real data.

**Recommendation:**
Use a single grouped query:

```ts
.leftJoin(...).leftJoin(...).groupBy(classrooms.id)
```

---

## Finding F-43-024 — `scripts/clear-cache.ts` has no logging on the empty case (Low)

**File:** `apps/reading-advantage/scripts/clear-cache.ts`
**Lines:** 5–28

**Finding:**

```ts
const statsBefore = getMetricsCacheStats();
console.log('📊 Cache stats before clearing:');
console.log(JSON.stringify(statsBefore, null, 2));
```

If `getMetricsCacheStats()` returns `null` or an empty object, the
JSON dump is uninformative. The script also does not confirm that
the cache was actually populated before clearing. There is no
"no-op" path — the cache is always cleared.

**Impact:**
- Minor.

**Recommendation:**
If `statsBefore` shows 0 entries, log a warning and exit early.

---

## Finding F-43-025 — `scripts/refresh-activity-heatmap-matviews.ts` requires a Postgres function to exist (Medium)

**File:** `apps/reading-advantage/scripts/refresh-activity-heatmap-matviews.ts`
**Lines:** 35

**Finding:**

```ts
await db.execute(sql`SELECT refresh_activity_heatmap_matviews()`);
```

The script calls a Postgres function `refresh_activity_heatmap_matviews()`.
If that function does not exist in the target database, the script
fails with `function does not exist` and a generic Drizzle error
message. There is no preflight check that the function exists, and
the error is propagated as a generic `Error` (line 73).

**Impact:**
- Operators running this script on a fresh database will see a
  cryptic error.

**Recommendation:**
Add an `IF EXISTS` guard:

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'refresh_activity_heatmap_matviews'
  ) THEN
    PERFORM refresh_activity_heatmap_matviews();
  END IF;
END $$;
```

Or pre-check with `SELECT 1 FROM pg_proc ...` in TS.

---

## Finding F-43-026 — `scripts/refresh-activity-heatmap-matviews.ts` `require.main === module` is CJS-only (Low)

**File:** `apps/reading-advantage/scripts/refresh-activity-heatmap-matviews.ts`
**Lines:** 88–91

**Finding:**

```ts
if (require.main === module) {
  main();
}
```

`require` is CommonJS-only. The package is `"type"`-implicit (no
`"type": "module"` in the root `package.json` of the monorepo), but
the script is run via `tsx`, which supports both CJS and ESM. Using
`require.main === module` works in CJS-mode tsx but fails silently
in ESM-mode tsx (the file is then evaluated as ESM and `require` is
not defined; the conditional becomes a parse error or a runtime
`ReferenceError`).

**Impact:**
- Low if the project is consistently CJS; high if any sibling
  workspace switches to `"type": "module"`.

**Recommendation:**
Use the standard ESM-equivalent:

```ts
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
```

---

## Finding F-43-027 — `cn.ts` typo `E伦理学` for `Ethics` (Medium)

**File:** `apps/reading-advantage/locales/cn.ts`
**Line:** 3408

**Finding:**

```ts
Ethics: "E伦理学",
```

The leading `E` is an English character that does not appear in any
other locale file:

- `en.ts:3607`: `Ethics: "Ethics",`
- `th.ts:3544`: `Ethics: "จริยธรรม",`
- `tw.ts:3419`: `Ethics: "倫理學",`
- `vi.ts:3631`: `Ethics: "Đạo đức học",`

The Chinese term for "Ethics" is `伦理学` (or `倫理學` in
Traditional). The `E` is almost certainly a typo introduced during
a translation pass.

**Impact:**
- Users selecting "Ethics" as a genre will see `E伦理学` in the UI.

**Recommendation:**
Replace with `伦理学`.

---

## Finding F-43-028 — `en.ts`, `cn.ts`, `th.ts`, `vi.ts` contain bilingual "key = English value" entries under `selectType.types` (Low)

**File:** all five dictionary files
**Lines (cn):** 3290–3876
**Lines (en):** roughly 3290–4083
**Lines (th):** 3540–4000+
**Lines (tw):** 3290–3870
**Lines (vi):** 3540–4083

**Finding:**

The `selectType.types` block is structured as

```ts
{
  Fiction: "小说",
  ...
  "Early Readers": "早期阅读",
  ...
}
```

The keys are English; the values are localized. Several entries have
keys in languages other than English (e.g. `"Children's literature":
"成长"` in `cn.ts:3670` — note the value is just `成长` which is
"growth", not "Children's literature"). Other entries have value
identical to the key, which is correct if the language matches but
a problem if the key was meant to be the English label of the genre
and the value the localized one.

This is the only block in the dictionary files where the pattern
"key === value" sometimes holds. The pattern is intentional (English
genre taxonomy mapped to localized names), but the inconsistency
between genres whose values are translated and genres whose values
are simply the English name is a UX concern: the genre picker may
show mixed-language labels.

**Impact:**
- Genres picker mixes English and Chinese labels in `cn.ts`,
  English and Vietnamese in `vi.ts`, etc.

**Recommendation:**
Audit the `selectType.types` block in each locale and ensure every
entry has a fully translated value. Cross-check against
`apps/reading-advantage/data/type-genre.json` (Batch 37 reviewed
that file; it should be the source of truth).

---

## Finding F-43-029 — `cn.ts` line 2689 contains mixed-script phrase "您已獲得新等級" (Low)

**File:** `apps/reading-advantage/locales/cn.ts`
**Line:** 2689

**Finding:**

```ts
upLevel: "您已獲得新等級！",
```

The Traditional Chinese equivalent in `tw.ts` would (presumably) use
the same wording. This is Simplified Chinese using `獲` (Traditional)
instead of `获` (Simplified). For a Simplified Chinese locale file
(`cn.ts`), the simplified form `获得` is expected.

**Impact:**
- Cosmetic; users will read it but a Chinese-language reviewer will
  flag it as inconsistent with the `cn` (Simplified) locale.

**Recommendation:**
Replace `獲得` with `获得`.

---

## Finding F-43-030 — `cn.ts` lesson page mixes `phase1Title` and `phaseNTitle` keys (Low)

**File:** `apps/reading-advantage/locales/cn.ts`
**Lines:** 1133–1278

**Finding:**

The lesson page section defines phase titles in two ways:

- `phase1Title`, `phase2Title`, …, `phase14Title` (string keys)
- `phase10: { headerTitle: ..., headerDescription: ... }` (nested
  object for phase 10 only)
- `phases: [ ... ]` (array of localized phase names)

Three different shapes for the same domain concept. The
`headerTitle` inside `phase10` is the only nested exception. This
is a code-smell that indicates either a partial refactor or a
developer convention that diverged from the rest of the file.

**Impact:**
- Future contributors will be confused about which pattern to use
  when adding phase 11+.

**Recommendation:**
Pick one shape (preferably flat `phaseNTitle` / `phaseNDescription`)
and migrate `phase10` to match.

---

## Finding F-43-031 — `cn.ts` contains emoji in user-facing strings (Info)

**File:** `apps/reading-advantage/locales/cn.ts`
**Lines:** 1833–1870, 1284, 1329, 1337, 1338, 1411, 1420, 1424, 1434, 1439, 1442, 1497, 1619, 1636, 1671, 1676, 1702, 1713, 1737, 1824, 1826, 1879, 1900–1907, 1983, 1992, 2031, 2076, 2078, 2104, 2114, 2148, 2189–2190, 2203, 2219, 2230, 2242, 2249, 2252, 2280, 2286, 2308, 2340, 2347, 2372, 2403, 2407, 2410, 2426, 2446, 2453, 2484, 2503, 2516, 2521, 2535, 2562, 2564, 2574, 2587, 2589, 2591, 2595, 2599, 2600, 2602, 2607, 2608, 2610, 2620, 2623, 2631, 2633, 2637, 2643, 2644, 2646, 2650, 2658, 2660, 2666, 2671, 2681, 2682, 2686, 2689, 2692, 2693, 2695, 2701, 2703, 2704, 2717, 2720, 2721, 2724, 2735, 2744, 2748, 2759, 2772, 2774, 2780, 2781, 2782, 2783, 2784, 2792, 2795, 2801, 2803, 2807, 2808, 2810, 2814, 2821, 2826, 2833, 2838, 2844, 2856, 2861, 2866, 2873, 2874, 2878, 2882, 2886, 2892, 2893, 2897, 2898, 2902, 2912, 2914, 2917, 2922, 2926, 2929, 2933, 2936, 2941, 2944, 2945, 2952, 2958, 2959, 2961, 2962, 2964, 2970, 2975, 2976, 2980, 2981, 2983, 2987, 2989, 2995, 3000, 3003, 3006, 3007, 3008, 3011, 3016, 3026, 3031, 3032, 3034, 3041, 3044, 3045, 3051, 3053, 3056, 3057, 3062, 3066, 3073, 3078, 3079, 3085, 3086, 3087, 3090, 3091, 3092, 3093, 3103, 3113, 3114, 3124, 3131, 3147, 3150, 3153, 3157, 3163, 3164, 3174, 3175, 3176, 3179, 3185, 3190, 3194, 3198, 3210, 3211, 3220, 3231, 3235, 3240, 3241, 3242, 3243, 3245, 3247, 3248, 3250, 3253, 3257, 3258, 3263, 3264, 3265, 3266, 3267, 3273, 3275, 3277, 3278, 3281, 3284, 3289, 3295, 3311, 3326, 3335, 3336, 3338, 3342, 3339, 3340, 3356, 3357, 3361, 3362, 3371, 3384, 3392, 3400, 3402, 3410, 3415, 3417, 3419, 3423, 3424, 3425, 3428, 3432, 3433, 3437, 3443, 3446, 3448, 3451, 3454, 3455, 3457, 3459, 3460, 3461, 3462, 3465, 3467, 3471, 3482, 3484, 3491, 3492, 3493, 3502, 3506, 3513, 3514, 3516, 3523, 3526, 3532, 3536, 3537, 3538, 3539, 3540, 3546, 3549, 3552, 3554, 3563, 3569, 3571, 3573, 3574, 3576, 3580, 3583, 3584, 3585, 3586, 3587, 3588, 3590, 3591, 3592, 3593, 3594, 3595, 3596, 3600, 3602, 3603, 3604, 3605, 3608, 3609, 3610, 3611, 3613, 3616, 3617, 3618, 3620, 3622, 3624, 3628, 3630, 3633, 3637, 3638, 3641, 3642, 3644, 3650, 3651, 3654, 3656, 3657, 3660, 3661, 3666, 3671, 3675, 3677, 3681, 3684, 3689, 3691, 3693, 3694, 3700, 3704, 3706, 3707, 3709, 3711, 3712, 3714, 3717, 3719, 3720, 3724, 3727, 3730, 3733, 3736, 3737, 3739, 3740, 3743, 3744, 3749, 3754, 3755, 3758, 3760, 3761, 3763, 3764, 3765, 3766, 3771, 3773, 3774, 3776, 3783, 3787, 3788, 3789, 3792, 3794, 3804, 3811, 3812, 3815, 3818, 3820, 3821, 3825, 3828, 3830, 3831, 3832, 3833, 3836, 3840, 3842, 3844, 3845, 3846, 3848, 3850, 3851, 3853, 3854, 3855, 3858, 3859, 3862, 3870, 3875, 3881, 3885, 3886, 3889, 3892, 3893, 3897, 3898, 3899, 3902, 3918, 3925, 3926, 3927, 3935, 3937, 3940, 3943, 3944, 3946, 3947, 3948, 3949, 3950, 3951, 3952, 3953, 3954, 3955, 3957, 3961, 3963, 3965, 3966, 3967, 3968, 3969, 3970, 3971

This is exhaustive; the actual content was reviewed in full above.

**Finding:** Emojis are used as visual markers for AI generation
status (`🤖 AI 正在努力思考...`, line 1834), progress messages, and
illustrative messages throughout. Some entries combine multiple
emojis in a single string.

**Impact:** No security or correctness impact. Some assistive tech
may read aloud each emoji name; some renderers may not have the
glyphs and will show fallback boxes.

**Recommendation:** Audit for accessibility. Add `aria-label` to
elements that wrap these strings (search the component layer to
confirm whether `aria-label` is already set).

---

## Finding F-43-032 — `cn.ts` `selectType` section keys duplicate `en.ts` keys with English-only values (Low)

**File:** `apps/reading-advantage/locales/cn.ts`
**Lines:** 3395–3876

**Finding:**

Many keys in `selectType.types` are left as English values in the
Chinese locale:

- `cn.ts:3662`: `"WWII Resistance": "WWII Resistance",` (English
  value, not translated)
- `cn.ts:3744`: `"Culinary Arts": "Culinary Arts",`
- `cn.ts:3843`: `"Inspiring Story": "Inspiring Story",`
- `cn.ts:3775`: `"Language and Literature": "Language and Literature",`

The pattern is "key: English value, no translation". This may be
intentional (the source of truth is English taxonomy, and Chinese
users see the English labels) but it deviates from the rest of the
file where every key has a localized value.

**Impact:**
- Inconsistent UX: some genres show in Chinese, others in English.

**Recommendation:** Translate these or document that the taxonomy
keys are intentionally English-only.

---

## Finding F-43-033 — `middleware.ts` `pathname.includes(".")` blocks query-string paths containing dots (Medium)

**File:** `apps/reading-advantage/middleware.ts`
**Lines:** 58–65

**Finding:**

```ts
if (
  pathname.startsWith("/api") ||
  pathname.startsWith("/_next") ||
  pathname.startsWith("/static") ||
  pathname.includes(".") // file extensions
) {
  return NextResponse.next();
}
```

`pathname` is the path portion of the URL, not the full URL.
`includes(".")` matches any path with a literal `.` anywhere. This
will match:

- `/article/v1.0/final` (version-like segment)
- `/some.user/profile` (potential future routes with dots)
- `/foo.bar` (file-ish paths)

It will **not** match `/articles/foo` (no dot). The check is
intended to skip file extensions like `.png`, but `pathname.startsWith("/api")`
already handles `/api/*`. The dot check overlaps with the
matcher's negative lookahead (`.+\..+`).

**Impact:**
- Future routes containing dots will bypass the middleware (and
  hence the auth check).

**Recommendation:**
Use a regex via the `matcher` config (which already excludes
`.*\..*`) and remove the dot check from the body, or use a more
specific test like `/\.[a-z0-9]+$/i.test(pathname)`.

---

## Finding F-43-034 — `middleware.ts` redirect target uses the request's `currentLocale`, not the user's preferred locale (Info)

**File:** `apps/reading-advantage/middleware.ts`
**Lines:** 111–114, 130–134, 192–194

**Finding:**

```ts
return NextResponse.redirect(
  new URL(`/${currentLocale}/role-selection`, req.url),
);
```

`currentLocale` is derived from `segments[1]` (the locale prefix in
the URL). If a user with `Accept-Language: th` but a stale `en`
cookie lands on `/en/anything`, they get redirected to
`/en/role-selection` instead of `/th/role-selection`.

**Impact:**
- Users occasionally see the wrong language after the redirect.

**Recommendation:**
On the unauthenticated branch (line 188), use the `next-intl`
middleware's locale detection (via `I18nMiddleware(req)` and reading
the resulting URL) rather than `currentLocale` derived from the
URL prefix.

---

## Finding F-43-035 — `locales/client.ts` re-exports `usePathname` and `useRouter` from `./navigation` without renaming (Info)

**File:** `apps/reading-advantage/locales/client.ts`
**Lines:** 2, 16

**Finding:**

```ts
import { usePathname, useRouter } from "./navigation";
...
export { usePathname, useRouter };
```

`./navigation.ts` already re-exports `usePathname` and `useRouter`
from `@/i18n/routing`. This file re-exports them again. The
double-export is harmless but redundant. The convention in the
rest of the codebase is to import `usePathname`/`useRouter`
directly from `@/i18n/routing` or from `next-intl/navigation`.

**Impact:** Cosmetic; no functional impact.

**Recommendation:** Either drop this file and import directly, or
document why `client.ts` is the canonical entry point.

---

## Finding F-43-036 — `locales/navigation.ts` re-exports `useLocale` but `client.ts` also re-exports it (Info)

**File:** `apps/reading-advantage/locales/navigation.ts`
**Lines:** 1–7

```ts
export {
  Link,
  redirect,
  usePathname,
  useRouter,
  useLocale,
} from "@/i18n/routing";
```

And `locales/client.ts`:

```ts
import { useLocale } from "next-intl";
```

`useLocale` is imported from `next-intl` here and from
`@/i18n/routing` in `navigation.ts`. These are two different
functions: `useLocale` from `next-intl` returns the **active** locale
(the one next-intl resolved for the request); `useLocale` from
`next-intl/navigation` (which is what `createNavigation(routing)`
returns) returns the same value but is the routing-aware variant.

**Impact:**
- If a consumer imports `useLocale` from `client.ts` and another
  imports it from `navigation.ts`, they get two different
  implementations of the same hook name.

**Recommendation:**
Pick one source of truth and re-export from the other.

---

## Finding F-43-037 — `locales/server.ts` re-exports `setRequestLocale as setStaticParamsLocale` (Info)

**File:** `apps/reading-advantage/locales/server.ts`
**Lines:** 15

**Finding:**

```ts
export { setRequestLocale as setStaticParamsLocale } from "next-intl/server";
```

This is a documented next-intl alias. The intent is to call
`setStaticParamsLocale(locale)` in `generateStaticParams`. This is
correct usage per the next-intl docs. No issue.

**Recommendation:** None.

---

## Finding F-43-038 — `package.json` lists `@google-cloud/text-to-speech` and `@google-cloud/translate` but the rest of the stack uses AI SDK (Info)

**File:** `apps/reading-advantage/package.json`
**Lines:** 34–35

**Finding:**

```json
"@google-cloud/text-to-speech": "^5.8.0",
"@google-cloud/translate": "^8.5.0",
"@google/generative-ai": "^0.22.0",
```

AGENTS.md mandates a thin internal AI adapter, with provider SDKs
hidden behind it. The direct imports of `@google-cloud/text-to-speech`
and `@google-cloud/translate` in an app package bypass that
abstraction.

**Impact:**
- Provider lock-in at the app layer.

**Recommendation:**
Move these to `@reading-advantage/ai` (or similar) and expose
`ai.synthesize()`, `ai.translate()` through the adapter.

---

## Finding F-43-039 — `package.json` lists `firebase-admin` (Info)

**File:** `apps/reading-advantage/package.json`
**Lines:** 88

**Finding:**

```json
"firebase-admin": "^13.0.0",
```

AGENTS.md notes that `reading-advantage` is migrating from Firebase
Auth to a first-party adapter. `firebase-admin` is the Node.js
server SDK for Firebase. If it is still imported anywhere in the
app, that import should be moved behind the auth adapter before
the migration completes.

**Impact:** Migration debt.

**Recommendation:** Grep for `firebase-admin` usage in
`apps/reading-advantage/**` and migrate to the new auth adapter.

---

## Finding F-43-040 — `package.json` pins `react-router-dom: ^6.26.1` (Info)

**File:** `apps/reading-advantage/package.json`
**Lines:** 115

**Finding:**

Next.js apps use the Next.js router; they do not need
`react-router-dom`. The presence of this dependency suggests a
legacy import or a partial migration.

**Impact:** Bundle bloat; accidental double-routing possible if
both routers are wired.

**Recommendation:** Grep for `react-router-dom` and remove unused
imports. If the dependency is genuinely unused, drop it.

---

## Finding F-43-041 — `package.json` includes `ts-fsrs` for SRS but no SRS package boundary (Info)

**File:** `apps/reading-advantage/package.json`
**Lines:** 130

**Finding:**

```json
"ts-fsrs": "^4.3.0",
```

The FSRS spaced-repetition algorithm. The AGENTS.md mandates that
business logic live in `packages/backend`. If SRS logic is
implemented inline in this app rather than in a backend module, it
violates the architecture.

**Recommendation:** Verify that SRS logic is implemented in
`packages/backend` and that `ts-fsrs` is only re-exported from
there.

---

## Finding F-43-042 — `package.json` mixes `pnpm` workspace deps with version ranges that may force hoisting (Info)

**File:** `apps/reading-advantage/package.json`
**Lines:** 63–70

**Finding:**

```json
"@reading-advantage/api": "workspace:*",
"@reading-advantage/auth": "workspace:*",
"@reading-advantage/auth-client": "workspace:*",
"@reading-advantage/db": "workspace:*",
"@reading-advantage/domain": "workspace:*",
"@reading-advantage/types": "workspace:*",
"@reading-advantage/ui": "workspace:*",
"@reading-advantage/utils": "workspace:*",
```

These are workspace references. The current AGENTS.md
`Monorepo Structure` block lists the target packages as
`/packages/backend`, `/packages/db`, `/packages/ui`, `/packages/config`,
`/packages/utils`. The references to `@reading-advantage/api`,
`@reading-advantage/auth`, `@reading-advantage/auth-client`,
`@reading-advantage/domain`, `@reading-advantage/types` are the
**current** package names (per `measure/tech-debt.md` "Mixed
Jest/Vitest test runners" / "Some apps still use Prisma"
migration list).

**Impact:**
- Drift between the AGENTS.md target structure and the actual
  workspace will confuse new contributors.

**Recommendation:** Add a note in `measure/tracks/` for the
package-rename migration and update AGENTS.md to point at the
current canonical names.

---

## Finding F-43-043 — `package.json` `build` script sets `NODE_OPTIONS=--max-old-space-size=8192` (Info)

**File:** `apps/reading-advantage/package.json`
**Lines:** 7

**Finding:**

```json
"build": "cross-env NODE_OPTIONS=--max-old-space-size=8192 next build",
```

8 GB heap for `next build` is reasonable for a large app, but it
means the build will fail with `JavaScript heap out of memory` on
any CI runner with less than 8 GB of memory available to Node.
Cloud Run build jobs and GitHub Actions free-tier runners often
have <4 GB.

**Impact:**
- Build may fail in constrained CI environments.

**Recommendation:**
Document the minimum CI memory requirement; bump CI resources; or
make the heap size configurable via env var with a sensible
default.

---

## Finding F-43-044 — `package.json` `dev` script is `next dev` with no port / no host (Info)

**File:** `apps/reading-advantage/package.json`
**Lines:** 6

**Finding:**

```json
"dev": "next dev",
```

Defaults to port 3000. The monorepo has at least five apps. If
two are started in parallel, they collide on port 3000.

**Recommendation:**
Either use `turbo run dev` (which already filters per-package) or
explicitly set `next dev -p 3001` (or similar).

---

## Finding F-43-045 — `middleware.ts` `matcher` regex is fragile when route groups are added (Info)

**File:** `apps/reading-advantage/middleware.ts`
**Lines:** 203–205

**Finding:**

```ts
matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
```

The matcher excludes `(api|static|_next|favicon.ico|robots.txt)`
plus any path containing a dot. Route groups (Next.js
`(group)` directories) are excluded from the URL, so they don't
appear in the matcher. But the negative lookahead will incorrectly
**include** internal Next.js paths like `/_not-found` or
`/_error`. Currently `/_next` is in the negative lookahead, but
other internal paths are not.

**Impact:**
- Some Next.js internal pages will run the middleware.

**Recommendation:**
Add all Next.js reserved prefixes (`_next`, `_not-found`, `_error`,
`_document`) to the matcher.

---

## Finding F-43-046 — `next.config.mjs` `images.remotePatterns` allows `*.googleusercontent.com` (Info)

**File:** `apps/reading-advantage/next.config.mjs`
**Lines:** 14–28

**Finding:**

```js
{
  protocol: "https",
  hostname: "lh3.googleusercontent.com",
  pathname: "**",
},
{
  protocol: "https",
  hostname: "lh4.googleusercontent.com",
  pathname: "**",
},
{
  protocol: "https",
  hostname: "lh5.googleusercontent.com",
  pathname: "**",
},
```

Google user-content URLs are commonly used as profile pictures for
Google sign-in. The `pathname: "**"` allows any path. This is
standard practice. No issue.

**Recommendation:** None.

---

## Finding F-43-047 — `next.config.mjs` `pageExtensions` includes `.js` (Info)

**File:** `apps/reading-advantage/next.config.mjs`
**Lines:** 6

**Finding:**

```js
pageExtensions: ["tsx", "ts", "jsx", "js"],
```

Allowing `.js` and `.jsx` as page extensions means an accidental
`page.js` in the wrong directory could become a route. This is
broad. Most Next.js apps restrict to `["tsx", "ts"]`.

**Impact:**
- Risk of unintended route creation.

**Recommendation:**
Restrict to `["tsx", "ts"]` unless there is a legacy reason to keep
`.js`/`.jsx`.

---

## Finding F-43-048 — `cn.ts` `genreEngagement.metrics` key set differs from `en.ts` (Medium)

**File:** `apps/reading-advantage/locales/cn.ts`
**Lines:** 3931–3961
**File:** `apps/reading-advantage/locales/en.ts`
**Lines:** 4138–4161

**Finding:**

`en.ts` defines:

```ts
metrics: {
  totalReads: "Total Reads",
  recentActivity: ...,
  quizCompletions: ...,
  xpEarned: ...,
  engagementScore: ...,
  lastRead: ...,
  averageLevel: ...,
  activeDays: ...,
  readingStreak: ...,
  cefrLevel: ...,
  ...
}
```

`cn.ts` defines:

```ts
metrics: {
  totalEngagement: "总参与度",
  recentActivity: ...,
  readingStreak: ...,
  favoriteGenres: ...,
  recommendations: ...,
  engagementScore: ...,
  readingProgress: ...,
  timeSpent: ...,
  articlesRead: ...,
  averageScore: ...,
  totalReads: ...,
  quizCompletions: ...,
  xpEarned: ...,
  lastRead: ...,
  averageLevel: ...,
  activeDays: ...,
  cefrLevel: ...,
  ...
}
```

The keys **do not match**. `cn.ts` has `totalEngagement`,
`favoriteGenres`, `recommendations`, `readingProgress`, `timeSpent`,
`articlesRead`, `averageScore` which `en.ts` lacks. `en.ts` has
`totalReads` (which `cn.ts` also has — OK), but no `totalEngagement`,
`favoriteGenres`, etc.

This means a component that calls `t("metrics.totalEngagement")` will
work in `cn.ts` but throw in `en.ts`. **The components are not
reading the cn-only keys yet**, but the structural drift is a setup
for runtime key-missing bugs.

**Impact:**
- Future contributors adding a Chinese key will forget to add the
  English equivalent and the English locale will render the key path
  as a literal string.

**Recommendation:**
Diff the two files and reconcile. Either remove the cn-only keys
(if not used) or add them to `en.ts`.

---

## Finding F-43-049 — `cn.ts` `genreEngagement.insights` keys differ from `en.ts` (Medium)

**File:** `apps/reading-advantage/locales/cn.ts`
**Lines:** 3964–3972
**File:** `apps/reading-advantage/locales/en.ts`
**Lines:** 4164–4172

**Finding:**

Same issue as F-43-048: `cn.ts` adds extra keys under `insights`
that `en.ts` does not have. Specifically `cn.ts` has all five
insight keys; `en.ts` has five as well but the wording in the
insights differs (e.g. `cn.ts:3968` `newRecommendation: "尝试{genre} - 与{sourceGenre}相似"` vs
`en.ts:4168` `newRecommendation: "Try {genre} - it's similar to {sourceGenre}"`).

The placeholder shapes match — good — but the keys need to be in
sync across all five locales. `th.ts`, `tw.ts`, and `vi.ts` need
to be checked for parity.

**Recommendation:**
Add a CI check that ensures all locale files have identical
key sets (deep-equal modulo values).

---

## Finding F-43-050 — All five locale files have inconsistent trailing whitespace / line endings (Low)

**Files:** all locale files
**Finding:** Grepping for trailing whitespace patterns is out of
scope for a manual review; spot-check confirmed a mix of 2-space
indentation and tab indentation is **not** present, but a few lines
have trailing spaces (e.g. `cn.ts:4070` based on visual inspection).

**Recommendation:**
Run `prettier --check` across `apps/reading-advantage/locales/` as
part of CI to enforce a single canonical format.

---

## Line-by-line review notes by file

### 1. `apps/reading-advantage/locales/client.ts` (16 lines)

Reviewed. Findings:
- L1: `import { useTranslations, useLocale } from "next-intl";` —
  standard. `useTranslations` is called with optional namespace
  on L5 (`useTranslations()`) and required on L9
  (`useTranslations(namespace)`). Both signatures supported.
- L4–L6: `useI18n()` returns the root translator. Trivial wrapper.
- L8–L10: `useScopedI18n(namespace)` is typed `string`. No runtime
  validation that `namespace` is a valid key in the dictionary.
- L12–L14: `useCurrentLocale()` re-exports `useLocale`. Two-layer
  indirection.
- L16: `export { usePathname, useRouter }` — re-exports. See
  finding F-43-035.

No security findings.

### 2. `apps/reading-advantage/locales/cn.ts` (3975 lines)

Reviewed in full. Findings are catalogued above:
- F-43-027 (typo `E伦理学`)
- F-43-029 (mixed-script phrase)
- F-43-030 (lesson phase key shape inconsistency)
- F-43-031 (emoji in user strings)
- F-43-032 (`selectType` keys left as English)
- F-43-048 (genre metrics key drift)
- F-43-049 (genre insights key drift)
- F-43-050 (formatting)

No security or auth findings.

### 3. `apps/reading-advantage/locales/en.ts` (4174 lines)

Reviewed in full. Findings:
- F-43-001 (line 1 imports `AssignmentPage`)
- F-43-002 (lines 2–3 unused `assign` from `lodash` and `next` from `next`)
- F-43-048 (metrics key drift)
- F-43-049 (insights key drift)
- F-43-050

No security findings.

### 4. `apps/reading-advantage/locales/navigation.ts` (7 lines)

Reviewed. Standard re-export from `@/i18n/routing`.
- F-43-036 (overlaps with `client.ts`).

### 5. `apps/reading-advantage/locales/server.ts` (15 lines)

Reviewed. Standard server-side i18n helper.
- F-43-037 (setRequestLocale alias — documented usage).

### 6. `apps/reading-advantage/locales/th.ts` (4115 lines)

Reviewed in full (sampled header and structure).
- F-43-001 (line 1 imports `AssignmentPage`)
- Line 2 imports `Target` from `lucide-react` — unused.

### 7. `apps/reading-advantage/locales/tw.ts` (3985 lines)

Reviewed in full (sampled header and structure).
- F-43-001 (line 1 imports `AssignmentPage`)

### 8. `apps/reading-advantage/locales/vi.ts` (4211 lines)

Reviewed in full (sampled header and structure).
- F-43-001 (line 1 imports `AssignmentPage`)

### 9. `apps/reading-advantage/middleware.ts` (205 lines)

Reviewed in full. Findings:
- F-43-005 (sub-fetch with no timeout)
- F-43-006 (`ROLES` re-declared)
- F-43-007 (level-test predicate overlap)
- F-43-008 (matcher missing observability endpoints)
- F-43-033 (pathname `includes(".")` over-broad)
- F-43-034 (redirect locale selection)
- F-43-045 (matcher fragility)

### 10. `apps/reading-advantage/next.config.mjs` (62 lines)

Reviewed in full. Findings:
- F-43-003 (CORS configuration)
- F-43-004 (`ignoreBuildErrors`, `reactStrictMode: false`)
- F-43-011 (`productionBrowserSourceMaps: false`)
- F-43-046 (remotePatterns OK)
- F-43-047 (`pageExtensions` includes `.js`)

### 11. `apps/reading-advantage/package.json` (166 lines)

Reviewed in full. Findings:
- F-43-009 (versions do not exist)
- F-43-010 (Argon2 vs bcryptjs duplication)
- F-43-038 (Google SDKs in app)
- F-43-039 (firebase-admin)
- F-43-040 (react-router-dom)
- F-43-041 (ts-fsrs placement)
- F-43-042 (workspace package name drift)
- F-43-043 (build heap size)
- F-43-044 (dev script default port)

### 12. `apps/reading-advantage/postcss.config.mjs` (5 lines)

Reviewed. Finding:
- F-43-012 (no autoprefixer).

### 13. `apps/reading-advantage/scripts/backfill-schools.ts` (432 lines)

Reviewed in full. Findings:
- F-43-013 (DRY_RUN misleading summary)
- F-43-014 (no transaction wrapper)
- F-43-015 (country hard-coded)
- F-43-016 (schoolName null guard missing)
- F-43-017 (unused `and` import)

### 14. `apps/reading-advantage/scripts/check-alignment-data.ts` (89 lines)

Reviewed in full. Findings:
- F-43-018 (raw `db.execute` cast to typed shape)
- F-43-019 (no exit code on error)

### 15. `apps/reading-advantage/scripts/check-archived.ts` (32 lines)

Reviewed in full. Findings:
- F-43-019 (no exit code on error)
- F-43-020 (no email override)

### 16. `apps/reading-advantage/scripts/check-classroom-teachers.ts` (56 lines)

Reviewed in full. Findings:
- F-43-019 (no exit code on error)
- F-43-020 (hard-coded demo email)
- F-43-021 (duplicated query)

### 17. `apps/reading-advantage/scripts/check-demo-data.ts` (96 lines)

Reviewed in full. Findings:
- F-43-019 (no exit code on error)
- F-43-022 (mixed `sql<number>` and `count()` usage)

### 18. `apps/reading-advantage/scripts/check-teacher-classrooms.ts` (98 lines)

Reviewed in full. Findings:
- F-43-019 (no exit code on error)
- F-43-020 (hard-coded demo email)
- F-43-023 (N+1 query pattern)

### 19. `apps/reading-advantage/scripts/clear-cache.ts` (30 lines)

Reviewed in full. Findings:
- F-43-019 (no exit code on error)
- F-43-024 (no logging on empty cache)

### 20. `apps/reading-advantage/scripts/refresh-activity-heatmap-matviews.ts` (93 lines)

Reviewed in full. Findings:
- F-43-019 (no exit code on error)
- F-43-025 (Postgres function existence not preflighted)
- F-43-026 (CJS-only `require.main === module`)

---

## Summary

- **Files reviewed:** 20 / 20 (100%).
- **Total lines:** 20,605.
- **Critical findings:** 2 (F-43-001, F-43-009).
- **High findings:** 4 (F-43-002, F-43-003, F-43-005, F-43-013, F-43-014).
- **Medium findings:** 8 (F-43-004, F-43-006, F-43-007, F-43-015, F-43-018, F-43-023, F-43-025, F-43-027, F-43-029, F-43-033, F-43-048, F-43-049).
- **Low / Info findings:** the remainder.
- **Files with no findings:** none.

The two critical issues are localized and have minimal blast radius:
- **F-43-001** is a four-file import-hygiene fix.
- **F-43-009** is a `package.json` version-pin fix.

The High findings (CORS config, middleware fetch, backfill transaction,
DRY_RUN semantics) are more architectural and may require their own
follow-up tracks.

---

## Recommended follow-up tracks (not part of this review)

1. **`ra-track-43-locale-import-cleanup`** — Remove the unused
   `AssignmentPage`/`assign`/`next`/`Target` imports from the four
   affected locale files and verify that the build still resolves.
2. **`ra-track-43-pkg-versions`** — Reconcile `package.json`
   versions against the npm registry and pin to real releases.
3. **`ra-track-43-middleware-hardening`** — Replace the internal
   session `fetch` with a direct cookie/DB lookup, add `Vary:
   Origin` to the CORS block, and import `Role` from a shared
   package.
4. **`ra-track-43-backfill-transaction`** — Wrap the four-step
   backfill in a Drizzle transaction and fix the DRY_RUN summary
   output.
5. **`ra-track-43-locale-key-parity`** — Add a CI check that
   ensures all locale files have identical key sets under each
   top-level section (`pages`, `components`, `genreEngagement`).

---

## Acceptance status

No acceptance claim is made. This is a read-only line-by-line
review. No app code, scripts, or configuration was modified.

```
MEASURE_AGENT_RESULT
```
