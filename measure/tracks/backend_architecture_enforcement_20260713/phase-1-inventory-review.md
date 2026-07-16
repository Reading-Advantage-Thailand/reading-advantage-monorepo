# Phase 1 Architecture Inventory Review

## Scope and evidence

Task 3 inventories tracked TypeScript and JavaScript under `apps/`,
`integrations/`, `packages/`, and `services/`. Generated output, dependencies,
coverage, and test reports are excluded by exact directory segment. The command
is read-only and emits no timestamp, machine path, source body, or secret value.

| Evidence | Result |
|---|---:|
| Tracked source files scanned | 3,620 |
| Structured syntax facts | 20,056 |
| Read or TypeScript parse errors | 0 |
| Raw inventory SHA-256, run 1 | `09a0408e4c81e9ae990cf8fdc0d97bcdfaf919ab5f24aee843b0e148a8469788` |
| Raw inventory SHA-256, run 2 | `09a0408e4c81e9ae990cf8fdc0d97bcdfaf919ab5f24aee843b0e148a8469788` |
| Direct review candidates | 699 |
| Direct review manifest SHA-256 | `352f1aee772e03680c773523bacec93a1e39ec160c07c1195d5d5a896d82f186` |

The complete candidate review is committed at
`measure/generated/architecture-direct-review.v1.json`. Every entry contains a
rule, exact source path and location, evidence kind, direct module or resource,
derived accountable owner, rationale, and proposed disposition.

## Candidate disposition review

| Rule | Production baseline review | Exact test/fixture review | Unique files |
|---|---:|---:|---:|
| `AI_PROVIDER_BOUNDARY` | 19 | 25 | 18 |
| `DATABASE_BOUNDARY` | 460 | 171 | 322 |
| `DURABLE_JOB_DATABASE_BOUNDARY` | 4 | 0 | 2 |
| `INTEGRATION_PROVIDER_BOUNDARY` | 5 | 12 | 4 |
| `STORAGE_PROVIDER_BOUNDARY` | 3 | 0 | 3 |
| **Total** | **491** | **208** | — |

Disposition rules are exact and fail closed:

- a candidate under an approved ownership root or exact configured exception
  is removed before review;
- a candidate whose exact path is a test or fixture is proposed only for an
  exact exception review, never a production baseline;
- every other direct match is proposed for the domain baseline with a stable
  owner and rationale;
- no source glob, directory-wide test exemption, or wildcard resource matcher
  is accepted.

The repository projections and independent review exposed two ownership-map
false positives. The dedicated `packages/db/company-identity/` Drizzle
migration directory was corrected in commit `78a96657`. The database-owned
`packages/db/scripts/` migration doctor is also an exact approved maintenance
root and was removed before the final review. The final manifest contains
neither approved database-owned path.

Independent review also rejected segment-wide `build` and `dist` exclusions as
a policy bypass. Inventory exclusions now apply only at exact workspace
generated-output positions (plus dependency-owned `node_modules`); a tracked
production source under `src/build/` is scanned and covered by a Red/Green
counterexample.

## Limits carried into later phases

This is a direct-fact inventory, not the accepted AST boundary analyzer.
Alias, barrel, resolved-target, and concrete client-construction propagation
remain Red-test and analyzer work in Phases 2 and 3. Therefore this manifest is
review input, not a ratcheting baseline. Task 4 may freeze only entries that
retain their disposition after exact exception review and baseline key
generation. The later analyzer must add any alias/resolved-target findings and
cannot silently discard direct candidates.

Existing AI provider and API boundary guards remain Green. The tenant coverage
guard currently exposes a pre-existing mismatch: `activitySessions` is
classified `REFERENTIAL` while carrying nullable `schoolId`. Gate 1 acceptance
must resolve that mismatch without weakening tenant coverage.

Independent re-review passed with no remaining Critical or High findings. It
validated selector, ownership-root, exact-exception, owner, rationale, and
disposition invariants across all 699 entries, as well as the manifest hash and
the exact generated-output exclusion behavior.

## Reproduction

```bash
pnpm architecture:inventory --format human
pnpm architecture:inventory --format json | sha256sum
pnpm architecture:inventory --format review-json | sha256sum
CI=true pnpm --filter @reading-advantage/architecture-enforcement test
```
