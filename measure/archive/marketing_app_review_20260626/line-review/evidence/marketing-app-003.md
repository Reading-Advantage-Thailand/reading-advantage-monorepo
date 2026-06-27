# Line Review Evidence: marketing-app-003

Reviewer: coder-deepseek-v4-flash/marketing-app-003
Files assigned: 10
Lines assigned: 1102

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/marketing/app/__tests__/phase-5-topics.test.ts | 1-395 | reviewed | 0 |
| apps/marketing/app/__tests__/phase-6-script.test.ts | 1-453 | reviewed | 0 |
| apps/marketing/app/api/auth/login/route.ts | 1-21 | reviewed | 1 |
| apps/marketing/app/api/auth/logout/route.ts | 1-2 | reviewed | 0 |
| apps/marketing/app/api/auth/session/route.ts | 1-2 | reviewed | 0 |
| apps/marketing/app/api/campaigns/[id]/route.ts | 1-88 | reviewed | 2 |
| apps/marketing/app/api/campaigns/route.ts | 1-39 | reviewed | 2 |
| apps/marketing/app/api/health/db/route.ts | 1-18 | reviewed | 0 |
| apps/marketing/app/api/settings/route.ts | 1-55 | reviewed | 2 |
| apps/marketing/app/api/settings/test-connection/route.ts | 1-29 | reviewed | 1 |

## Findings

### LR-marketing-app-003-001 — Campaigns listing returns all campaigns without auth or tenant scoping

- Severity: High
- Category: auth-api
- File: `apps/marketing/app/api/campaigns/route.ts:6-18`
- Evidence: `GET()` handler at line 6-18 calls `db.select().from(campaigns).orderBy(desc(campaigns.createdAt))` with no `schoolId` filter, no session check, and no authorization guard. Returns the full campaign list to any caller as JSON.
- Impact: Any visitor (authenticated or not) can enumerate all campaigns in the system. Violates multi-tenant data isolation per AGENTS.md multi-tenancy rules which require every query to be scoped by `schoolId`.
- Recommendation: Add session verification, resolve `schoolId` from the authenticated user context, and scope the query by `eq(campaigns.schoolId, user.schoolId)`.

### LR-marketing-app-003-002 — Campaign creation lacks input validation and schoolId

- Severity: Medium
- Category: persistence
- File: `apps/marketing/app/api/campaigns/route.ts:21-38`
- Evidence: `POST` handler at line 23 calls `await request.json()` and uses `body.type`, `body.app`, `body.name` directly without any Zod schema validation. No `schoolId` value is set on the inserted campaign object (lines 26-29). The insert at line 24-30 uses only the three user-supplied fields.
- Impact: Malformed or unexpected payloads reach the database layer without runtime type safety. Created campaigns have no tenant association, making multi-tenant isolation impossible.
- Recommendation: Define a Zod schema for campaign creation input; inject `schoolId` from the authenticated user's session before insertion.

### LR-marketing-app-003-003 — Campaign [id] GET and PATCH lack auth and multi-tenant access control

- Severity: High
- Category: auth-api
- File: `apps/marketing/app/api/campaigns/[id]/route.ts:10-34, 36-87`
- Evidence: `GET` handler (lines 10-34) selects campaign by `params.id` with no session verification or ownership check. `PATCH` handler (lines 36-87) reads request body, checks campaign existence, validates status transition, then updates — all without verifying the requesting user's identity or `schoolId`. The `params.id` from the URL path is the only filter used in the DB queries (lines 17, 46, 71).
- Impact: Any unauthenticated caller can read or modify any campaign by guessing or brute-forcing its UUID. No enforcing of tenant boundaries.
- Recommendation: Add session verification; scope GET/PATCH queries by the authenticated user's `schoolId` in addition to campaign id.

### LR-marketing-app-003-004 — Campaign [id] PATCH lacks Zod runtime validation on request body

- Severity: Medium
- Category: adapter-neutrality
- File: `apps/marketing/app/api/campaigns/[id]/route.ts:41-42`
- Evidence: At line 41, `const body = await request.json()` consumes the request body without Zod schema validation. At line 42, `body.status` is cast as `CampaignStatus` (a TypeScript type) with no runtime guard. The only validation is the domain-level `isValidCampaignStatusTransition` check at line 56, which assumes `nextStatus` is already a valid `CampaignStatus`.
- Impact: A malformed payload (e.g., `{status: 123}` or `{status: "invalid"}`) passes the TypeScript cast but could cause unexpected behavior or errors in the transition check. Relies on TypeScript-only type safety which is absent at runtime.
- Recommendation: Use Zod to validate the request body shape, ensuring `status` is a known `CampaignStatus` enum value at runtime.

### LR-marketing-app-003-005 — Settings GET returns decrypted API keys with no authentication

- Severity: Critical
- Category: auth-api
- File: `apps/marketing/app/api/settings/route.ts:12-28`
- Evidence: `GET` handler at line 12-28 retrieves all rows from the `settings` table (line 14), then decrypts values matching secret key patterns (`apiKey`, `secret`, `token`) via `decrypt(s.value)` at line 18, and returns the decrypted secrets in the JSON response (line 21). There is no session or auth check anywhere in the handler.
- Impact: Any unauthenticated caller can retrieve all LLM API keys and other secrets in plaintext. This is a credential exposure vulnerability.
- Recommendation: Add session verification before processing settings; require an admin or owner role; consider masking secret values in responses (return `****` prefix or a boolean `hasValue` flag).

### LR-marketing-app-003-006 — Settings POST lacks Zod schema validation

- Severity: Medium
- Category: adapter-neutrality
- File: `apps/marketing/app/api/settings/route.ts:30-54`
- Evidence: `POST` handler at line 32 calls `await request.json()` without a Zod schema. At line 33, the body is typed as `Record<string, string>` via `Object.entries(body)` — any key-value pair from the client is iterated and upserted into the `settings` table (lines 39-45). There is no allowlist of known setting keys, no value format validation, and no type checking.
- Impact: Any caller (once authenticated) can write arbitrary key-value pairs, potentially overwriting critical settings or injecting malformed configuration values. TypeScript's `Record<string, string>` is unenforced at runtime.
- Recommendation: Define a Zod schema for settings input that enumerates known setting keys and their expected value types/rules.

### LR-marketing-app-003-007 — Settings test-connection route lacks auth and input validation

- Severity: High
- Category: ai-boundary
- File: `apps/marketing/app/api/settings/test-connection/route.ts:4-29`
- Evidence: `POST` handler at line 4-29 destructures `{provider, modelName, apiKey}` from the request body with no Zod schema validation (line 6). The `provider` is cast as `"google" | "openai"` for TypeScript (line 9) but not validated at runtime. The handler calls `createAIClient` (line 8-12) with user-supplied values and `generateText` (line 15-18) to test the connection. No session or auth check exists.
- Impact: Unauthenticated callers can trigger AI provider connections with arbitrary credentials and provider names. Missing runtime validation could pass structurally invalid provider strings to the AI adapter layer, potentially causing cryptic errors or wasted API calls.
- Recommendation: Add session verification; define a Zod schema for the request body with enum validation on `provider` and format validation on `apiKey`.

### LR-marketing-app-003-008 — Login route uses console.error instead of shared structured logger

- Severity: Low
- Category: adapter-neutrality
- File: `apps/marketing/app/api/auth/login/route.ts:9-14`
- Evidence: The error block at lines 9-14 uses `console.error(JSON.stringify({level: "error", event: "login_error", message: ...}))` instead of a shared structured logging utility. While the JSON structure is well-formed, it bypasses any centralized log routing or observability infrastructure.
- Impact: Login error logs may not reach the project's centralized logging system, making operational debugging harder. Inconsistent with AGENTS.md observability guidelines that prefer structured logs through shared infrastructure.
- Recommendation: Adopt a shared structured logger from the backend/observability package instead of raw `console.error`.

## No-Finding Notes

- `apps/marketing/app/__tests__/phase-5-topics.test.ts`: Reviewed line-by-line (395 lines). Well-structured test file with four tiers (wiring invariants, prompt builder, dedup matcher, API integration). Tests are properly isolated with mocked DB and AI client. RED tests are by design per the video pipeline plan. Source-regex assertions for wiring invariants (lines 127-136, 139-155) are acceptable regression guards. No material findings.

- `apps/marketing/app/__tests__/phase-6-script.test.ts`: Reviewed line-by-line (453 lines). Well-structured test file with five tiers (wiring invariants, prompt builder, JSONB schema, scene editor, API integration). Proper mocking of DB and AI client. RED tests are by design per the video pipeline plan. Scene-editor pure-function tests verify immutability. Script API tests cover both success and failure (invalid schema) paths. No material findings.

- `apps/marketing/app/api/auth/logout/route.ts`: Reviewed line-by-line (2 lines). Simple delegation to shared `handleLogout` from `@reading-advantage/api/routes/auth`. No code of substance beyond the re-export. No findings.

- `apps/marketing/app/api/auth/session/route.ts`: Reviewed line-by-line (2 lines). Simple delegation to shared `handleSession` from `@reading-advantage/api/routes/auth`. No code of substance beyond the re-export. No findings.

- `apps/marketing/app/api/health/db/route.ts`: Reviewed line-by-line (18 lines). Straightforward DB health check endpoint. Runs `SELECT 1`, returns ok/error. Health endpoints conventionally do not require auth. No findings.
