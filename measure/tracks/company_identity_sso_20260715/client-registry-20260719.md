# Production OIDC Client Registry — 2026-07-19

All clients use the Accounts issuer `https://accounts.reading-advantage.com`,
Authorization Code + PKCE, exact redirect matching, and the minimum scope
`openid`. The environment and secret bindings are intentionally derivable from
each app's `cloudbuild.yaml` `--set-env-vars` and `--set-secrets` arguments.

| App | client_id | redirect_uri | expected_audience | scope | auth mode | Secret binding |
|---|---|---|---|---|---|---|
| Marketing | `marketing-web` | `https://marketing.reading-advantage.com/api/auth/callback` | `marketing` | `openid` | `COMPANY_AUTH_MODE` not set; company adapter default | `COMPANY_AUTH_OIDC_CLIENT_SECRET=MARKETING_COMPANY_AUTH_OIDC_CLIENT_SECRET:latest` |
| Sales | `sales-web` | `https://sales.reading-advantage.com/api/auth/callback` | `sales` | `openid` | `SALES_AUTH_MODE=company` | `COMPANY_AUTH_OIDC_CLIENT_SECRET=SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET:latest` |
| Codecamp | `codecamp-web` | `https://codecamp.reading-advantage.com/api/auth/callback` | `codecamp` | `openid` | `CODECAMP_AUTH_MODE=company` | `COMPANY_AUTH_OIDC_CLIENT_SECRET=projects/1090865515742/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET:latest` |

Accounts is the issuer and does not consume an application OIDC client. Its
bootstrap Cloud Build step reads the three client-secret references so client
registrations can be seeded without exposing secret values.

## Derivation references

- Marketing: `apps/marketing/cloudbuild.yaml`, `deploy-candidate`, lines 80–81.
- Sales: `apps/sales-advantage/cloudbuild.yaml`, `deploy-company-candidate`,
  lines 124–141.
- Codecamp: `apps/codecamp-advantage/cloudbuild.yaml`, `deploy-cloudrun`, lines
  41–59; deployment is currently blocked before this binding can resolve.

Every production callback is exact; no wildcard, alternate host, or implicit
audience is registered. Client secrets are never rendered in this registry.
