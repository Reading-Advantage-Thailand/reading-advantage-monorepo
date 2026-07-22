# Phase 0 Repository Graph Baseline Producer Evidence

Date: 2026-07-22
Producer status: **complete; independent acceptance pending**

This evidence is the shared graph-baseline candidate for:

1. `small_company_admin_privileges_20260722` (Program Track 1); and
2. `customer_licensing_crm_20260722` (Program Track 2).

It does not accept Phase 0, unblock either product track, or authorize source
changes. An independent reviewer must verify this evidence and publish the
Phase 0 acceptance decision first.

## Failed-state disposition

The graph present before the successful rebuild was treated as incompatible,
stale-schema evidence and was not consumed for Accounts or CRM planning. The
exact earlier stderr and timeout budgets were not preserved, so this record
does not reconstruct or quote them. Earlier time-limited full-scan attempts did
not produce an accepted artifact. The successful canonical full scan completed
in `283,968 ms`; only that complete output and the read-only checks below form
this producer candidate.

## Canonical rebuild receipt

| Property | Result |
| --- | --- |
| Checkout | `/home/daniel-bo/Desktop/reading-advantage-monorepo` |
| Branch | `master` |
| Producer command | `repo-graph scan . ./graph.db` |
| Canonical tool version | `0.1.0` |
| Discovered TypeScript configs | `43` |
| Full-scan duration | `283,968 ms` |
| Nodes | `85,945` |
| Edges | `113,742` |
| Files | `3,292` |
| Graph SHA-256 | `2fc3b352d7897b51d3a201c1501e6a5d8c42a4798b320a58c16114e2e9dcee67` |
| Graph size | `175,222,784 bytes` |
| Graph mtime | `2026-07-22 20:54:51.425403921 +0700` |
| Persisted schema version | `2.0.0` |
| Persisted `lastIndexedAt` | `1784728491130` |
| Persisted project root | `/home/daniel-bo/Desktop/reading-advantage-monorepo` |

The persisted `commitSha` is `null`; the immutable graph hash above, canonical
checkout path, scan receipt, and freshness result are therefore the baseline
identity. Consumers must not substitute a different `graph.db` under this
evidence record.

## Read-only revalidation

Commands were rerun after the producer completed, without updating or rescanning
the graph:

```text
repo-graph --version
repo-graph stats ./graph.db --json
repo-graph audit ./graph.db --json
repo-graph query --json ./graph.db "SELECT key, value FROM meta ORDER BY key"
sha256sum graph.db
stat -c '%n %s bytes %y' graph.db
```

Results:

- `repo-graph --version` returned `0.1.0`.
- `stats` returned exactly `85,945` nodes, `113,742` edges, and `3,292`
  files. Freshness was `stale: []` and `missing: []` at
  `checkedAt: 1784728491130`.
- `audit --json` exited `0` with no integrity findings.
- `meta` contained `schemaVersion: 2.0.0`, `commitSha: null`,
  `lastIndexedAt: 1784728491130`, and the exact canonical project root.
- `sha256sum` matched the producer hash exactly.

## Required symbol probes

Each surface was first located with `repo-graph search`, then queried with
`repo-graph inspect` and `repo-graph callers` using the full node ID. Caller
counts below include only resolved incoming `calls` edges returned by the exact
node query.

| Surface | Search term | Exact inspected node | Resolved callers |
| --- | --- | --- | ---: |
| Accounts composition | `getIdentityComposition` | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/apps/accounts/lib/server/identity.ts:getIdentityComposition` | 18 |
| Backend freeze boundary | `deepFreeze` | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/packages/backend/src/kernel/runtime.ts:deepFreeze` | 9 |
| Backend executor contract | `CapabilityExecutor` | `interface:/home/daniel-bo/Desktop/reading-advantage-monorepo/packages/backend/src/kernel/runtime.ts:CapabilityExecutor` | 0 call edges |
| Company identity contract | `CompanyIdentityService` | `interface:/home/daniel-bo/Desktop/reading-advantage-monorepo/packages/backend/src/modules/company-identity/service.ts:CompanyIdentityService` | 0 call edges |
| Company identity factory | `createCompanyIdentityService` | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/packages/backend/src/modules/company-identity/service.ts:createCompanyIdentityService` | 0 resolved callers |
| License mutation | `createLicense` | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/packages/domain/src/licenses/mutations.ts:createLicense` | 0 resolved callers |
| www blog read | `getBlogPost` | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/apps/www-reading-advantage/src/lib/blog.ts:getBlogPost` | 3 |
| www contact UI | `ContactForm` | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/apps/www-reading-advantage/src/components/contact/contact-form.tsx:ContactForm` | 0 call edges |

The resolved Accounts callers cover 15 API route handlers plus
`currentEmployee`, `currentSessionToken`, and `requireSameOrigin`. The resolved
`deepFreeze` callers are the registry/executor/descriptor validation functions
in `packages/backend/src/kernel/runtime.ts`. The resolved `getBlogPost` callers
are `BlogPost`, `generateMetadata`, and `getAllBlogPosts`.

Representative command shape (repeated for every row with its exact node ID):

```text
repo-graph search ./graph.db getIdentityComposition --json --limit 30
repo-graph inspect ./graph.db 'function:/home/daniel-bo/Desktop/reading-advantage-monorepo/apps/accounts/lib/server/identity.ts:getIdentityComposition' --json
repo-graph callers ./graph.db 'function:/home/daniel-bo/Desktop/reading-advantage-monorepo/apps/accounts/lib/server/identity.ts:getIdentityComposition' --json
```

## Known parser and query exclusions

- The graph intentionally materializes unresolved call targets. For example,
  chained uses such as `(await getIdentityComposition()).executor.execute`,
  imported package-alias calls such as `createCompanyIdentityService`, schema
  methods, database builder chains, React hooks, and platform/library methods
  can appear as `unresolved-call:*` nodes even when their owning source symbol
  is independently queryable.
- Bare symbol names can be ambiguous in a monorepo (route names such as `GET`,
  `POST`, and `PUT` are repeated extensively). Full node IDs are the accepted
  query key and resolved successfully for every inspected surface above.
- `repo-graph callers` reports resolved incoming call edges. Interfaces such as
  `CapabilityExecutor` and `CompanyIdentityService`, and the JSX component
  `ContactForm`, can therefore be present and inspectable while returning an
  empty caller result. That result is not evidence that the source declaration
  does not exist.
- The exact domain `createLicense` node has **no resolved callers** in this
  baseline. Track 2 must treat it as an existing contract/implementation surface
  with unproven live integration, not as proof that a product route currently
  consumes it.
- A no-caller query exits `1` with `{"results":[]}`. That command outcome is a
  truthful empty relationship set, distinct from an inspect/search failure.

## Producer conclusion

The canonical graph artifact is complete, current, hash-bound, and queryable
across the required Accounts, backend-kernel, company-identity, license, and www
surfaces. The producer evidence supports completing the binary verification,
full rebuild, and queryability tasks in Phase 0. The baseline remains a
candidate until an independent reviewer verifies the receipt, exclusions, and
symbol results; Phase S1 and Track 2 remain blocked in the meantime.
