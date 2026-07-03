# Test Strategy: Wave 3 — Product-Facing Truth and Reusable Surfaces

> **Track ID:** `wave3_product_alignment_20260628`
> **Baseline SHA:** `1f2d17957a7ea0b58d79ca88e29219f73f1a1557`
> **Active phase for this cycle:** Phase 2 — Marketing App Public Workflow Security **only**.
> Phases 0/1 and 3–5 are deferred (see §9 Deferrals). This document specifies the
> Phase 2 test approach in full; other phases are stubs to be expanded when scheduled.

---

## 1. Scope of this cycle

We are executing **Phase 2: Marketing App Public Workflow Security** only. The app under
test is `apps/marketing` — a **vinext** app whose test runner is `vitest run`. Tests live
in `apps/marketing/app/__tests__/**` and `apps/marketing/app/**/*.{test,spec}.ts(x)`
(see `apps/marketing/vitest.config.ts`, `include`).

### Confirmed vulnerabilities to defend against (evidence-mapped)

| # | Route / concern | File | Evidence ID |
|---|-----------------|------|-------------|
| V1 | `GET /api/settings` decrypts secret values (`apiKey`/`secret`/`token`) and returns them with **no auth** — decrypted-API-key leak | `app/api/settings/route.ts` | LR-marketing-app-003-005 (also -003, -005 cluster) |
| V2 | All `/api/video/*` routes lack auth | `app/api/video/{save-topics,generate-script,research-topics,projects}/route.ts` | LR-004-002 |
| V3 | Campaigns list/detail/PATCH lack auth + owner/tenant policy | `app/api/campaigns/route.ts`, `app/api/campaigns/[id]/route.ts` | LR-marketing-app-003-001 / -003 |
| V4 | Missing Zod validation on settings POST, campaigns POST/PATCH, topics, `generate-script` inputs (unvalidated `request.json()` fed to prompt) | settings/campaigns/video routes | LR-004-001, LR-marketing-app-003-004 / -006 |
| V5 | AI calls should route through the shared `ai.generateText()` adapter, not per-request provider clients | `generate-script`, `research-topics`, `settings/test-connection` | LR-004-003 |

### Gate commands (marketing app)

- **RED_TEST_COMMAND / GREEN_TEST_COMMAND:** `pnpm --filter marketing test`
  (bounded Red runs may filter: `pnpm --filter marketing test <file-stem>`)
- **PROJECT_LINT:** `pnpm --filter marketing lint`
- **PROJECT_CHECKS:** `pnpm --filter marketing check-types`

---

## 2. The real auth seam (how marketing authenticates)

Mid-Red tests MUST exercise the real auth seam, not an ad-hoc local mock, or the 401
assertions become vacuous (A4). The seam is:

1. **Cookie:** `SESSION_COOKIE_NAME = "session_token"` exported from `@reading-advantage/auth`
   (`packages/auth/src/server.ts:76`). The session route reads it with
   `request.cookies.get(SESSION_COOKIE_NAME)?.value`
   (`packages/api/src/routes/auth/session.ts:15`).
2. **Existing wiring in marketing:** `app/api/auth/session/route.ts` re-exports
   `handleSession` and `app/api/auth/login/route.ts` wraps `handleLogin`, both from
   `@reading-advantage/api/routes/auth`. Login validates username/password via
   `@reading-advantage/auth` (`verifyPassword` + `createSession`) and sets the
   `session_token` httpOnly cookie (`packages/api/src/routes/auth/login.ts:181-204`).
3. **Server guards** (framework-agnostic, in `@reading-advantage/auth`, `./server.js`):
   - `getSession(db, token)` → `Session | null`
   - `requireAuth(db, token)` → throws `AuthError("Authentication required", "UNAUTHORIZED")`
     when no valid session.
   - `requireRole(db, token, role)` → throws `AuthError(..., "FORBIDDEN")` when role too low.
   - Session validation ultimately calls `validateSession(db, token)`
     (`packages/auth/src/session.ts`), which hashes the token and looks it up in the
     `sessions` table.
4. **Roles** (`packages/auth/src/roles.ts`): `INTERN, STUDENT, TEACHER, ADMIN, SYSTEM,
   SALES_REP, SALES_ADMIN`. Marketing is an internal staff tool; the intended gate is
   "any authenticated staff user" with a role floor to be confirmed (§6, `[NEEDS-PO]`).

### How Red tests use the seam without a live DB

The marketing route handlers currently take a plain `Request` (not `NextRequest`) and
call `db` directly. Red tests should exercise the guard behaviorally:

- **Unauthenticated case:** construct a `Request` with **no** `Cookie` header (or a cookie
  without `session_token`). The handler under test — once guarded — must resolve no token,
  call `requireAuth`/`getSession`, and return **401**.
- **Authenticated case (positive control):** construct a `Request` with
  `Cookie: session_token=<known-token>` and mock **only** `validateSession`
  (`@reading-advantage/auth`) so `<known-token>` resolves to a `Session` and every other
  token resolves to `null`. This drives the *real* `requireAuth` → `getSession` →
  `validateSession` chain; only the DB lookup is stubbed.

This positive/negative pairing is the anchor against false-green: a route that returns 401
for *everyone* (including the authed control) is a bug, and the positive-control assertion
catches it. See §7 A4/A5.

> **Design note for Jr-Green (not a test requirement):** guarding a `Request`-typed handler
> means either switching the signature to `NextRequest` (so `.cookies.get(...)` is available,
> matching `handleSession`) or parsing the `Cookie` header. Either is acceptable; the test
> asserts *behavior* (401 without a valid session), not the mechanism.

---

## 3. Tenant / owner scoping reality for marketing

Task Phase 2 mentions "owner/tenant scoping". The honest picture from source:

- All marketing tables are classified **REFERENTIAL** in
  `packages/domain/src/tenant-registry.ts:267-271` (`campaigns`, `videoProjects`,
  `videoAssets`, `pastTopics`, `settings`).
- **None of them has a `schoolId` column** (`packages/db/src/schema/marketing.ts`), and
  `campaigns` has **no `ownerId`/`createdBy`** column either. There is no data column to
  scope by today.

Therefore, for Phase 2 the **directly testable and defensible control is
authentication** (require a logged-in staff user), not multi-school `schoolId` scoping.
The strategy:

- **Primary (testable now):** every settings / video / campaign data+AI route returns
  **401 without a valid session**; the sensitive side effect does not run.
- **Policy documentation:** marketing is an internal, effectively single-tenant staff
  tool. The plan Phase 2 task "tenant/global policy documentation" is satisfied by an
  explicit written policy in the plan/route JSDoc: *these routes are global-internal,
  gated by authentication (+ role floor), not by `schoolId`.* This is a `[NEEDS-PO]`
  confirmation item, not a schema change in this cycle.
- **Conditional (only if PO approves owner columns):** if a `createdBy`/`schoolId`
  column is added to `campaigns` in a follow-up, add ownership-scoping tests then. Do
  **not** write a scoping test that asserts against a column that does not exist — that
  would be a vacuous/false test (A4). Document the deferral rather than fake the coverage.

---

## 4. Phase 2 test groups (Red → Green → Closeout)

Phase 2 is decomposed into five test groups. Each is a bounded Red target. All groups
share the Green gate `pnpm --filter marketing test` (whole marketing suite green,
including the pre-existing 151 tests) and the closeout gate in §5.

### Group 2A — Settings decrypted-secret leak (V1, LR-marketing-app-003-005)

**Target file (new):** `app/__tests__/phase-w3-settings-auth.test.ts`
**Red command:** `pnpm --filter marketing test phase-w3-settings-auth`

Red assertions:
1. `GET /api/settings` with **no session cookie** returns **401** (not 200, not 500).
2. The 401 response body contains **neither** any decrypted plaintext secret **nor** the
   stored ciphertext — i.e. it is a bare `{ message }`, and the exact seeded secret
   literal does not appear anywhere in the serialized body.
3. **Side-effect proof:** with no session, `decrypt` (spied via `@/lib/encryption`) is
   **never called**, and `db.select` is **not** invoked for the settings table. This
   proves the guard short-circuits *before* the decrypt/leak path — a route that returns
   401 but still decrypted first would still be a leak in logs/timing.
4. **Positive control:** `GET /api/settings` *with* a valid session (mocked
   `validateSession`) returns 200. (Whether secrets are masked even for authed callers is
   a hardening recommendation — see below.)
5. `POST /api/settings` with no session returns **401** and performs **no** `db.insert`.

Hardening recommendation (testable, encouraged but `[NEEDS-PO]` on UX): even for
authenticated callers, `GET /api/settings` should return secret keys **masked**
(e.g. `"••••"` or omitted) rather than decrypted plaintext, since the settings UI only
needs to know a key *is set*. If adopted, add: "authed GET returns a masked placeholder
for `llm.apiKey`, never the plaintext". This keeps the encrypt-at-rest guarantee from
`phase-3-settings.test.ts` intact while removing the read-back leak entirely.

### Group 2B — Video routes unauthenticated (V2, LR-004-002)

**Target file (new):** `app/__tests__/phase-w3-video-auth.test.ts`
**Red command:** `pnpm --filter marketing test phase-w3-video-auth`

Red assertions (one per route × verb): with **no session cookie**, each of
- `POST /api/video/save-topics`
- `POST /api/video/generate-script`
- `POST /api/video/research-topics`
- `GET /api/video/projects` and `POST /api/video/projects`

returns **401** and performs **no** database write and **no** AI call. Specifically:
- For `generate-script`/`research-topics`: `createAIClient`/`getAIClient` (mocked) is
  **never called** and `db.select(settings)` is not reached — proving the LLM/apiKey path
  is unreachable while unauthenticated (this is also the V1 secret-exposure surface,
  since these routes read `llm.apiKey`).
- For `save-topics`/`projects`: `db.insert` is **never called**.
- **Positive control:** each route with a valid session proceeds past the guard (200 or
  the route's documented non-auth error such as 400 "LLM not configured" / 400
  "campaignId required"), proving 401 is auth-specific, not a blanket failure.

### Group 2C — Campaigns unauthenticated + policy (V3, LR-marketing-app-003-001/-003)

**Target file (new):** `app/__tests__/phase-w3-campaigns-auth.test.ts`
**Red command:** `pnpm --filter marketing test phase-w3-campaigns-auth`

Red assertions:
1. `GET /api/campaigns` (list) with no session → **401**, no `db.select`.
2. `POST /api/campaigns` with no session → **401**, no `db.insert`.
3. `GET /api/campaigns/[id]` with no session → **401**, no `db.select`.
4. `PATCH /api/campaigns/[id]` with no session → **401**, no `db.update`.
5. **Positive controls** for each verb with a valid session (200 / documented 400 / 404).
6. **Policy assertion (documentation truthfulness):** a test asserts the route module (or
   a co-located `POLICY.md` / JSDoc) documents the global-internal auth policy from §3.
   Assert on the *presence of the policy statement*, not on a `schoolId` column that does
   not exist.

### Group 2D — Zod input validation (V4, LR-004-001, LR-marketing-app-003-004/-006)

**Target file (new):** `app/__tests__/phase-w3-input-validation.test.ts`
**Red command:** `pnpm --filter marketing test phase-w3-input-validation`

For each mutating route, with a **valid session** (so we isolate validation from auth),
send a malformed body and assert **400** with a structured validation error and **no**
persistence/AI side effect:
1. `POST /api/settings` — non-object body, or a value that is not a string → 400.
2. `POST /api/campaigns` — missing/invalid `type`/`app`/`name` (e.g. `app` not in the
   `appEnum`, `type` not in `campaignTypeEnum`) → 400, no insert.
3. `PATCH /api/campaigns/[id]` — `status` absent or not a valid `campaignStatusEnum`
   member → 400 **before** the status-transition machine runs.
4. `POST /api/video/save-topics` — `topics` not an array of strings, or `app` invalid → 400.
5. `POST /api/video/research-topics` — `app` missing/invalid → 400.
6. `POST /api/video/generate-script` — **the critical one**: `app`/`topic` missing or
   non-string must be rejected **before** `buildScriptGenerationPrompt(app, topic)` runs.
   Assert the prompt builder / AI client is **never called** with unvalidated input
   (defends the "unvalidated `request.json()` fed to the prompt" finding). A prompt-
   injection-style payload (e.g. `topic` = a 50KB string or an object) must be rejected
   by the schema, not forwarded to the model.

Each validation schema should be a Zod schema colocated in `app/lib/` (mirroring the
existing `app/lib/script-schema.ts`), reused by the route — assert the schema exists and
rejects the bad input at the unit level *and* that the route returns 400 (route-level).

### Group 2E — AI adapter routing (V5, LR-004-003)

**Target file (new):** `app/__tests__/phase-w3-ai-adapter.test.ts`
**Red command:** `pnpm --filter marketing test phase-w3-ai-adapter`

Assertions:
1. `generate-script` and `research-topics` obtain their AI client through the shared
   adapter (`@reading-advantage/ai` via `@/lib/ai`) — not a per-request raw provider SDK.
   `app/lib/ai.ts` already re-exports `createAIClient`/`getAIClient` from
   `@reading-advantage/ai`; assert the routes call the adapter (mocked) and never import
   `@ai-sdk/*` directly.
2. A static guard: the marketing route sources contain **zero** direct `@ai-sdk/*` or
   provider-SDK imports (mirrors the repo-wide guard
   `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts`). Use a labeled count
   assertion (§7 A3): parse "Direct SDK import count: N" and require `N === 0`.
3. Behavior: with a mocked adapter returning canned text, the route returns the parsed/
   validated result; with the adapter throwing, the route returns its documented error
   **without** echoing the `llm.apiKey` (reuse the redaction expectation already proven
   for `test-connection` in `phase-3-settings-adversarial.test.ts`).

---

## 5. Gates

### Red gate (per group)
`pnpm --filter marketing test <group-stem>` fails on the new assertions at baseline SHA
`1f2d1795`, for the intended reason (missing auth / missing validation / adapter bypass),
**not** an import error or unrelated crash. Mid-Red must confirm each new test fails with
an assertion message tied to the vulnerability, and that the positive-control path is
reachable (so the failure is specifically the guard/validation, not a broken route).

### Green gate (phase)
- `pnpm --filter marketing test` exits **0** — the whole marketing suite, i.e. the new
  Phase 2 files **plus** the pre-existing suites (`phase-1-boot*`, `phase-3-settings*`,
  `phase-4-campaigns`, `phase-5-topics`, `phase-6-script`, `phase-7-video-page`,
  `phase-8-projects*`, `wave2-test-truthfulness`). No regression in the 151 baseline tests.
- `pnpm --filter marketing lint` exits 0.
- `pnpm --filter marketing check-types` exits 0.

### Closeout gate (phase)
- All Green-gate commands green.
- Every V1–V5 vulnerability has at least one **red-at-baseline / green-after-fix** test
  with a positive control (proving non-vacuity).
- No decrypted plaintext **or** ciphertext secret appears in any unauthenticated response
  body (Group 2A/2B assertion holds).
- AI routes proven to go through the shared adapter; zero direct provider-SDK imports in
  marketing sources.
- `wave2-test-truthfulness.test.ts` still passes (no stale "RED at HEAD" docblocks, no
  contradictory credential comments, no tautologies, no DOM-in-node tests in the new files).

---

## 6. Fixtures, mocks, and live-behavior proof

- **DB mock (unit/route tests):** follow the established marketing pattern — hoisted
  `vi.mock("@reading-advantage/db", ...)` spreading `actual` then overriding `db` with
  `{ select, insert, update, execute }` `vi.fn()`s (see `phase-3-settings.test.ts:80-99`,
  `phase-4-campaigns.test.ts:49-69`). Use these to assert side-effect **absence** on the
  401 path (`expect(db.select).not.toHaveBeenCalled()`).
- **Auth seam mock:** mock **only** `validateSession` from `@reading-advantage/auth`
  (keep `requireAuth`/`getSession`/`SESSION_COOKIE_NAME` real). A known token resolves to a
  `Session` (shape per `packages/auth/src/session.ts` return: `{ user: { id, username,
  name, role, schoolId, ... } }`); all other tokens → `null`. This is the seam that makes
  the 401/positive-control pairing meaningful rather than vacuous.
- **AI mock:** mock `@reading-advantage/ai` `createAIClient`/`getAIClient` to return a
  fake client with a `generateText` spy (pattern from `phase-3-settings.test.ts:104-118`).
- **`next/server` shim:** either rely on the vitest.config alias to vinext shims, or the
  local `vi.mock("next/server", ...)` NextResponse stub used in
  `phase-4-campaigns.test.ts:40-45`. Prefer whichever the sibling suites use for the same
  route so behavior is consistent.
- **Encryption:** real `@/lib/encryption` (round-trip already covered). For 2A leak
  checks, spy on `decrypt` to assert it is not reached on the unauth path; use
  `ENCRYPTION_KEY` test fallback exactly as `phase-3-settings.test.ts:65-66`.
- **Live-behavior proof (PGlite):** the video-projects CRUD already has a real-Postgres
  proof (`phase-8-projects-live.test.ts` + `helpers/testDb.ts`). Phase 2 auth work is a
  **guard** concern, provable at the route level with the real `requireAuth` chain — a
  full live-DB session round-trip is **not required** for the 401 proof. If a reviewer
  wants an end-to-end auth proof, extend `testDb.ts` DDL with the `sessions`/`users`
  tables and seed a real session; this is optional and should be labeled as the
  live-behavior tier, distinct from the mocked route tier.

### Artifact/documentation vs live-behavior tests
- **Documentation/wiring tests** (e.g. Group 2C policy assertion, Group 2E static
  no-direct-SDK scan): these read source text and assert structure. They are legitimate
  but must be labeled as such and must never be the *only* evidence for a behavioral
  claim. A 401 claim requires a **behavioral** test (call the handler, assert status +
  side-effect absence), not a grep for `requireAuth` in the source.
- **Live-behavior tests**: call the actual route handler and assert on the `Response`
  status/body and mock-call side effects. These are the load-bearing tests for V1–V5.

---

## 7. Anti-pattern coverage (falsifiability per group)

Every Phase 2 test must have a falsification condition. The dominant risk class here is
the **vacuous / false-green** family (A4/A5/A6), plus scan-hygiene (A3/A7).

| Anti-pattern | Where it applies in Phase 2 | Defense |
|---|---|---|
| **A4** Vacuous-pass on nothing-done | Every 401 test (2A/2B/2C) | **Positive/negative control pairing** (§2): a valid-session request must reach 200/documented-non-auth-error. A route that 401s for everyone fails the positive control. Also assert side-effect **absence** on the 401 path (`decrypt`/`db.*`/AI adapter not called), so a route that 401s *after* leaking still fails. |
| **A5** False-claim text vs test reality | Plan text for Phase 2 | Do not write "routes secured" / "all checks pass" in `plan.md` unless `pnpm --filter marketing test` exits 0. The cited command is the source of truth. |
| **A6** Registry-note overstatement | `measure/tracks.md` marketing row / `marketing_golive` preconditions | Do **not** claim the "decrypted-API-key leak" or "unauthenticated `/api/video/*`" is resolved in any registry note until Groups 2A+2B are green. The Go-Live track hard-gates on exactly this (tracks.md:82-83); a premature "resolved" note is the A6 failure mode. |
| **A3** Digit-only as labeled count | Group 2E direct-SDK count; any "N secrets in body" count | Use a **labeled integer** assertion — e.g. emit `Direct SDK import count: N` / `Leaked secret occurrences: N` and parse the integer; never `rg -q '[0-9]+'` or a bare-digit match. |
| **A7** Over-broad filter swallowing hits | 2A/2B body-leak scans | When scanning a response body for a leaked secret, match the **exact seeded secret literal** (e.g. `sk-w3-test-...`), not bare English words like "secret"/"token" (which appear legitimately in `{ message }` and key names). |
| **A9** Test references archived track paths | New Phase 2 test files | New tests reference `measure/tracks/wave3_product_alignment_20260628/...` in docblocks only for provenance; assert **no** runtime dependency on a track path. If the track later archives, tests must not break — keep them path-independent (they test `apps/marketing` source, not measure docs). |

A1, A2, A8, A10, A11 are orchestrator/plan-marker or publish/consent classes not exercised
by Phase 2 product tests: A2 (consent publish gate) — n/a, no publish flow here; A8
(`[ ]` marker) / A11 (review-execution blocked) — plan-hygiene handled by the plan-update
role; A10 (generated-facts drift) — n/a to marketing product tests; A1 (supervisor
substring) — orchestrator-internal. They are recorded here as consciously-not-applicable
rather than silently skipped.

---

## 8. Intentionally-red aggregate-suite handling

The monorepo aggregate suite (`pnpm turbo run test`) is **red at baseline** from
pre-existing, owner-labeled failures outside Wave 3 (see the Wave 1/2 archive notes in
`measure/tracks.md:112-115`: "aggregate reds are pre-existing/owner-labeled"). Phase 2
does **not** attempt to green the aggregate suite. The Phase 2 gate is **scoped to the
marketing filter** (`pnpm --filter marketing test`), which must be fully green. Any
non-marketing aggregate red observed during this phase is pre-existing and must be
labeled as such in the phase result `known_failures` — never silently absorbed into a
"green" claim (A5/A6).

---

## 9. Deferrals (explicit)

- **Phase 0 — Product Decision Intake:** deferred. Requires product-owner decisions
  (visible product pages, approved AI/model claims, games import policy, approved efficacy
  stats). No tests authored this cycle.
- **Phase 1 — Website Claims Correction:** deferred. Depends on Phase 0 decisions
  (`[NEEDS-PO]`). The `www-reading-advantage` claim tests (LRF-001/002/012/013/014) are
  out of scope for this cycle.
- **Phases 3–5 — Advantage Games** (completion/scoring contract, tenant-safe persistence
  and leaderboards, embeddable runtime/i18n/shared package): deferred to a later cycle.
  Test strategy for these will be authored when scheduled; the plan's D-01..D-11 evidence
  refs are carried forward untouched.
- **Phase 6 — Product Acceptance:** deferred until Phases 0/1 and 3–5 are executed.

Within Phase 2, one `[NEEDS-PO]` item remains: the exact **role floor** for marketing
routes (any authenticated staff user vs. an `ADMIN`-equivalent floor) and whether
`GET /api/settings` should mask secrets for authenticated callers. The Red tests assert
the **authentication** boundary (401 without a session), which holds under either PO
decision; the role-floor tests should be added once the floor is confirmed.

---

## 10. Summary

Phase 2 delivers five new marketing test files (2A settings leak, 2B video auth, 2C
campaigns auth+policy, 2D Zod validation, 2E AI adapter), each red at
`1f2d1795` for the specific vulnerability and green after the fix, each with a
positive/negative control pairing that makes the 401/validation assertions non-vacuous.
The phase gate is `pnpm --filter marketing test` = 0 plus lint and check-types, with the
aggregate monorepo suite explicitly out of scope. Tenant/owner "scoping" is handled
honestly as an authentication + documented global-internal policy, because no `schoolId`
or owner column exists on marketing tables today.
