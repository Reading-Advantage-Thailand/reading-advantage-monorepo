# Phase 5 Browser Authentication Investigation

Status: blocked on an external test-session provision; no fixture code or auth
configuration was changed.

## Existing paths inspected

- `apps/codecamp-advantage/e2e/interactive-media-acceptance.spec.ts` accepts
  only `PHASE5_MEDIA_TEST_USERNAME`/`PHASE5_MEDIA_TEST_PASSWORD` or
  `CODECAMP_E2E_USERNAME`/`CODECAMP_E2E_PASSWORD`. It has no storage-state,
  session-cookie, or test-API helper.
- `packages/db/src/seed/codecamp-users-seed.ts` is a local-only, explicitly
  guarded legacy-account seed. It creates credential accounts but does not
  issue a browser session or expose a fixture API. Using it would still require
  explicit legacy auth mode and credential material.
- `CODECAMP_AUTH_MODE` defaults to `company`. In company mode,
  `/api/auth/login` is intentionally unavailable and directs callers to the
  Accounts OIDC handoff. The callback requires an Accounts authorization code,
  sealed transaction cookie, configured confidential client, and live token
  introspection; no local IdP or recorded storage state exists in the repo.
- `apps/codecamp-advantage/e2e/apk-unit-production.spec.ts` contains its own
  fallback credential behavior, but it is not a reusable safe auth helper and
  was not copied into the media fixture. No hardcoded credentials or auth
  bypass was introduced.

## Verification evidence

- Playwright `--list`: exit 0; one Chromium media test discovered.
- Authenticated media attempt: exit 0 with one skip because the supported
  credential variables were unavailable.
- Elevated headless system-Chrome check without credentials:
  `/api/auth/mode` returned HTTP 200 with `mode: company`; the public
  `/en/module/cloud-docker` route returned HTTP 200 and stayed at that path.
- The bundled Playwright Chromium executable is absent. The unprivileged
  system-Chrome launch was terminated by the sandbox; the elevated,
  non-credentialed check above succeeded.

## Exact blocker and required external gate

There is no existing supported API or local seed helper that can mint the
company-mode `__Host-ra_codecamp_session` for this browser fixture. The legacy
DB seed is not sufficient because it creates accounts, not sessions, and the
deployed/default auth mode is company OIDC. Completion requires an approved
Accounts test identity/session or an owner-approved test-only session fixture
for a local/staging environment. Until that exists, the media fixture must
remain credential-gated and no auth bypass, hardcoded credential, or production
remapping is justified.
