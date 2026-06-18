# AGENTS.md — Reading Advantage Monorepo

Instructions for AI coding agents working in this repository.

This document uses a provider-neutral, backend-as-code architecture optimized for Next.js, TypeScript, AI coding agents, and long-term portability.

---

## Core Architecture Decisions

This codebase aims for the ergonomics of backend-as-code systems while remaining deployable on standard infrastructure using PostgreSQL, Docker, and replaceable adapters.

The codebase should be: agent-readable, declarative, strongly typed, contract-driven, modular, and provider-neutral.

```
Application  →  Backend Module  →  Internal Interface  →  Provider Adapter  →  Provider
```

Avoid direct coupling to provider SDKs.

---

## Primary Stack

Use the following defaults unless a project-specific specification explicitly overrides them.

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend

- PostgreSQL
- Drizzle ORM
- Zod
- Docker

### Storage

- S3-compatible object storage

### AI

- Internal AI adapter layer
- Vercel AI SDK may be used behind the adapter

### Infrastructure

- Docker deployment target
- Cloud Run, Fly.io, Railway, Kubernetes, or equivalent container platforms

---

## Version Policy

Use current stable versions pinned in package.json and lockfiles.

Do not upgrade major framework versions without an explicit migration task and review.

Agents must not introduce framework upgrades as part of unrelated feature work.

---

## Monorepo Structure

Target structure:

```
/apps
  /web
  /admin
  /other-apps

/packages
  /backend
  /db
  /ui
  /config
  /utils

/services
  /worker
  /api
```

Current package layout (migrating toward target):

| Package | Purpose | Depends on |
|---------|---------|------------|
| `@reading-advantage/db` | Drizzle schema, client | — |
| `@reading-advantage/auth` | Roles, permissions, JWT (migrating to adapter pattern) | db |
| `@reading-advantage/domain` | Business logic functions | db, auth, types |
| `@reading-advantage/api` | tRPC routers | db, auth, domain, types |
| `@reading-advantage/webhooks` | Hono external HTTP | db, domain |
| `@reading-advantage/types` | Shared Zod schemas | — |

Dependency order: `db` → `auth` → `types` → `domain` → `api` / `webhooks`

---

## Package Responsibilities

### Database Package

`/packages/db` owns:

- Drizzle schema definitions
- Migrations
- Database client configuration
- Seed data
- Low-level table access
- Database utilities

```
/packages/db
  schema/
  migrations/
  client.ts
  seeds/
```

Business logic must not live inside `/packages/db`.

### Backend Package

`/packages/backend` owns:

- Business logic
- Contracts
- Permissions
- Commands
- Queries
- Actions
- Orchestration
- Workflows

Backend modules may import database definitions from `/packages/db`.

Business logic belongs in `/packages/backend`.

---

## Backend-as-Code Model

Backend capabilities must be declared as TypeScript code in a single backend directory.

Organize by domain module:

```
/packages/backend/modules
  /auth
  /users
  /projects
  /documents
  /billing
  /storage
  /ai
```

Each module should colocate:

- Schema
- Contracts
- Queries
- Mutations
- Actions
- Permissions
- Errors
- Tests

Example:

```
/packages/backend/modules/projects
  schema.ts
  contracts.ts
  queries.ts
  mutations.ts
  actions.ts
  permissions.ts
  errors.ts
  index.ts
```

Business logic must not live in:

- React components
- Next.js pages
- Route Handlers
- Server Actions
- Vendor SDK wrappers

These layers should orchestrate backend modules rather than implement domain behavior.

---

## Backend Function Pattern

All backend operations should be defined through typed backend wrappers:

```ts
export const createProject = command({
  input: CreateProjectInput,
  output: CreateProjectOutput,
  auth: "user",
  authorize: async ({ user }, input) => {
    return canCreateProject(user, input);
  },
  handler: async (ctx, input) => {
    // business logic
  },
});
```

Current codebase uses the `assertCan()` pattern inside domain functions:

```ts
export async function createThing({ db, user, tenant, input }) {
  assertCan(user, "thing:create", tenant);
  const [result] = await db.insert(things).values({ ... }).returning();
  return result;
}
```

Both patterns are acceptable. New code should prefer the `command()` wrapper when practical.

---

## Authentication vs Authorization

Authentication answers: **Who is the user?**

Authorization answers: **Can this user perform this operation on this resource?**

Resource ownership checks, tenant checks, and role checks belong in permissions modules.

Avoid embedding permission logic directly inside handlers.

---

## Backend Function Requirements

Every backend function should define:

- Input schema
- Output schema
- Authentication requirement
- Authorization policy
- Transaction boundary when appropriate
- Structured error behavior
- Logging metadata where appropriate
- Audit metadata where appropriate
- Idempotency behavior where appropriate

Backend functions should be callable from:

- Next.js Server Actions
- Route Handlers
- Workers
- Cron jobs
- CLI tools
- Tests
- HTTP adapters
- tRPC adapters

Core business logic must not depend on a transport layer.

---

## Contracts and Validation

Use Zod as the standard contract system.

Zod schemas define:

- Backend inputs
- Backend outputs
- Forms
- Environment variables
- External API payloads
- AI structured outputs

TypeScript types should be inferred from Zod schemas whenever possible.

Runtime validation is required at all external boundaries. Do not rely solely on TypeScript types.

Every backend operation must define input schema and output schema using Zod. No external input should enter the system without validation.

---

## tRPC Policy

tRPC may be used as an internal transport adapter. tRPC is not the domain model.

Core backend functions must exist independently of tRPC.

Backend functionality should remain adaptable to:

- Direct server calls
- HTTP APIs
- tRPC
- Workers
- CLI tools
- OpenAPI
- JSON Schema generation

Use Zod contracts first. Treat tRPC as optional infrastructure.

---

## Database

PostgreSQL is the source of truth. Use Drizzle ORM for schema definitions, migrations, and typed queries.

Avoid provider-specific database features unless explicitly justified.

Database access should be centralized. Do not allow arbitrary SQL access from UI layers.

### Local Setup

- **Local**: Docker Postgres on port 5432, 3 databases (`reading_advantage`, `primary_advantage`, `science_advantage`)
- **Schema**: `packages/db/src/schema/` — organized by domain (users, classrooms, content, progress)
- **Migrations**: `packages/db/drizzle/` — generated by `drizzle-kit generate`
- **Start DB**: `pnpm db:start`

### Multi-Tenancy

Every query must be scoped by `schoolId`. Check `user.schoolId` or `tenant.schoolId`. Never trust tenant IDs from the frontend without verifying the user has access.

#### Table Classification (TenantDB)

Every Drizzle table is classified in `packages/domain/src/tenant-registry.ts` as one of:

- **FLAT** — has a `schoolId` column. `createTenantDB` automatically injects `eq(table.schoolId, tenant.schoolId)` on select, update, delete, and insert.
- **EXEMPT** — intentionally global (audit events, schools, auth infra). No tenant scoping applied.
- **REFERENTIAL** — tenant data scoped via an owner FK (no `schoolId` column). Querying through TenantDB throws `TenantScopeError`. Use `tenantDb.unscoped("reason")` to access the raw DB for manual owner-FK joins.

Adding a new table without classifying it in the registry is a **build failure** (enforced by `tenant-coverage.test.ts`).

#### Using `unscoped()`

For REFERENTIAL tables, use the escape hatch:

```ts
const rawDb = tenantDb.unscoped("classroomStudents has no schoolId, scoped via classroom FK");
const rows = await rawDb.select().from(classroomStudents).where(...);
```

The reason string is greppable for auditability. Prefer owner-FK joins through the users.schoolId chain when practical.

---

## Authentication

### Auth Philosophy

Use a minimal first-party authentication surface. The default authentication model is:

- Username/password
- Session-based authentication
- First-party accounts

Authentication may be implemented with either a bespoke implementation or a lightweight authentication library, provided the application code interacts only through the internal auth adapter. The implementation must remain replaceable.

### Auth Adapter

Application code should depend on:

```
auth.login()
auth.logout()
auth.getCurrentUser()
auth.requireUser()
auth.requireRole()
auth.changePassword()
```

Application code must not depend on:

- Session storage details
- Cookie implementation details
- Library-specific APIs

### Authentication Requirements

Authentication should use:

- Argon2id password hashing
- HttpOnly secure cookies
- PostgreSQL-backed sessions
- CSRF protection where applicable
- Rate limiting for login endpoints
- Audit logging for security-sensitive events

### Features Not Included by Default

Do not introduce OAuth, social login, magic links, passwordless login, account linking, or hosted authentication providers unless explicitly required by a project specification.

### Current Auth State

The codebase currently has `@reading-advantage/auth` providing roles, permissions, and JWT. Some apps still use Firebase Auth. This is being migrated toward the adapter pattern described above.

---

## Permissions

Authorization belongs in permissions modules:

```
/projects
  permissions.ts
```

Permission functions should encapsulate:

- Ownership checks
- Role checks
- Tenant checks
- Resource-level access checks

Avoid duplicating authorization logic throughout handlers.

---

## Storage

Use S3-compatible object storage through an internal adapter.

Application code should call:

```
storage.put()
storage.get()
storage.delete()
storage.getSignedUrl()
```

Application code must not directly call storage provider SDKs.

Supported providers may include Amazon S3, Cloudflare R2, MinIO, Backblaze B2, or other S3-compatible systems.

---

## AI

AI access must go through an internal adapter.

Application code should call:

```
ai.generateText()
ai.streamText()
ai.generateObject()
ai.embed()
```

Internally, the adapter may use Vercel AI SDK, OpenAI SDK, Anthropic SDK, Google SDK, or local model runtimes.

Application code must not depend directly on provider SDKs.

Prompts, tools, schemas, and structured outputs should be versioned and colocated with the owning backend module.

---

## Jobs and Workers

Long-running work must not execute inside request-response paths.

Use workers for:

- AI processing
- File processing
- Document generation
- Retries
- Queues
- Scheduled jobs
- Webhook processing

Preferred structure: `/services/worker`

Trigger.dev or other orchestration systems may be used. Job systems are infrastructure adapters, not business logic containers. Core job logic belongs in backend modules.

---

## Route Handlers vs API Services

Use Next.js Route Handlers for:

- App-local endpoints
- UI-driven workflows
- Server Actions
- Lightweight integrations

Use `/services/api` only for:

- Public APIs
- Mobile APIs
- Webhook ingress
- External integration boundaries
- Independently deployable services

Do not create a dedicated API service without a clear boundary.

---

## Observability

Observability is a first-class concern. Every backend service should support:

- Structured logging
- Error reporting
- Request tracing
- Performance metrics

### Logging

Use structured logs. Avoid free-form console logging in production code.

Logs should include:

- Request identifiers
- User identifiers where appropriate
- Operation names
- Timing information

### Audit Logs

Security-sensitive actions should create audit events:

- Login
- Logout
- Password changes
- Permission changes
- Billing events
- Destructive actions

Audit logs should be immutable.

---

## Migrations

Database schema changes must use Drizzle migrations.

Migration workflow:

1. Generate migration.
2. Review migration.
3. Run migration in CI.
4. Deploy migration before dependent application code.

Destructive migrations require explicit review. Data migrations should be versioned and repeatable.

---

## Testing

Backend functionality is the primary testing target.

Preferred testing order:

1. Backend function tests
2. Permission tests
3. Database integration tests
4. API adapter tests
5. End-to-end UI tests

Avoid relying exclusively on Playwright or UI testing.

### Project-Specific Testing

**Write tests for all new backend code.** Every domain function, tRPC router, or auth utility must ship with tests in the same change.

- **Framework**: Vitest for `packages/`, Jest for legacy apps
- **Location**: `src/__tests__/*.test.ts`
- **Mocking**: Mock the DB layer with `vi.fn()` — no real Postgres for unit tests
- **Mock DB helper**: `packages/domain/src/__tests__/mock-db.ts`
- **CI gate**: `pnpm turbo run test` must exit 0

---

## Deployment

Docker is the standard deployment target.

Applications should be deployable to:

- Google Cloud Run
- Fly.io
- Railway
- Kubernetes
- Docker hosts
- Equivalent container environments

Avoid depending on platform-specific features in core architecture. Platform optimizations are allowed only when they have portable fallbacks.

---

## Provider Neutrality Rule

Provider-specific code belongs behind adapters.

Preferred:

```
Application → Backend Module → Internal Interface → Provider Adapter → Provider
```

Avoid:

```
Application → Provider SDK
```

This rule applies to: AI, storage, authentication implementations, queues, email, search, analytics, billing.

---

## Agent Guidance

When modifying the system:

1. Locate the owning backend module first.
2. Update contracts before implementing logic.
3. Keep business logic in `/packages/backend`.
4. Keep UI layers thin.
5. Keep Route Handlers thin.
6. Keep Server Actions thin.
7. Do not bypass adapters.
8. Do not introduce framework lock-in without approval.
9. Prefer portable infrastructure.
10. Prefer explicit contracts.
11. Add tests alongside backend changes.
12. Preserve transport independence.

---

## Architectural Goal

The objective is to capture the developer experience of backend-as-code systems while retaining complete infrastructure portability.

---

## Measure Workflow

All development runs through the **Measure** spec-driven development framework. At the start of every session:

1. Load the `measure` skill
2. Read `measure/index.md` for project context
3. Follow the workflow in `measure/workflow.md`

Key files:
- `measure/tracks.md` — Active work registry
- `measure/tracks/<track_id>/plan.md` — Task checklist for current track
- `measure/product.md` — Product vision
- `measure/tech-stack.md` — Technology decisions
- `measure/lessons-learned.md` — Project memory
- `measure/tech-debt.md` — Known shortcuts

Never start significant work without an active track.

---

## Documentation Standards

### JSDoc for All Functions

Every exported function, class, interface, and type alias must have a JSDoc comment. Follow the Google TypeScript Style Guide: **do not repeat types** in JSDoc — TypeScript already provides type information.

Required for all functions:
- **Description**: One clear sentence stating what the function does.
- **`@param`**: Describe each parameter's purpose (no types).
- **`@returns`**: Describe the return value (no type).

Required when applicable:
- **`@throws`**: Document error conditions and what triggers them.
- **`@example`**: For complex utilities or non-obvious usage patterns.

Example:
```ts
/**
 * Calculates the discounted price given an original price and discount percentage.
 * @param originalPrice The price before discounts.
 * @param discountPercent Integer from 0 to 100.
 * @returns The final price after discount.
 * @throws When discountPercent is outside 0-100.
 */
function calculateDiscount(originalPrice: number, discountPercent: number): number { ... }
```

This standard enables `build-graph` to extract meaningful summaries for the codebase knowledge graph.

---

## Build & Test

```bash
pnpm install                 # Install dependencies
pnpm db:start                # Start local PostgreSQL
pnpm dev                     # Start all apps
pnpm turbo run lint          # Lint all packages
pnpm turbo run test          # Test all packages
pnpm turbo run build         # Build all packages
pnpm turbo run check-types   # Type check all packages
```

Run for a single package: `pnpm turbo run build --filter=@reading-advantage/db`

---

## Known Issues

See `measure/tech-debt.md` for the full list. Key items:
- Primary-advantage has 49 pre-existing ESLint errors
- Mixed Jest/Vitest test runners (being normalized)
- Some apps still use Prisma (migrating to Drizzle gradually)
- Firebase Auth still in reading-advantage (being migrated to adapter pattern)
- `@reading-advantage/auth` uses JWT (migrating to session-based auth adapter)
- 294 legacy API routes across reading-advantage, primary-advantage, and science-advantage (not yet using domain functions)

---

## Commit Style

Follow Conventional Commits:
- `feat:` for new features
- `fix:` for bug fixes
- `chore:` for tooling, config, measure updates
- `docs:` for documentation

Keep commits scoped to a single concern. Reference track IDs when relevant.

A `commitlint` hook (via husky) validates every new commit against the conventional-commit format. Non-chore commit subjects must include a `track_id` reference in the form `(track_id: <name>_<YYYYMMDD>)`. This rule applies to **new commits** only; historical commits are not affected.

---

## Codebase Graph

This project is indexed by `build-graph` — a SQLite knowledge graph of the TypeScript codebase. Scan once, then query structure instead of grepping.

### Quickstart

```bash
# Build graph.db (do this if it is missing or stale)
build-graph scan . ./graph.db

# Incremental update after editing files
build-graph update ./graph.db src/file1.ts src/file2.ts
```

### Agent Rules

| Rule | When |
|------|------|
| Query before grep | Before searching for "what uses X", run `build-graph callers ./graph.db X` or `build-graph deps ./graph.db X` |
| Inspect exports before editing | Before modifying an exported function/class/schema, run `build-graph inspect ./graph.db SymbolName` to see blast radius |
| Filter by package | In monorepos, add `--from-package=P` or `--to-package=P` to `deps` / `callers` to narrow scope |
| Update after structural edits | After changing signatures, imports, exports, schemas, or JSX, run `build-graph update ./graph.db <files>` so the next agent has fresh context |
| Skip for internal-only changes | Pure variable renames inside a private function do not need a graph update |

### One-liners

```bash
build-graph search ./graph.db keyword           # fuzzy node search
build-graph callers ./graph.db fnName           # who calls this
build-graph deps ./graph.db Module --downstream # what Module depends on
build-graph path ./graph.db A.ts B.ts           # shortest path
build-graph stats ./graph.db                    # dashboard
build-graph inspect ./graph.db SymbolName       # full profile
```

For full docs, read the skill: `~/.claude/skills/build-graph/SKILL.md`
