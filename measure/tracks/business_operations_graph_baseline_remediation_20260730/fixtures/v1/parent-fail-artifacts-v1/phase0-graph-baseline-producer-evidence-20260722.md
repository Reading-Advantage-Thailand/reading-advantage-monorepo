# Phase 0 Repository Graph Baseline Producer Evidence

Date revised: 2026-07-30<br>
Track: `small_company_admin_privileges_20260722` (shared with
`customer_licensing_crm_20260722`)<br>
Producer status: **revised receipt; acceptance still pending/blocked**

This document is evidence only. It does not accept Phase 0, change the plan,
unlock either product track, or authorize source changes. The independent
reviewer's prior decision remains **FAIL** until a new independent review says
otherwise.

## Preconditions and tree identity

- Checkout: `/home/daniel-bo/Desktop/reading-advantage-monorepo`
- Branch: `master`
- `git rev-parse HEAD`: `3ff9b734a9e5a69f777108827b569e4f20a5ceb8`
- `git worktree list --porcelain`: one shared worktree (the checkout above)
- The working tree was already dirty with unrelated APK work. No unrelated
  path was edited, staged, reverted, or committed.

The graph below is therefore a scan of the current dirty tree, not of the
baseline commit alone. Its metadata `commitSha` is `null`.

## Canonical rebuild receipt

Exact command:

```text
/usr/bin/time -f 'SCAN_ELAPSED_SECONDS=%e\nSCAN_EXIT=%x' repo-graph scan . ./graph.db
```

Exit: `0`<br>
Tool: `repo-graph --version` → `0.1.0`<br>
Scanner-reported duration: `227,833 ms`<br>
Wall duration: `229.23 s` (`SCAN_ELAPSED_SECONDS=229.23`)<br>
TypeScript configurations: `43`<br>
Scanned files/nodes/edges: `3,400` files, `88,414` nodes, `116,683` edges

The successful scan replaced the prior graph artifact. No partial or timed-out
scan output was consumed.

## Independent artifact and metadata revalidation

Exact commands and exits:

```text
repo-graph stats ./graph.db --json                 # 0
repo-graph audit ./graph.db --json                 # 1
repo-graph query --json ./graph.db "SELECT key, value FROM meta ORDER BY key" # 0
sha256sum graph.db                                 # 0
stat -c '%n %s bytes %y' graph.db                  # 0
git rev-parse HEAD                                 # 0
```

`stats` independently reports `nodes=88414`, `edges=116683`, `files=3400`,
and `freshness.stale=[]`, `freshness.missing=[]`,
`freshness.checkedAt=1785376142259`.

Artifact receipt:

| Property | Result |
| --- | --- |
| SHA-256 | `3c0fab1a59947e947f9e652219e14386f422b2cbf424d60ccc86d446db543d1a` |
| Size | `180015104` bytes |
| Mtime | `2026-07-30 08:49:02.512309754 +0700` |
| Persisted schema | `2.0.0` |
| Persisted `commitSha` | `null` |
| Persisted `lastIndexedAt` | `1785376142259` |
| Persisted project root | `/home/daniel-bo/Desktop/reading-advantage-monorepo` |

## Audit outcome (not concealed)

`repo-graph audit ./graph.db --json` exited **`1`**, not `0`.

The exact JSON contains:

```text
missingFiles=0
staleSymbols=0
orphanEdges=0
unauditedSymbols=3965
```

The `unauditedSymbols` set is `3300` fields and `665` routes. These are
scanner-required exclusions: the audit says stale-symbol detection for these
node kinds requires a full scanner rerun. The integrity arrays are empty, but
the non-zero exit and non-empty unaudited set are material limitations. This
receipt does not claim a clean audit.

## Required symbol probes

For each row, the exact sequence was:

```text
repo-graph search ./graph.db <term> --json --limit 30
repo-graph inspect ./graph.db '<full node id>' --json
repo-graph callers ./graph.db '<full node id>' --json
```

All `search` and `inspect` commands exited `0`. Caller results were independently
counted from the JSON; a zero-result caller query exits `1` and returns
`{"results":[]}`.

| Surface | Full node ID | Inspect | Callers exit/results |
| --- | --- | ---: | ---: |
| Accounts composition | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/apps/accounts/lib/server/identity.ts:getIdentityComposition` | 0 | 0 / 18 |
| Backend freeze boundary | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/packages/backend/src/kernel/runtime.ts:deepFreeze` | 0 | 0 / 9 |
| Backend executor contract | `interface:/home/daniel-bo/Desktop/reading-advantage-monorepo/packages/backend/src/kernel/runtime.ts:CapabilityExecutor` | 0 | 1 / 0 |
| Company identity contract | `interface:/home/daniel-bo/Desktop/reading-advantage-monorepo/packages/backend/src/modules/company-identity/service.ts:CompanyIdentityService` | 0 | 1 / 0 |
| Company identity factory | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/packages/backend/src/modules/company-identity/service.ts:createCompanyIdentityService` | 0 | 1 / 0 |
| License mutation | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/packages/domain/src/licenses/mutations.ts:createLicense` | 0 | 1 / 0 |
| www blog read | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/apps/www-reading-advantage/src/lib/blog.ts:getBlogPost` | 0 | 0 / 3 |
| www contact UI | `function:/home/daniel-bo/Desktop/reading-advantage-monorepo/apps/www-reading-advantage/src/components/contact/contact-form.tsx:ContactForm` | 0 | 1 / 0 |

## Current-source and parser/config exclusions

Freshness only checks indexed file rows; it does not prove that every current
source file is indexed. A filesystem/status-vs-graph check found these current
files with no graph file row:

- `packages/backend/src/jobs/__tests__/postgres16-harness.integration.test.ts`
- `packages/backend/src/jobs/__tests__/postgres16-harness.test.ts`
- `packages/backend/src/jobs/__tests__/postgres16-harness.ts`
- 19 current `packages/advantage-play-kit/**` test/test-support/config files,
  excluded by that package's `tsconfig.json` patterns
  (`src/**/*.test.ts`, `src/**/*.test.tsx`, `src/**/*.test-support.ts`)
- 4 current `apps/advantage-games/**` test/spec files, excluded by that app's
  `**/*.test.tsx`, `**/*.spec.ts`, and related test patterns

The three backend files are tracked, exist in the checkout, and have no graph
file rows because `packages/backend/tsconfig.json` excludes
`src/**/__tests__` and `src/**/*.test.ts`. The status-vs-graph check found 23
missing current status-listed TypeScript files in total (19 package files and
4 application files), in addition to the three backend files above. Thus 26
current files were verified absent from graph file rows. These exclusions are
not hidden by the clean
`freshness` arrays and prevent an unqualified “complete/current source graph”
claim.

Other known graph parser/query limitations remain: unresolved chained/property
calls are materialized as `unresolved-call:*`; monorepo bare names can be
ambiguous; interfaces and JSX components can have zero resolved call edges;
and exact full node IDs are required for reliable probes. The exact
`createLicense` node has zero resolved callers and must not be treated as live
route integration evidence.

## Producer conclusion and blockers

The canonical scan completed and the required symbols are queryable, but the
artifact is **not acceptance-ready**: audit exit `1` with `3965` unaudited
symbols and current TypeScript sources excluded by package configuration.
Accordingly, the Phase 0 task remains `[~]`, Phase S1 remains blocked, and the
shared CRM track remains blocked. An independent reviewer must verify this
revision and decide acceptance. This receipt does not mark the plan accepted.
