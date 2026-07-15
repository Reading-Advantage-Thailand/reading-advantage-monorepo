# Specification: Backend Capability Kernel

## Overview

Implement the portable capability descriptor and executor defined by the
[canonical backend platform specification](../../backend-platform-spec.md),
plus deterministic catalog and transport-binding generation. Prove the model
with one bounded operation in a small/new application; do not begin Reading or
Primary migration here.

## Dependencies

- Hard dependency: accepted
  `backend_architecture_enforcement_20260713` Gate 1 baseline and CI check.
- Reuse existing `@reading-advantage/auth`, `TenantDB`, typed errors, audit
  infrastructure, and provider adapters instead of replacing them.
- The durable-job track may proceed in parallel after enforcement. Its
  capability-bound handler integration depends on this track's accepted
  descriptor/executor API.

## Functional Requirements

### FR-1: Capability descriptor contract

Provide documented, generic `query`, `command`, and `job` descriptors with
stable ID, Zod input/output, auth, authorization-policy reference, tenancy,
transaction, error, audit, idempotency, observability, and handler declarations.
Reject unsafe or contradictory combinations at registration.

### FR-2: Executor and context

Implement the ordered executor pipeline: input validation, context/logging,
auth, trusted tenant resolution, authorization, idempotency acquisition,
transaction, handler, output validation, audit, settlement, and typed error
normalization. The context exposes scoped internal adapters, not provider SDKs
or transport objects. Direct handler invocation from bindings is impossible by
public API design.

### FR-3: Policy behavior

Auth/tenancy/authorization fail closed. Commands honor explicit transaction
policy. Security-sensitive operations produce immutable safe audit records.
Retryable commands use durable tenant-and-capability-scoped idempotency with
atomic ownership and deterministic replay/conflict behavior.

### FR-4: Error and output contracts

Validate all outputs. Normalize declared domain/adapter errors into stable
platform errors and unexpected failures into a safe internal error. Never leak
provider payloads, stack traces, SQL, credentials, or audit-sensitive input.

### FR-5: Deterministic catalog

Discover only explicitly registered descriptors and generate stable JSON and
Markdown under `measure/generated/`. Fail on duplicate IDs, invalid schemas,
unsupported combinations, or ownership violations. CI fails on stale output.

### FR-6: Route binding generation

Generate a route manifest and thin binding adapters that invoke the executor by
capability ID. Reject duplicate method/path, auth exposure mismatch, kind/
transport mismatch, and synchronous job bindings. Preserve explicit legacy
route visibility during incremental migration.

### FR-7: Bounded pilot

Select one low-risk operation in a small/new app using documented criteria.
Wrap/reuse its existing domain logic, preserve the transport contract, and add
auth/tenant/error compatibility tests. Ratchet any removed direct-boundary debt
down. Reading Advantage is the next program stage; Primary remains last.

## Non-functional Requirements

- Ordinary Node/OCI runtime; no Cloudflare Workers APIs.
- Transport-independent unit tests and mockable contexts.
- JSDoc on every exported function/type/interface/class.
- Deterministic generation with no timestamps or machine paths.
- No network call held in a DB transaction without documented protocol.
- New kernel code meets repository coverage target.

## Acceptance Criteria

1. Registration rejects duplicate IDs and every invalid policy combination in
   the counterexample matrix.
2. Executor ordering is observable in tests and every fail-closed stage prevents
   handler execution.
3. Tenant identity cannot be selected by input; referential/global access is
   explicit and tested.
4. Transaction rollback, output rejection, safe errors, immutable audit, and
   idempotent replay are proven by focused tests.
5. Catalog and route manifests are deterministic and stale-output CI fails.
6. Binding counterexamples reject duplicate/unsafe/job-as-request routes.
7. The pilot preserves its existing external contract and reduces or leaves
   unchanged both architecture baselines.
8. No app/backend/domain source imports a provider SDK because of this track.

## Out of Scope

- Broad Reading Advantage or any Primary Advantage migration.
- Rewriting existing domain modules that can be wrapped safely.
- Durable queue storage/polling (owned by the worker track).
- Realtime subscriptions, a hosted control plane, or Cloudflare Workers.
- Automatically exposing every capability over HTTP.
