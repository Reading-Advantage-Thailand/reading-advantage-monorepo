# Backend Platform Architecture Specification

**Status:** Canonical target architecture
**Program:** Backend Platform Program
**Date:** 2026-07-13

## 1. Purpose

This specification defines the portable backend-as-code model for the Reading
Advantage monorepo. It provides Convex-like ergonomics—declared capabilities,
one execution policy, generated discovery, and thin transport bindings—without
making a hosted backend product or transport framework the domain boundary.

The deployment unit is standard Node.js in an OCI image. PostgreSQL remains the
source of truth. Application code calls typed capabilities; capabilities call
internal adapters; only adapters call infrastructure providers.

```text
HTTP / tRPC / worker / CLI
          |
          v
generated binding -> capability executor -> capability handler
                          |                     |
                 policy and context       domain orchestration
                          |                     |
                          +------ adapters -----+
                                  |
                       PostgreSQL / AI / storage / integrations
```

This is an incremental target. Existing domain functions remain valid and are
wrapped or migrated in bounded slices; the program does not authorize a
monorepo-wide rewrite.

## 2. Runtime and Target Hosts

The supported runtime contract is:

- current repository-pinned Node.js LTS-compatible runtime;
- Linux OCI image with a normal Node process;
- PostgreSQL reachable through the shared database package;
- pooled `DATABASE_URL` for short request transactions;
- `DIRECT_DATABASE_URL` for migrations and session-scoped worker behavior;
- horizontally scalable stateless request services and independently scalable
  worker services;
- graceful shutdown, health/readiness probes, structured logs, and environment
  validation at process startup.

Conforming target hosts include Google Cloud Run, AWS ECS/Fargate, Fly.io,
Railway, Kubernetes, and ordinary Docker/OCI hosts. A platform may provide
managed PostgreSQL, secrets, logging, or autoscaling, but capability code must
not depend on those provider APIs. Portability validation must build one
provider-neutral image and verify its process, health/readiness, shutdown,
environment, and network contracts against both Cloud Run and ECS/Fargate
deployment shapes; provider deployment manifests remain infrastructure, not
application dependencies.

### 2.1 Non-goals

- **Cloudflare Workers are not a target runtime.** Their isolate runtime,
  execution lifetime, and networking model conflict with the canonical Node
  process, direct PostgreSQL worker connection, and durable worker loop. A
  Cloudflare edge proxy may call the HTTP service, but capability and worker
  code need not execute in Workers.
- Recreating Convex's database, hosted control plane, realtime protocol, or
  proprietary deployment workflow.
- Replacing PostgreSQL, Drizzle, Zod, the auth adapter, or existing provider
  adapters.
- Requiring tRPC, Next.js Route Handlers, Hono, or any single transport.
- Big-bang migration of legacy routes or Primary Advantage.
- Moving long-running jobs into request handlers.

## 3. Capability Model

### 3.1 Descriptor

Every new backend operation is declared as a capability descriptor. The
descriptor is static, importable TypeScript data plus a handler and contains:

- globally unique, stable `id` and human-readable summary;
- `kind`: `query`, `command`, or `job`;
- Zod `input` and `output` schemas;
- authentication requirement (`public`, `optional`, or `user`);
- authorization policy reference, not inline role-string comparisons;
- tenancy mode (`global`, `school`, or `referential`) and tenant resolver;
- transaction policy (`none`, `required`, or explicit isolation/retry policy);
- declared error codes and their safe transport mappings;
- audit policy and safe metadata projector;
- idempotency policy, key schema, scope, retention, and conflict behavior;
- timeout/cancellation and observability metadata where applicable;
- handler receiving only the executor context and validated input.

Descriptors must not contain transport request/response objects, provider SDK
clients, raw environment reads, or a globally imported unscoped database.
Exported descriptor and context types require JSDoc under repository policy.

### 3.2 Executor

All invocation paths use one executor. In order, it:

1. validates descriptor registration and parses external input with Zod;
2. establishes request/job correlation and structured logging context;
3. authenticates through the internal auth adapter;
4. resolves the trusted tenant from authenticated server state;
5. evaluates the named authorization policy;
6. establishes idempotency ownership when declared;
7. opens the declared transaction boundary;
8. invokes the handler with scoped dependencies;
9. validates handler output with the descriptor's Zod schema;
10. commits or rolls back, records required immutable audit evidence, and
    settles idempotency state;
11. returns a typed result or a declared platform error.

Authorization, tenant resolution, transaction setup, audit, and idempotency
must fail closed. A transport adapter cannot bypass executor stages by calling
`descriptor.handler` directly.

### 3.3 Contracts and errors

Zod schemas are the runtime source of truth for inputs, outputs, idempotency
keys, job payloads, and external provider responses. TypeScript types are
inferred from schemas. Unknown external fields are rejected or deliberately
stripped according to the owning contract; this must not be accidental.

Platform errors have a stable code, safe message, retry classification, and
optional structured details that never expose secrets or raw provider errors.
Bindings map platform errors consistently to HTTP/tRPC/job outcomes. Unexpected
errors are logged with correlation metadata and become a generic internal
error. Provider errors are normalized by their adapter before reaching domain
code.

### 3.4 Auth and tenancy

The executor uses `@reading-advantage/auth` interfaces. Capabilities do not
inspect cookies, JWTs, or session tables directly. Resource authorization lives
in permission modules.

For `school` capabilities, the executor creates `TenantDB` from the verified
user/tenant context. A frontend-supplied `schoolId` is never authority. Global
capabilities require an explicit global policy. Referential tables retain the
auditable `tenantDb.unscoped("reason")` escape hatch and must prove owner-FK
scope in tests. New tables remain subject to tenant-registry coverage.

### 3.5 Transactions, audit, and idempotency

- Commands declare transaction behavior; a multi-write invariant cannot rely
  on unrelated implicit transactions.
- External network calls are not held inside a database transaction unless a
  documented protocol requires it. Prefer an outbox/job boundary.
- Security-sensitive and destructive capabilities declare immutable audit
  events. Metadata is allowlisted and secret-safe.
- Retryable commands and jobs declare idempotency. Keys are namespaced by
  capability and tenant/global scope, acquired atomically, and persist the
  terminal result or deterministic conflict. In-memory deduplication is not a
  production idempotency mechanism.

## 4. Adapter Boundaries

Capability and domain packages depend on internal interfaces, never provider
SDKs. Provider-specific imports are allowed only in designated adapter roots.
The initial adapter families are:

| Concern | Internal boundary | Provider implementations |
|---|---|---|
| Database | `@reading-advantage/db`, `TenantDB` | PostgreSQL/Drizzle |
| Authentication | `@reading-advantage/auth` | first-party DB sessions |
| AI | `@reading-advantage/ai` | provider drivers behind `AIClient` |
| Storage | `@reading-advantage/storage` | S3-compatible drivers |
| Integrations | `packages/integrations/*` | GitHub and future providers |
| Jobs | backend job port | PostgreSQL durable-job adapter |
| Observability | structured logger/tracer interfaces | runtime exporters |

Provider adapters validate provider responses before returning them. Apps,
capabilities, and domain modules may not import provider SDKs, instantiate
provider clients, or read provider credentials directly.

## 5. Catalog and Route Bindings

### 5.1 Generated capability catalog

A deterministic generator discovers registered descriptors and writes a
machine-readable catalog plus a human-readable reference under
`measure/generated/`. Generated output includes capability ID, kind, owning
package/module, auth, tenancy, transaction, audit/idempotency declarations,
input/output schema fingerprints, and supported bindings. It excludes handler
source, secrets, and unstable timestamps.

Generation must fail on duplicate IDs, unsupported policy combinations,
unresolvable schemas, or descriptors outside approved ownership roots. CI runs
the generator and fails if `git diff --exit-code -- measure/generated` is not
clean. Generated files describe current code; this specification explains why.

### 5.2 Generated bindings

Route manifests are generated from explicit binding declarations. Thin
adapters may materialize Next.js, Hono, tRPC, worker, or CLI bindings, but every
binding must invoke the executor by capability ID. Bindings own only transport
parsing/serialization, headers/status, and protocol-specific streaming.

Generation must reject duplicate method/path pairs, incompatible capability
kinds, public exposure of non-public capabilities, and a job bound as a
synchronous request. Existing hand-written routes migrate incrementally and
remain visible in the catalog as legacy/unbound until converted.

## 6. Boundary Enforcement and Ratchets

Architecture enforcement uses AST-based analysis for TypeScript/JavaScript;
plain text grep is not the acceptance mechanism. The analyzer resolves imports,
re-exports, dynamic imports with static literals, aliases, and relevant call
expressions.

Two ratchets are mandatory:

1. **Database boundary:** apps and transport roots cannot import database
   clients/schema or execute Drizzle/SQL directly except explicit, reviewed
   baseline entries. Approved ownership roots are database, backend/domain,
   migrations, seeds, and bounded test fixtures. Durable job-table access is
   narrower: outside DB schema/migrations, only the exact PostgreSQL queue
   adapter root under `packages/backend/src/jobs/adapters/postgres/` may query
   job tables. `services/worker`, webhooks, and capability handlers use the job
   port; any current direct access is ratcheted baseline debt, not an approved
   root.
2. **Provider boundary:** apps and backend/domain code cannot import provider
   SDKs or instantiate provider clients except approved adapter roots and
   explicit baseline entries.

Baselines are machine-readable, path-and-rule-specific debt snapshots with an
owner and rationale. CI fails on a new violation, a broadened wildcard, a
changed violation hidden by rename, or an increased count. Removing a violation
ratchets the baseline down; regeneration may not silently accept growth.

Counterexample fixtures must prove detection of direct imports, aliased and
barrel re-exports, static dynamic imports, direct SQL/client construction, and
provider SDK construction. Negative fixtures prove allowed adapter and test
usage. The fixtures themselves are excluded only by exact fixture roots, never
by broad source globs.

## 7. Durable Jobs and Worker Service

PostgreSQL is the durable queue. Queue persistence and all job-table queries
live in the backend PostgreSQL job adapter, which implements a job port.
`services/worker` is a separate Node/OCI composition process: it registers job
handlers, drives bounded polling through that port, coordinates lease renewal,
executes through worker context, and shuts down gracefully. It never imports DB
schema/client APIs or queries job tables directly. Request services enqueue
through the same port and return; they do not run long work after sending a
response.

The generic job contract includes validated payload and result schemas,
queue/name, tenant scope, idempotency key, availability time, attempts/max
attempts, lease owner/expiry, last safe error, terminal state, and timestamps.
Claiming uses PostgreSQL `FOR UPDATE SKIP LOCKED`. Retries use bounded jittered
exponential backoff. Exhaustion enters a dead-letter state. Replay is authorized,
audited, idempotent, and cannot overwrite an active lease. Stale workers cannot
settle a job reclaimed by another worker.

### 7.1 Existing `review_jobs` is the reference behavior

This program is not greenfield. The existing Codecamp `review_jobs` flow proves
`pending|claimed|succeeded|failed|dead`, a normalized PR-key uniqueness
constraint, due-job claim with `FOR UPDATE SKIP LOCKED`, visibility-timeout
reclaim, bounded jittered retries, dead-letter state, admin-authorized replay,
and settle guarded only by job ID plus `status = 'claimed'`. That status-only
CAS prevents some terminal-state overwrites but does **not** distinguish an old
worker from a new worker after reclaim and re-claim. Current replay updates by
job ID regardless of prior state and can reset an actively claimed job. It is
REFERENTIAL/global by current Codecamp design and uses an auditable unscoped
reason.

The durable-job track must characterize and preserve the proven behavior first.
It then intentionally strengthens ownership with a unique lease token in every
heartbeat/settle/fail CAS and rejects replay while a valid active lease exists.
Compatibility tests must distinguish preserved behavior from these documented
safety changes. The track may adapt `review_jobs` behind the generic job port or
migrate it with an explicit compatibility/data plan; it must not replace proven
behavior with a less capable greenfield queue. Existing webhook acknowledgement
latency and idempotent redelivery tests remain acceptance evidence.

Locking and stale-owner acceptance tests use a deterministic isolated
PostgreSQL 16 harness with two independent connections. The harness creates a
dedicated ephemeral database/schema, applies the exact migrations under test,
and tears it down even on failure. It accepts only an explicit test URL and must
fail closed if absent; it never falls back to `DATABASE_URL`,
`DIRECT_DATABASE_URL`, production, or any default shared database.

Job handlers may initially use the job-handler registry. Binding those handlers
to capability descriptors is a later phase blocked on the capability kernel.
Thus durable queue/platform work may proceed after enforcement in parallel with
the kernel, while capability-bound handler integration may not.

## 8. Package and Service Ownership

| Location | Ownership |
|---|---|
| `packages/backend` | capability contracts, descriptor registry, executor, policy orchestration, domain modules, job port |
| `packages/db` | Drizzle schema/client/migrations/seeds and low-level DB utilities; no business workflows |
| `packages/auth` | auth adapter, identity/role/permission primitives, tenant resolution |
| `packages/domain` | existing transport-independent business logic during migration; callable by capability handlers |
| `packages/api` | tRPC/HTTP binding adapters and legacy router compatibility; no business logic |
| `packages/webhooks` | external Hono ingress and signature/protocol handling; enqueue/invoke only |
| `packages/ai`, `packages/storage`, `packages/integrations/*` | internal interfaces and provider adapters |
| `packages/types` | shared transport/domain Zod contracts where no single backend module owns them |
| `services/worker` | composition only: process bootstrap, lifecycle, handler registration, job-port polling, health; no domain business logic, DB imports, or job-table queries |
| `apps/*` | UI and app-local transport composition; no direct DB/provider access |

New capability-owned schemas should be colocated in `packages/backend/modules/*`.
Existing `packages/domain` code is migrated opportunistically rather than copied.

## 9. Staged Application Migration

1. **Foundation:** land AST enforcement and freeze ratcheting baselines. No
   capability or worker rollout may weaken the baseline.
2. **Small/new applications first:** select bounded, low-risk operations in
   newer/smaller apps and prove descriptor, executor, generated catalog,
   bindings, tenancy, and rollback. Selection is evidence-based and does not
   assert that an entire app is already migrated.
3. **Reading Advantage next:** inventory legacy routes, migrate vertical slices
   by domain, preserve response contracts, and ratchet direct DB/provider debt
   down after each slice.
4. **Primary Advantage last:** begin only after kernel and Reading patterns are
   stable and Primary's Prisma/Drizzle and known stabilization constraints are
   reconciled. No mechanical fork-wide port.

Each slice has a compatibility test, authorization/tenant test, generated
binding update, observability proof, and rollback plan. Old routes are removed
only after consumer and production verification.

## 10. Acceptance Invariants

The platform is conforming only while all of these remain true:

1. Every registered capability has unique ID and Zod input/output contracts.
2. Every transport and capability-bound job invocation enters through the same
   executor; handlers are not directly transport-callable.
3. Authentication and tenant identity come from trusted server context, and
   tenant-scoped DB work uses `TenantDB` or a tested referential-owner join.
4. Authorization, audit, idempotency, and transactions follow descriptor policy
   and fail closed.
5. Outputs and external provider responses are runtime-validated.
6. Domain/capability code imports internal adapters, never provider SDKs.
7. AST database/provider checks have counterexample coverage and no violation
   above their ratcheting baselines.
8. Catalog and route manifests are deterministic, complete, and clean after
   regeneration; duplicate or unsafe bindings fail generation.
9. Request handlers do not perform long-running durable work after response.
10. Durable jobs survive process restart, claim concurrently without duplicate
    ownership, retry with bounds, dead-letter, and replay safely.
11. `review_jobs` behavior is preserved until an explicitly verified migration
    supersedes it.
12. Request and worker services build as ordinary Node OCI images; the same
    provider-neutral image and runtime contract pass Cloud Run and AWS
    ECS/Fargate deployment-shape validation without provider-specific
    application code.
13. Migration is monotonic: converted slices reduce baselines and do not force
    a big-bang app cutover.

## 11. Program Tracks

- [Backend Architecture Enforcement](./tracks/backend_architecture_enforcement_20260713/)
- [Backend Capability Kernel](./tracks/backend_capability_kernel_20260713/)
- [Durable Job Worker Platform](./tracks/durable_job_worker_platform_20260713/)

Enforcement is the first dependency. Backend Capability Kernel Task 1 must then
publish and pass the accepted `packages/backend` package-scaffold gate. After
that structural gate, the remaining kernel implementation and durable queue
contract/test/implementation phases may run in parallel. Capability-bound
job-handler integration still depends on full kernel acceptance.
