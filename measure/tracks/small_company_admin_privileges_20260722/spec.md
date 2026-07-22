# Small-Company Admin Privilege Simplification

## Overview

Let the company owner administer every internal application through one
intentional `COMPANY_ADMIN` assignment without maintaining duplicate per-app
roles. Preserve explicit application roles for ordinary employees and retain
all existing authentication, audit, session-revocation, and last-admin safety.

This specification supersedes only the earlier policy that `COMPANY_ADMIN`
receives no application access. It does not merge product data into Accounts or
weaken product authorization for ordinary employees.

## Stories

### Story S1: Grant owner application access
**As a** company owner
**I want** `COMPANY_ADMIN` to grant administrator access to every registered internal application
**So that** I can operate the company without repetitive role assignments

**Acceptance Criteria:**
- Given a `COMPANY_ADMIN`, When Accounts issues an audience-specific token for Marketing, Sales, Codecamp, or Company Operations, Then the effective roles include that application's reviewed administrator role (`ADMIN`, `SALES_ADMIN`, `ADMIN`, or `OPERATIONS_ADMIN`).
- Given an ordinary employee, When Accounts issues a token, Then only explicitly assigned roles are included.
- Given a newly registered internal application, When it has no reviewed owner-role mapping, Then owner access fails closed instead of guessing a role.
- Given owner access is derived, When stored role assignments are inspected, Then no duplicate per-app assignment is required to preserve access.

**Estimate:** M
**Priority:** Must

### Story S2: Simplify owner administration
**As a** company owner
**I want** Accounts to show inherited owner access clearly
**So that** the role UI reflects the small-company operating model

**Acceptance Criteria:**
- Given a `COMPANY_ADMIN`, When the employee is viewed in Accounts, Then internal administrator access is shown as inherited and is not managed through redundant checkboxes.
- Given an ordinary employee, When their application access is edited, Then existing explicit role controls remain available.
- Given the last active `COMPANY_ADMIN`, When an action would remove or suspend that role, Then existing last-admin protection remains enforced.
- Given any owner or employee role change, When it succeeds or is denied, Then immutable secret-safe audit evidence is recorded.

**Estimate:** S
**Priority:** Must

### Story S3: Verify and release access
**As a** platform operator
**I want** the simplified role policy proven in production with rollback
**So that** broad owner access is intentional rather than accidental privilege escalation

**Acceptance Criteria:**
- Given the production owner, When opening Accounts, Marketing, Sales, and Codecamp, Then each authorized administrator surface is reachable through SSO.
- Given an ordinary employee without an app role, When opening that app, Then access remains denied.
- Given suspension, global logout, or session revocation, When the next protected check runs, Then derived owner access is also revoked.
- Given a release failure, When rollback executes, Then the prior SSO revision and role behavior are restored without credential changes.

**Estimate:** M
**Priority:** Must

## Non-Functional Requirements

- Do not add another global role, numeric hierarchy, wildcard role mapping, or
  policy-builder UI.
- Owner-role mappings are exact configuration validated at startup and covered
  by positive and counterexample tests.
- This track owns registration of the Company Operations application namespace
  and its exact `COMPANY_ADMIN` to `OPERATIONS_ADMIN` mapping. The CRM track owns
  Company Operations permissions and capability authorization.
- Existing OIDC, session, audit, and database boundaries remain unchanged.
- Complete the open observation and legacy-auth retirement gates from
  `company_identity_sso_20260715` in coordination with this release.

## Track-Level Acceptance Criteria

- One `COMPANY_ADMIN` assignment provides reviewed admin access to every current
  internal application.
- Ordinary employees receive no new implicit access.
- Accounts clearly distinguishes inherited owner access from explicit employee
  assignments.
- Production browser and API evidence covers allow, deny, revocation, and
  rollback paths.

## Out of Scope

- Customer, licensing, CRM, public-app user, billing, or commission behavior.
- Delegated administrators, approval chains, temporary elevation, SCIM, or MFA.
- Automatically granting all possible role strings instead of one reviewed
  administrator role per application.
