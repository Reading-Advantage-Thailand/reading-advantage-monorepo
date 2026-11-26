# Phase 0 Accounts route/security inventory

Track: `small_company_admin_privileges_20260722`  
Inventory date: 2026-08-10  
Scope: the bounded `apps/accounts/app/api/**/route.ts` surface and the directly
used Accounts identity/HTTP helpers plus the company-identity backend boundary.

## Denominator and evidence boundary

The bounded route listing contains **15 route files and 16 exported HTTP
methods**. The inventory below includes every result from:

```text
rg --files apps/accounts/app/api -g 'route.ts' | sort
```

This is source inventory evidence, not acceptance of the Accounts/backend
safety gate. The four aggregate gate commands and independent acceptance remain
open.

Shared evidence used below:

- `apps/accounts/lib/server/http.ts:9-40` maps the host-only Accounts cookie to
  transport-neutral session/anonymous evidence; `:68-96` maps boundary errors.
- `apps/accounts/lib/server/identity.ts:105-164` registers the reviewed
  capabilities. The executor authenticates through `currentEmployee`, sets
  `schoolId: null`, requires `COMPANY_ADMIN` for the
  `company-identity.company-admin` policy, and appends audit events to the
  identity repository.
- `packages/backend/src/modules/company-identity/capabilities.ts:24-116`
  defines the capability IDs, global tenancy, policy owner, required immutable
  audit, and required idempotency for management commands; `:118-180` defines
  all seven reviewed descriptors (one list query and six management commands).
- `packages/backend/src/modules/company-identity/contracts.ts:129-185` is the
  Zod contract source for the employee-management inputs. The capability
  executor validates descriptor inputs before invoking handlers
  (`packages/backend/src/kernel/runtime.ts:752-806`). Its authenticated actor
  is the principal user ID and its audit path validates the append result
  (`packages/backend/src/kernel/runtime.ts:930-1004`).
- `packages/backend/src/modules/company-identity/postgres-idempotency.ts:80-148`
  stores key/request digests and an owner-token digest; this is evidence for
  hash-bound command ownership, not a claim that the aggregate gate passed.
- `packages/db/src/company-identity/doctor.ts:10-12,69-72` defines the
  immutable-audit trigger sentinel, and
  `packages/db/src/company-identity/__tests__/privileges-audit.integration.test.ts:317-365`
  tests rejection of audit UPDATE, DELETE, and TRUNCATE.

## Method inventory

`Admin auth` in the table means a host-only Accounts session is converted to
`identityAuthenticationEvidence`; the capability executor requires a live
authenticated principal and the `COMPANY_ADMIN` policy. State-changing admin
routes additionally call `requireSameOrigin` (`apps/accounts/lib/server/http.ts:9-14`).
The repository repeats the company-admin check before management work.

| Method and route | Exact route source | Authn mechanism; authorization owner | External Zod validation; schema location | Company-global/school scope | Immutable audit behavior/evidence | Destructive effect; owning backend/service operation | Disposition |
|---|---|---|---|---|---|---|---|
| `GET /api/admin/employees` | `apps/accounts/app/api/admin/employees/route.ts:8-16` | Admin auth; `company-identity.company-admin` capability policy plus repository `assertCompanyAdmin`. | Yes at capability boundary: strict empty input and `employeeSchema` output (`packages/backend/src/modules/company-identity/capabilities.ts:109,118-145`). No request body. | Global company identity; no school tenant (`identity.ts:121`). | Required immutable capability audit for list success/denial/failure; append path and DB trigger are present. No HTTP route field in the capability projection (F1). | Read-only employee listing; capability `company-identity.employees.list` → `service.listEmployees`. | **finding (F1 evidence gap; no source-supported auth defect)** |
| `POST /api/admin/employees` | `apps/accounts/app/api/admin/employees/route.ts:20-31` | Admin auth; capability policy and repository check. Same-origin enforced. | Yes at executor: `createInputSchema` omits trusted actor and is based on `createEmployeeInputSchema` (`capabilities.ts:110,147-151`; contract `contracts.ts:129-138`). | Global company identity; no school tenant. | Required immutable capability audit plus transactional repository audit for `identity:employee-create` (`postgres-repository.ts:589-657`); trigger evidence exists. Route/dimension binding is not in the capability projection (F1). | Creates account, credential, membership, company roles, and application roles; idempotent capability `company-identity.employees.create` → `service.createEmployee`. | **finding (F1 evidence gap; mutation otherwise covered)** |
| `PUT /api/admin/employees/[accountId]/company-roles` | `apps/accounts/app/api/admin/employees/[accountId]/company-roles/route.ts:8-22` | Admin auth; capability policy and repository check. Same-origin enforced. | Yes at executor: `companyRolesInputSchema` without actor (`capabilities.ts:113,165-169`; contract `contracts.ts:157-163`). | Global company identity; no school tenant. | Required immutable capability audit plus repository audit for `identity:company-roles` (`postgres-repository.ts:758-830`); last-admin denial is audited by the capability path. Route/dimension binding is not in the capability projection (F1). | Replaces additive company roles and can remove `COMPANY_ADMIN`; last-admin invariant enforced; capability `company-identity.employees.set-company-roles` → `service.setCompanyRoles`. | **finding (F1 evidence gap; mutation otherwise covered)** |
| `PUT /api/admin/employees/[accountId]/roles` | `apps/accounts/app/api/admin/employees/[accountId]/roles/route.ts:8-22` | Admin auth; capability policy and repository check. Same-origin enforced. | Yes at executor: `setApplicationRolesInputSchema` without actor (`capabilities.ts:112,159-163`; contract `contracts.ts:148-155`). | Global company identity with explicit `applicationKey`; no school tenant. | Required immutable capability audit plus repository audit including `applicationId` for `identity:application-roles` (`postgres-repository.ts:715-757`); capability projection still lacks route/method binding (F1). | Replaces one application's explicit roles; capability `company-identity.employees.set-application-roles` → `service.setApplicationRoles`. | **finding (F1 evidence gap; mutation otherwise covered)** |
| `PUT /api/admin/employees/[accountId]/credential` | `apps/accounts/app/api/admin/employees/[accountId]/credential/route.ts:8-21` | Admin auth; capability policy and repository check. Same-origin enforced. | Yes at executor: `resetCredentialInputSchema` without actor (`capabilities.ts:114,171-175`; contract `contracts.ts:165-170`). | Global company identity; no school tenant. | Required immutable capability audit plus repository audit for credential reset (`postgres-repository.ts:832-858`); trigger evidence exists. Route/dimension binding is not in the capability projection (F1). | Replaces Argon2id credential, increments auth version, and revokes all sessions; destructive capability `company-identity.employees.reset-credential` → `service.resetCredential`. | **finding (F1 evidence gap; destructive path otherwise covered)** |
| `PATCH /api/admin/employees/[accountId]/status` | `apps/accounts/app/api/admin/employees/[accountId]/status/route.ts:8-22` | Admin auth; capability policy and repository check. Same-origin enforced. | Yes at executor: `setEmployeeStatusInputSchema` without actor (`capabilities.ts:111,153-157`; contract `contracts.ts:140-146`). | Global company identity; no school tenant. | Required immutable capability audit plus repository audit for status change; source includes previous/new status and session count (`postgres-repository.ts:663-714`). Route/dimension binding is not in the capability projection (F1). | Suspends/restores an employee; suspension increments auth version, revokes sessions, and enforces last-admin invariant; destructive capability `company-identity.employees.set-status` → `service.setEmployeeStatus`. | **finding (F1 evidence gap; destructive path otherwise covered)** |
| `DELETE /api/admin/employees/[accountId]/sessions` | `apps/accounts/app/api/admin/employees/[accountId]/sessions/route.ts:8-21` | Admin auth; capability policy and repository check. Same-origin enforced. | Yes at executor: `revokeEmployeeSessionsInputSchema` without actor (`capabilities.ts:114,177-181`; contract `contracts.ts:172-177`). | Global company identity; no school tenant. | Required immutable capability audit plus repository audit with revoked-session count (`postgres-repository.ts:860-878`). Route/dimension binding is not in the capability projection (F1). | Revokes every SSO/application session for one employee; destructive capability `company-identity.employees.revoke-sessions` → `service.revokeEmployeeSessions`. | **finding (F1 evidence gap; destructive path otherwise covered)** |
| `GET /api/health` | `apps/accounts/app/api/health/route.ts:7-12` | Public liveness endpoint; no authorization owner. | N/A: no external input. | Service-level response; no company or school tenant. | N/A for liveness. | No state change; direct `NextResponse`. | **not applicable** |
| `GET /api/ready` | `apps/accounts/app/api/ready/route.ts:9-27` | Public readiness endpoint; no authorization owner. | N/A: no external input. | Service-level database probe; no school tenant. | N/A for readiness. | Read-only `identity.probeDatabase`; no mutation. | **not applicable** |
| `GET /api/oidc/authorize` | `apps/accounts/app/api/oidc/authorize/route.ts:8-36` | Host-only SSO cookie; `service.authorize` rechecks live SSO session, registered client/redirect, state, nonce, and PKCE. No company-admin policy. | Yes in service: `oidcAuthorizationInputSchema` (`packages/backend/src/modules/company-identity/contracts.ts:52-68`; service `service.ts:227-261`). Route maps URL parameters into the service input. | Global company identity; client/application dimension is checked by client registration; no school tenant. | No `appendAudit` call in `service.authorize`; immutable audit evidence for authorization-code issuance is absent (F2). | Creates a one-time authorization code; protocol operation `service.authorize`. | **finding (F2 missing audit evidence; not a source-supported High authorization defect)** |
| `POST /api/oidc/introspect` | `apps/accounts/app/api/oidc/introspect/route.ts:7-36` | HTTP Basic confidential-client credentials; `service.introspect` validates client secret and application audience. No company-admin policy. | Yes in service: `introspectionInputSchema` (`contracts.ts:101-119`; service `service.ts:340-385`). | Global company identity; application audience checked; no school tenant. | No append is expected for this read-only inspection; no mutation audit required by the route. | Read-only revocation-aware session inspection; protocol operation `service.introspect`. | **covered** |
| `GET /api/oidc/jwks` | `apps/accounts/app/api/oidc/jwks/route.ts:6-8` | Public discovery key endpoint; no authorization owner. | N/A: no external input. | Issuer-wide public key material; no school tenant. | N/A: public discovery response. | No state change; returns `identity.jwk`. | **not applicable** |
| `POST /api/oidc/logout` | `apps/accounts/app/api/oidc/logout/route.ts:6-22` | Bearer access token; route validates the exact token grammar, then `service.localLogout` hashes/revokes that token. No company-admin policy. | Yes, route-local `authorizationHeaderSchema`: exact `Bearer [A-Za-z0-9_-]{43}` (`route.ts:6-16`). Bound to commit `5c5c559a2`; focused `apps/accounts/app/api/oidc/logout/route.test.ts` covers 8 invalid and 2 valid cases (10/10). | Global identity with one application session; no school tenant. | No appendAudit call in `localLogout`/`revokeApplicationSession`; immutable audit evidence for local logout is absent (F2). | Revokes only the calling application's session; protocol operation `service.localLogout`. | **finding (F2 missing audit evidence; token boundary covered by 5c5c559a2)** |
| `POST /api/oidc/token` | `apps/accounts/app/api/oidc/token/route.ts:8-58` | HTTP Basic or form client credentials; `service.exchangeCode` validates client, one-time code, redirect URI, PKCE, live SSO session, and audience. No company-admin policy. | Yes in service: `oidcTokenInputSchema` (`contracts.ts:72-84`; service `service.ts:263-339`). | Global company identity; application audience and redirect registration checked; no school tenant. | No appendAudit call in `exchangeCode`; immutable audit evidence for code consumption/session issuance is absent (F2). | Consumes one-time code and creates an application session/token; protocol operation `service.exchangeCode`. | **finding (F2 missing audit evidence; validation/authn otherwise covered)** |
| `POST /api/session/login` | `apps/accounts/app/api/session/login/route.ts:12-34` | Public credential endpoint with same-origin check; service validates credentials, live status, and persistent rate limit before issuing host-only cookie. | Yes in service: `authenticateEmployeeInputSchema` (`contracts.ts:34-44`; service `service.ts:188-225`). | Global company identity; no school tenant. | Service appends secret-safe `identity:login` success/denied events to the immutable audit table (`service.ts:188-225`; repository `postgres-repository.ts:135-151`); trigger evidence exists. | Creates one SSO session and cookie; protocol operation `service.authenticate`; not destructive. | **covered** |
| `POST /api/session/logout` | `apps/accounts/app/api/session/logout/route.ts:8-28` | Host-only SSO cookie with same-origin check; no role requirement; `service.globalLogout` revokes the SSO session and derived application sessions. | N/A: no request body; cookie is read by the route. | Global company identity and all derived application sessions; no school tenant. | No appendAudit call in `globalLogout`/`revokeSsoSession`; immutable audit evidence for global logout is absent (F2). | Revokes the central SSO session and every derived application session; protocol operation `service.globalLogout`. | **finding (F2 missing audit evidence; revocation behavior otherwise covered)** |

## Findings and next bounded remediation

1. **F1 — route/dimension evidence binding is not demonstrated and is absent
   from the capability audit projection.** The reviewed projection contains only
   `resourceType` (`capabilities.ts:37-42`), while the Accounts audit adapter
   adds only `source: "accounts-capability-kernel"` (`identity.ts:138-150`).
   Domain audits add some target/application fields, but this does not bind each
   HTTP route/method and relevant application dimension. This is a
   source-supported safety-gate finding, not evidence that the authorization
   decision itself is bypassable.

2. **F2 — protocol state-change audit evidence is missing.** The source has no
   immutable `appendAudit` call for `authorize`, `exchangeCode`, `localLogout`,
   or `globalLogout`; login and management operations do append. This is an
   evidence/completeness finding. Do not promote it to High from this source-only
   inventory without the track owner confirming that these protocol events are
   required to carry immutable audit records.

3. The exact next bounded remediation is to update only the Accounts/company-
   identity audit projection and protocol service/repository paths, add focused
   route/service/audit tests for F1/F2 (including actor, route/method, client or
   application dimension, target, and secret-safe outcomes), then rerun only the
   four safety-gate commands named in `plan.md` and obtain the independent
   review. The fixed OIDC logout boundary at commit `5c5c559a2` is already
   evidence-backed, but it does not accept the aggregate gate.
