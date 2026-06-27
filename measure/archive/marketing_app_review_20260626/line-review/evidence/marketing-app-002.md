# Line Review Evidence: marketing-app-002

Reviewer: coder-minimax-m3/marketing-app-002
Files assigned: 2
Lines assigned: 826

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/marketing/app/__tests__/phase-3-settings.test.ts | 1-451 | reviewed | 3 |
| apps/marketing/app/__tests__/phase-4-campaigns.test.ts | 1-375 | reviewed | 5 |

## Findings

### LR-marketing-app-002-001 — Brittle raw-source regex assertions for page structure

- Severity: Low
- Category: tests-build
- File: `apps/marketing/app/__tests__/phase-3-settings.test.ts:143-174`
- Evidence: Tier 1 "wiring invariants" tests at lines 145, 156, 157, 163, 170, 172 read `app/settings/page.tsx` via `readFileSync` and match against raw JSX source with regex such as `/<h1[^>]*>\s*Settings\s*<\/h1>/`, `/value="google"[^>]*>\s*Google/`, `/value="openai"[^>]*>\s*OpenAI/`, `/type="password"[\s\S]{0,200}apiKey/`, `/mmx CLI Path/`, and `/tools\.mmxPath/`. The FR-12 comment at lines 134-135 acknowledges source-regex brittleness and removes only the `existsSync` case; the remaining regex assertions still couple tests to the exact text/whitespace shape of the source file.
- Impact: A benign refactor of the settings page (re-ordering attributes, replacing the `<h1>` literal with a translated constant, switching to a `<Label htmlFor>` style form) breaks the wiring test even though runtime behavior is unchanged. The tests will read as "regressions" in CI for cosmetic-only edits.
- Recommendation: Replace source-text regex with `data-testid` query selectors and render via a DOM/React testing harness (`@testing-library/react` or the app's existing component-render helper). If kept as wiring guards, narrow each regex to a single token (e.g., literal `Settings` page title) and skip attribute-order/whitespace expectations.

### LR-marketing-app-002-002 — Mock factory re-exports `__fakeAIClient` on the `@reading-advantage/ai` module surface

- Severity: Medium
- Category: tests-build
- File: `apps/marketing/app/__tests__/phase-3-settings.test.ts:104-118, 386-391, 420-425`
- Evidence: The `vi.mock("@reading-advantage/ai", ...)` factory at lines 104-118 attaches `__fakeAIClient` to the returned mock object (line 116). The two consumers in the file (lines 386-391 and 420-425) re-import the module and reach the symbol only via `as unknown as { __fakeAIClient: { generateText: Mock } }` casts. The `__fakeAIClient` symbol does not exist on the real `@reading-advantage/ai` module and is consumed nowhere outside this test file.
- Impact: Mock plumbing leaks a fake-only symbol into the module surface, forcing double casts (`unknown` then a structural shape) at every consumer. Renaming the symbol or restructuring the mock factory will produce confusing errors at the cast site rather than at the test body. The pattern is brittle and inconsistent with the cleaner `createAIClient` / `getAIClient` mock-fn checks used elsewhere in the file.
- Recommendation: Hold the fake client in a module-scoped `let __aiGenerateText: Mock` declared before the `vi.mock` factory, capture the same `vi.fn()` instance from inside the factory, and have consumers inspect it directly. Avoid re-exporting fake symbols through the module being mocked.

### LR-marketing-app-002-003 — Stale "RED at HEAD" framing in header docblock and inline comments

- Severity: Low
- Category: tests-build
- File: `apps/marketing/app/__tests__/phase-3-settings.test.ts:24-46, 184, 268-271, 282, 333`
- Evidence: The header docblock at lines 24-46 (and inline comment at line 184, line 268-271) describes the file as "RED at HEAD because no `@/lib/encryption` module exists yet" and "the current route calls `db.insert` with `String(value)` — the plaintext is stored." At HEAD, `apps/marketing/app/lib/encryption.ts:1-53` exists and exports `encrypt`/`decrypt`, and `apps/marketing/app/api/settings/route.ts:4, 18, 36-38` already wires `encrypt(value)` for any key matching `SECRET_KEY_PATTERNS` (lines 6, 36). All four tiers now run Green.
- Impact: Future maintainers reading the docblock will believe the encryption layer is missing and may attempt to re-implement it. Misleading header text also obscures the contract the tests are actually locking in.
- Recommendation: Replace "RED at HEAD" / "expected to FAIL at HEAD" wording with a Green-status summary that documents the existing encryption contract, the route wiring, and the regression-guard role of each tier. Update inline comments at lines 184 and 268-271 to reference the current implementation instead of a hypothetical one.

### LR-marketing-app-002-004 — Stale "RED at HEAD" framing in phase-4-campaigns header docblock

- Severity: Low
- Category: tests-build
- File: `apps/marketing/app/__tests__/phase-4-campaigns.test.ts:24-29, 274-275, 326-328`
- Evidence: Header at lines 24-29 states "no helper module exists and the PATCH route currently accepts any `body.status`." Inline comments at lines 274-275 ("Expected to FAIL at HEAD: no `apps/marketing/app/lib/campaign-status.ts` module exists yet") and lines 326-328 ("at HEAD, the route would succeed in persisting the invalid transition") repeat the same claim. At HEAD, `apps/marketing/app/lib/campaign-status.ts:1-21` defines `STATUS_TRANSITIONS` and exports both helpers, and `apps/marketing/app/api/campaigns/[id]/route.ts:5-8, 56-63` enforces the transition check, returning 400 on invalid transitions.
- Impact: The docblock misrepresents the campaign-status state machine as not-yet-built; reviewers or new contributors may waste effort investigating a problem that has been resolved.
- Recommendation: Update the header docblock and the inline comments at lines 274-275 and 326-328 to describe the Green status and the regression-guard role of the state-machine tier.

### LR-marketing-app-002-005 — `next/server` NextResponse is replaced with a hand-rolled Response stub

- Severity: Low
- Category: tests-build
- File: `apps/marketing/app/__tests__/phase-4-campaigns.test.ts:40-45`
- Evidence: The mock at lines 40-45 replaces `next/server`'s `NextResponse` with `(body, init) => new Response(JSON.stringify(body), init)`. The header comment at lines 36-39 explains that Vinext shims point to a non-resolvable path under vitest. Only `NextResponse.json` is replaced; production `NextResponse` features (cookies, headers, status helpers, redirect, etc.) are not represented.
- Impact: Tests assert HTTP shape (status code, JSON body) but cannot detect if the route relies on Next-specific behavior the stub does not implement. Status-code semantics differ subtly between `new Response(init)` and `NextResponse.json` for edge inputs (e.g., undefined init, status 204 with body).
- Recommendation: Configure vitest to alias `next/server` to the real Vinext/Next shim where one is available; otherwise, narrow the test scope to handler-level behavior and document explicitly that the tests do not exercise the full Next.js request/response surface. Add an integration-test path that runs the routes through Vinext in a separate tier.

### LR-marketing-app-002-006 — Drizzle select-chain mock supports only `.where()` and `.orderBy()`; unknown chain operations silently succeed

- Severity: Low
- Category: tests-build
- File: `apps/marketing/app/__tests__/phase-4-campaigns.test.ts:93-99`
- Evidence: `makeSelectChainMock` returns `{ where: whereMock, orderBy: orderByMock }` from `.from()`. There is no handler for `.limit()`, `.offset()`, `.leftJoin()`, `.innerJoin()`, `.groupBy()`, or any other Drizzle operator; calling one would throw "is not a function" in the route under test. The factory's `whereMock` and `orderByMock` both resolve to the same `rows` regardless of which was called (line 94-95), so the test cannot distinguish whether the route invoked `.where()`, `.orderBy()`, or both.
- Impact: A future route change that adds `.limit(10)` will produce a runtime failure inside the route handler at the call site rather than inside the test. The two tests that consume the chain (lines 159-171, 206-219, 221-232) cannot detect missing chain operations; they would still pass against an empty stub if the route's select returned rows without filtering.
- Recommendation: Either constrain `from()` to return a Proxy that throws on unknown methods (with a clear test failure), or document which Drizzle operations the mock supports and add `expect(orderByMock).toHaveBeenCalledWith(...)` assertions to lock the chain shape on each test that depends on ordering.

### LR-marketing-app-002-007 — Auth/session contract is not exercised in any PATCH or POST test in this batch

- Severity: Medium
- Category: auth-api
- File: `apps/marketing/app/__tests__/phase-4-campaigns.test.ts:173-204, 234-265, 321-374`
- Evidence: PATCH tests at lines 234-265, 321-348, 350-374 and the POST test at lines 173-204 invoke the route handler directly with a `Request` carrying only `content-type: application/json` — no session cookie, no auth header, no user identifier. None of the assertions verify that the route rejects unauthenticated callers, returns 401/403, or scopes the affected row by `schoolId`. The actual route (`apps/marketing/app/api/campaigns/[id]/route.ts:36-87` and `apps/marketing/app/api/campaigns/route.ts:21-39`) does not include any auth or `schoolId` scoping either, so the tests' silence is consistent with the implementation gap.
- Impact: Auth/tenant enforcement for campaign mutation is undocumented at the test layer. A future change that adds auth will not have a regression-guard test, and the gap is not surfaced by this suite.
- Recommendation: Add a contract test that POSTs to `/api/campaigns` and PATCHes `/api/campaigns/[id]` with no session and asserts a 401/403 response (or whatever the documented policy is). Once the implementation enforces `schoolId` scoping, add a test that asserts the route rejects updates across tenants.

### LR-marketing-app-002-008 — "ordered by createdAt desc" test does not assert ordering

- Severity: Low
- Category: tests-build
- File: `apps/marketing/app/__tests__/phase-4-campaigns.test.ts:159-171`
- Evidence: The test at lines 159-171 is named "GET /api/campaigns returns the list ordered by createdAt desc" but the assertion block only checks `body.length === 1` and `body[0].name === mockCampaign.name`. The mock fixture passes a single row, so no ordering relationship exists between rows. `orderByMock` is never asserted to have been called, nor is it asserted that the route passed `desc(campaigns.createdAt)` (or any column).
- Impact: The test name promises a behavior that is not actually verified. A regression that removes `.orderBy(desc(campaigns.createdAt))` from `apps/marketing/app/api/campaigns/route.ts:11` would not be caught by this test. The fact that `whereMock` and `orderByMock` both resolve to the same rows (line 94-95) compounds the issue: the test passes regardless of which (or neither) chain method was invoked.
- Recommendation: Pass a multi-row fixture and assert ordering by `createdAt`. Capture `orderByMock.mock.calls` and assert the first call received the `desc(campaigns.createdAt)` (or equivalent) argument. Either rename the test to match what it actually verifies or expand it to lock in ordering.
