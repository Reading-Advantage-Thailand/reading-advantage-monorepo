# Backend package review

The review found concrete authorization, session state, token cache, and script failures.
This review sampled source and tests in all 13 assigned units. It does not certify every function.
The reviewer preserved existing changes and made no code changes.

## Findings

### B1 — High: Password reset accepts unrelated roles

- Source: `packages/api/src/routes/auth/reset-password.ts:51-83`; `packages/auth/src/roles.ts:17-25`.
- `requireRole(..., "TEACHER")` admits SALES_ADMIN and SYSTEM through the numeric hierarchy.
- The handler restricts only TEACHER and ADMIN actors. SALES_ADMIN can reset an ADMIN password in another school.
- ADMIN actors can also reset SYSTEM and SALES_ADMIN targets because the target check rejects only ADMIN.
- Minimal fix: apply an explicit route policy for supported actor and target roles. Preserve the shared hierarchy.
- Tests: reject SALES_ADMIN actors before database writes. Reject SYSTEM and SALES_ADMIN targets for ADMIN actors.
- Preserve allowed TEACHER and ADMIN reset cases.

### B2 — High: Registration accepts unrelated administrative roles

- Source: `packages/api/src/routes/auth/register.ts:48-65`.
- SALES_ADMIN passes the TEACHER hierarchy gate and bypasses the TEACHER school check.
- A Sales administrator can create a student in any school through this shared route.
- Minimal fix: reuse an explicit education administration policy. Permit only the documented actors.
- Tests: reject SALES_ADMIN before insertion. Preserve same-school TEACHER registration and authorized ADMIN registration.

### B3 — Medium: A pending session check can undo logout

- Source: `packages/auth-client/src/provider.tsx:101-122`.
- Logout clears state before the request, but sets the session-check guard only after success.
- A pending mount response can restore the user during logout. A failed logout leaves that restored state active.
- Minimal fix: set the guard before clearing state and starting the logout request.
- Tests: hold the mount request pending, fail logout, then resolve the mount request with an authenticated user.
- Assert that the user remains cleared. Repeat with a successful delayed logout.

### B4 — Medium: GitHub token cache ignores installation identity

- Source: `packages/integrations/github/src/drivers/rest.ts:61-75`.
- After installation A populates the cache, `listRepositoriesForInstallation(B)` uses A's token until expiry.
- The method returns A's repositories instead of B's repositories.
- Minimal fix: store the installation ID beside the cached token. Reuse the token only when the ID matches.
- Tests: request A, then B, then B again. Verify separate token acquisition and reuse for the last call.

### B5 — Medium: Article generation fails during module loading

- Source: `packages/reading-advantage-scripts/generateArticle.js:1-12`.
- The installed OpenAI package does not export the legacy `Configuration` constructor.
- Loading this module throws `TypeError: Configuration is not a constructor` before any generation request.
- Reproduction: `node -e "require('./packages/reading-advantage-scripts/generateArticle.js')"`.
- Minimal fix: use the installed SDK interface or reuse the existing AI adapter for this script.
- Test: load the module with mocked credentials and provider calls. Verify one structured generation result.
- Related source: lines 127-142 retry indefinitely and append undefined after each failure.
- Bound retries and append only successful results when repairing this generation path.

### B6 — Medium: The active session cap does not serialize concurrent creation

- Source: `packages/auth/src/session.ts:47-91`.
- Two transactions can both read nine sessions and then insert one session each.
- A normal transaction does not serialize this count at PostgreSQL's default isolation level.
- The result exceeds the documented ten-session cap.
- Minimal fix: lock the user's row inside the transaction before counting and inserting sessions.
- Test: coordinate concurrent session creation from nine active sessions. Assert that at most ten sessions remain.
- Existing session tests check transaction use but do not exercise concurrent database transactions.

## Unit coverage

| Unit | Inspected source and tests | Evaluation |
| --- | --- | --- |
| packages/ai | `src/client.ts`, `src/providers/openai.ts`, `src/providers/google.ts`, provider test inventory | Checked provider selection, missing credentials, structured output forwarding, and errors. No additional confirmed defect. |
| packages/api | `src/context.ts`, `src/routes/auth/register.ts`, `src/routes/auth/reset-password.ts` | Checked session resolution, input validation, role gates, target roles, and school checks. Findings B1 and B2. |
| packages/auth | `src/roles.ts`, `src/session.ts`, `src/server.ts`, `src/__tests__/session.test.ts` | Checked hierarchy, token storage, expiry, revocation, and session creation. Finding B6. |
| packages/auth-client | `src/index.ts`, `src/provider.tsx`, `src/__tests__/hooks.test.tsx`, contract test inventory | Checked mount restoration, forbidden state, login, and logout ordering. Finding B3. |
| packages/backend | `src/modules/accounting/submissions.ts`, `src/modules/accounting/__tests__/approvals.test.ts` | Checked actor scope, evidence ownership, idempotent content checks, owner approval, and input validation. No additional confirmed defect. |
| packages/db | `src/index.ts`, `src/client.ts`, `src/connection-options.ts`, `src/migration-files.ts` | Checked runtime configuration, pooled connection settings, socket handling, and SQL breakpoint parsing. No additional confirmed defect. |
| packages/domain | `src/users/mutations.ts`, `src/users/permissions.ts`, `src/assignments/mutations.ts` | Checked profile updates, classroom school checks, student enrollment, transaction boundaries, and submission ownership. No additional confirmed defect. |
| packages/integrations/github | `src/drivers/rest.ts`, `package.json`, `src/__tests__/client.test.ts` | Checked authentication, URL encoding, error handling, issue mapping, and token reuse. Finding B4. |
| packages/reading-advantage-scripts | `generateArticle.js`, `readabilityCalculator.js`, `package.json` | Checked generation startup, retries, output insertion, and readability calculations. Finding B5. |
| packages/storage | `src/drivers/s3.ts`, `src/urls.ts`, `src/__tests__/s3-driver.test.ts` | Checked private upload defaults, missing-object classification, reads, signing, and provider errors. No additional confirmed defect. |
| packages/types | `src/contracts/envelopes.ts`, `src/__tests__/auth-response-validation.test.ts` | Checked shared discriminators and malformed authentication payload tests. No additional confirmed defect. |
| packages/webhooks | `src/github.ts`, webhook test inventory | Checked signatures, payload schema validation, delivery handling, and durable worker dispatch. No additional confirmed defect. |
| services/worker | `src/main.ts`, `src/worker-composition.ts`, `src/__tests__/worker-lifecycle.red.test.ts` | Checked bounded claims, tenant matching, handler schemas, lease renewal, and shutdown bounds. No additional confirmed defect. |

## Checks and limits

- Read the repository instructions, Measure skill, index, workflow, lessons, debt registry, and review specification.
- Found no nested AGENTS.md files in the assigned package and worker paths.
- `build-graph callers ./graph.db handleResetPassword` returned no results. Source inspection supplied the route evidence.
- The script import reproduction failed with the constructor error stated in B5.
- Initial focused pnpm commands produced no test output through the local package-manager wrapper.
- Direct test wrappers also reported sandbox stream permission errors. An escalated bounded retry started without test output.
- The parent runs the aggregate baseline and records test results. This report does not claim passing test suites.
- The review used no production services and made no provider calls.
