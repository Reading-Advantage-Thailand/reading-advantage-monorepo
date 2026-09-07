# Backend repair implementation

## Disposition

| Finding | Result | Change |
| --- | --- | --- |
| B1 | Fixed | The reset route now permits only TEACHER and ADMIN actors. ADMIN targets are limited to STUDENT and TEACHER. |
| B2 | Fixed | The registration route now permits only TEACHER and ADMIN actors before database access. |
| B3 | Fixed | Logout now suppresses the pending mount check before local state changes or network access. |
| B4 | Fixed | The GitHub token cache now includes the installation ID. |
| B5 | Fixed | The script uses the installed OpenAI client interface. It validates structured results and stops after three failed attempts. |
| B6 | Fixed | Session creation locks the user row before the active-session count. It also repairs counts above ten. |

## Files

Production files:

- `packages/api/src/routes/auth/register.ts`
- `packages/api/src/routes/auth/reset-password.ts`
- `packages/auth-client/src/provider.tsx`
- `packages/auth/src/session.ts`
- `packages/integrations/github/src/drivers/rest.ts`
- `packages/reading-advantage-scripts/generateArticle.js`
- `packages/reading-advantage-scripts/package.json`

Test files:

- `packages/api/src/__tests__/auth-routes.test.ts`
- `packages/api/src/__tests__/reset-password.test.ts`
- `packages/auth-client/src/__tests__/hooks.test.tsx`
- `packages/auth/src/__tests__/session.test.ts`
- `packages/integrations/github/src/__tests__/client.test.ts`
- `packages/reading-advantage-scripts/generateArticle.test.js`

The changes modified no exported TypeScript signatures, schemas, or import boundaries. The scripts package gained optional compatibility parameters and a test command.

## Verification

- API focused tests passed: 32 tests.
- Auth-client focused tests passed: 16 tests.
- Auth session tests passed: 18 tests.
- GitHub focused tests passed: 3 tests.
- Script tests passed: 3 tests.
- Type checks passed for API, auth, auth-client, and GitHub packages.
- Focused lint checks passed with zero errors.
- `git diff --check` passed for all assigned paths.

The full auth suite had four unrelated closeout failures. Those checks require historical track records and Git notes.

The scripts package has no ESLint configuration. Direct ESLint execution stopped before file analysis.

The session tests verify the lock mode, user predicate, query order, cap repair, and transaction handle. A real PostgreSQL concurrency test was not run.

The stale graph supplied pre-edit symbol information. This task did not modify `graph.db`.
