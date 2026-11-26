# Accounting Web Client Secret Rotation

- Timestamp: `2026-09-01T12:27:15Z`
- Actor lane: `deploy-orchestrator`
- Client ID: `accounting-web`
- Application: `accounting`
- Secret Manager target: `ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET`, version 1
- Hash algorithm: Argon2id
- Memory cost: 19,456 KiB
- Time cost: 2
- Parallelism: 1

The production identity database lacked the expected Accounting application and client rows.
The existing deterministic company identity bootstrap created the Accounting application and its three role definitions.
The rotation then registered the confidential client with the approved callback URI and the generated secret hash.
The database transaction also created an immutable `identity:rotate-oidc-client-secret` audit event.

The raw secret and the full hash do not appear in this note or the repository.
The raw secret exists only in Secret Manager.
The local verifier matched the stored hash through the Accounts `verifyPassword` path.
The production introspection endpoint accepted the new client credentials and returned HTTP 200 with `active=false` for an invalid access token.
