# UX Browser Audit — Codecamp SSO Redirect Repair (2026-08-29)

- **Role:** measure-ux-browser-review (live audit completed 2026-08-29; this file
  materialized by measure-jr-green from the role's evidence because the review
  role could not write to the repository).
- **Date:** 2026-08-29 (07:23–07:24 UTC)
- **Baseline HEAD:** `6feed85e989bf19cf494cb2b32fb0cb64025f65f`
- **Target:** `https://codecamp.reading-advantage.com` (production, deployed
  revision) and `https://accounts.reading-advantage.com` (issuer)
- **Method:** HTTP redirect-chain capture per case (curl-style, headers plus
  body). Raw evidence: `/tmp/opencode/sso-audit-20260829/` (17 files).
- **Verdict: FAIL** — the deployed revision still runs the pre-repair proxy.
  The repaired code exists on HEAD but has never been deployed.

## Findings

### F1 (Critical) — Live proxy still emits the dead `redirectTo` parameter

Case `01-codecamp-en-admin-noauth`: unauthenticated `GET /en/admin` chains:

```
GET /en/admin
→ 307 location: https://codecamp.reading-advantage.com/?redirectTo=%2Fen%2Fadmin
→ 307 location: https://codecamp.reading-advantage.com/th?redirectTo=%2Fen%2Fadmin
   set-cookie: NEXT_LOCALE=th; Path=/; SameSite=lax
→ 200 (Thai landing page, lang="th")
```

The live proxy redirects to `/?redirectTo=...`, not to
`/api/auth/company/start?returnTo=...`. The `redirectTo` parameter is read by
nothing. The user lands on the Thai dashboard, not on the requested admin page.
This matches the spec reproduction steps exactly.

### F2 (Critical) — English locale choice is reset to Thai

Case `01-codecamp-root-noauth-en-cookie`: `GET /` with `Cookie: NEXT_LOCALE=en`:

```
→ 307 location: https://codecamp.reading-advantage.com/th
   set-cookie: NEXT_LOCALE=th; Path=/; SameSite=lax
→ 200 (lang="th", set-cookie: NEXT_LOCALE=th again)
```

The deployed proxy overwrites the cookie on every unprefixed request and
redirects to `/th` regardless of the existing `en` cookie. The repaired
behavior (read the cookie, redirect to `/en/`, write nothing) is not live.
Related observation, case `01-codecamp-root-noauth-th-cookie`: even a valid
`NEXT_LOCALE=th` cookie gets rewritten (`set-cookie: NEXT_LOCALE=th` on the
307), confirming the deployed proxy writes unconditionally.

### F3 (High) — Malformed `returnTo` returns HTTP 500

Cases `01-codecamp-start-malformed-evil-host` and
`01-codecamp-start-malformed-protocol-rel`:

```
GET /api/auth/company/start?returnTo=https%3A%2F%2Fevil.example.com → HTTP/2 500, content-length: 0
GET /api/auth/company/start?returnTo=%2F%2Fevil.example.com        → HTTP/2 500, content-length: 0
```

The deployed start route lets the unsafe-`returnTo` validation error escape as
a 500 instead of falling back to `/` with a logged warning (FR-5).

### F4 (High) — Sign-in error parameters render no visible message

Cases `01-codecamp-error-sso-landing`, `01-codecamp-error-forbidden-landing`,
`01-codecamp-error-session-check-failed-landing`: each chains
`/?error=<code>` → `307 /th?error=<code>` → `200`. The final Thai landing page
carries the query parameter in its RSC payload but renders no visible error
message (FR-6 not live).

## Passing checks

- **Valid start** (`01-codecamp-start-valid`): `GET
  /api/auth/company/start?returnTo=%2Fen%2Fadmin` → `307` to
  `https://accounts.reading-advantage.com/api/oidc/authorize?client_id=codecamp-web&...`
  with `set-cookie: __Host-ra_codecamp_oidc_tx=...; Path=/; Max-Age=600;
  Secure; HttpOnly; SameSite=lax`. The transaction cookie carries
  `returnTo":"/en/admin"` inside its signed payload. The Accounts authorize
  hop then renders the sign-in card with the full OIDC `returnTo` preserved.
- **Accounts issuer health** (`00-accounts-ready`): `GET /api/ready` → `200`
  `{"status":"ready","service":"accounts","database":"company_identity"}`.
- **Accounts authorize without session** (`00-accounts-authorize-no-session`):
  `307` to the Accounts sign-in flow, honoring `returnTo`.
- **Auth mode** (`01-codecamp-auth-mode`): `GET /api/auth/mode` → `200`
  `{"mode":"company"}`.
- **Session without cookie** (`01-codecamp-session-nocookie`): `GET
  /api/auth/session` → `200` `{"session":null}`.
- **Thai lesson page** (`01-codecamp-th-lesson-noauth`): `GET /th/lesson/12345`
  → `200` directly (public page, no redirect).
- **Cookieless root** (`01-codecamp-root-noauth-nocookie`): `GET /` → `307
  /th` with `set-cookie: NEXT_LOCALE=th` — correct default-locale behavior.

Observation: `GET https://codecamp.reading-advantage.com/api/ready` → `404`
("Page not found"). No `/api/ready` route exists in the codecamp app on HEAD
either, so this is consistent with the repository, not a regression; the
passing readiness check belongs to the Accounts issuer.

## Blocked (owner-manual)

These cases need a human and were not executed:

- Authenticated round-trips (sign-in from `/en/admin`, from
  `/th/lesson/<id>`, locale survival after sign-in) — no employee
  credentials available to the audit role.
- `sso-candidate` tagged-revision acceptance — the tagged revision does not
  exist yet because no deploy has run.
- Sales and Marketing live matrix — owned by a separate parity track.
- Administrator/forbidden role separation with real sessions.
- Legacy-mode (`CODECAMP_AUTH_MODE=legacy`) live behavior.

## Conclusion

The repaired redirect chain (returnTo entry, locale-preserving proxy,
forwarding-aware URLs, clean malformed-returnTo fallback, visible error
messages) is implemented and unit-tested on HEAD `6feed85e`, but the deployed
production revision predates it. Every live failure above is a deployment gap,
not a code gap. Next step: deploy the `sso-candidate` tagged revision
(no-traffic), re-run this audit against the tagged revision URL, then shift
traffic (Phase 4, owner-gated).
