# Codecamp Chat Authentication Repair

Date: 2026-09-07

## Implemented repair

- `/api/chat` now uses the configured Codecamp authentication mode.
- Company mode reads only the Codecamp company session cookie.
- Company mode introspects the session before principal resolution.
- Revoked or invalid company sessions return `401`.
- Company mode ignores the legacy `session_token` cookie.
- Explicit legacy mode still uses `getAuthToken()` and `requireAuth()`.
- The resolved user supplies the tenant and rate-limit identity.
- The existing streaming response remains unchanged.

## Verification

The focused chat suite passed four tests.
The suite covers company success, revoked company denial, legacy rejection, and explicit legacy success.
The company success test also verifies the existing raw streaming protocol.

The first test run reached an unrelated missing Sales evidence file through broad package mocks.
The narrowed mocks now load only the route's imported package members.

## Remaining verification

- Run the final Codecamp type check with the other review repairs.
- Run the full Codecamp test suite after concurrent work stops.
- Refresh `graph.db` after concurrent source changes stop.
