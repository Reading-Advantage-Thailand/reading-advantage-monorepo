# Phase S1 code review findings — 'Phase S1: Company SSO sign-in'

Review range: `12214a654..HEAD` (change-quality-reviewer subagent, 2026-08-20).
No Critical findings. One High (H1) and one Medium (M1) were found and fixed
before checkpoint; the re-review confirmed both fixes. Low findings L1–L6 were
also fixed in the same remediation pass. L7 is documented and deferred below.

## Fixed in remediation commit

- **H1 (High)** — Flaky test gate: `app/lib/auth.test.ts` dynamic-imported the
  production module in every test body, so the first test paid the full
  `@reading-advantage/auth` module-graph import inside its 5s timeout and
  flaked under full-suite load. Fixed with static top-level imports.
- **M1 (Medium)** — Logout route: an IdP end-session failure 500'd the route
  and left the session cookie set. Fixed: try/catch, cookie always deleted,
  structured `accounting_logout_error` log (error name only), controlled 500.
  Failure-branch test added.
- **L1** — Callback route bare `catch` now logs a structured
  `accounting_oidc_callback_failed` event (error name only).
- **L2** — Session route introspection failure now returns a controlled
  `503 { session: null }` instead of throwing (test added).
- **L3** — `@node-rs/argon2` (catalog) declared in `apps/accounting/package.json`
  per the Turbopack `serverExternalPackages` lesson.
- **L4** — Missing JSDoc on the home page component added.
- **L5** — `requireAccountingSession` JSDoc no longer claims `@throws`; the
  catch now logs the error name.
- **L6** — `tsconfig.json` no longer excludes `**/__tests__/**`, so the IdP
  test double is covered by `check-types`.

## Deferred

- **L7 (Low)** — `proxy.ts` builds the `/login` redirect from raw
  `x-forwarded-proto`/`x-forwarded-host` headers (inherited convention from
  `apps/sales-advantage/proxy.ts`). Exploitability depends on edge header
  sanitization, which does not exist yet for this app. Re-verify and harden
  (trusted-proxy gating or pinned public origin) when the accounting app's
  edge/Cloud Run configuration is built in the deployment track.
