# @reading-advantage/knowledge-space-core

Domain-neutral contracts for `knowledge-space.v1` — a reusable directed weighted graph model for learning nodes, typed relationships, provenance, and validation.

## What This Package Provides

| Module | Purpose |
|--------|---------|
| `types.ts` | TypeScript types: `KnowledgeSpace`, `KnowledgeSpaceNode`, `KnowledgeSpaceEdge`, `DomainAdapter`, etc. |
| `schemas.ts` | Zod schemas with cross-field validation (duplicate IDs, dangling edges, duplicate edges, endpoint pairing rules) |
| `validation.ts` | Pure-function validation helpers: alignment requirements, generator readiness, adapter validation |
| `adapters.ts` | Domain adapter contract for metadata validation |
| `fixtures.ts` | Synthetic test fixtures (math-like and English/GSE-like) with no proprietary data |

## Usage

```ts
import { knowledgeSpaceSchema, validateKnowledgeSpace } from '@reading-advantage/knowledge-space-core';
import { syntheticMathFixture } from '@reading-advantage/knowledge-space-core/fixtures';

// Parse and validate
const result = knowledgeSpaceSchema.safeParse(syntheticMathFixture);
// result.success === true

// Full validation (structural + readiness)
const validation = validateKnowledgeSpace(syntheticMathFixture);
// validation.valid === true
```

## Node Kinds

`domain` | `content_group` | `instructional_unit` | `standard` | `skill` | `concept` | `worked_example` | `task_blueprint` | `generator` | `renderer` | `misconception`

## Edge Types

`contains` | `appears_in_context` | `aligned_to_standard` | `prerequisite_for` | `supports` | `extends` | `equivalent_to` | `common_misconception_with` | `rendered_by` | `generated_by` | `evidenced_by`

## Weight Semantics

- **`weight`** (0–1): Relationship strength. Do not overload weight to mean difficulty, importance, or confidence.
- **`confidence`** (`low` | `medium` | `high`): Evidence confidence for the node or edge.

## ID Rules

- Domain prefixes are adapter-defined. Examples: `math.im3`, `english.gse`.
- Core IDs are opaque stable strings validated by the core pattern and optional domain adapter.
- Example math skill ID: `math.im3.skill.m1.l2.solve-quadratic-by-factoring`
- Example English/GSE skill ID: `english.gse.skill.b1.reading.identify-main-idea.short-text`

## Provenance Rules

- Every node and edge must cite at least one source reference or be marked `derived`.
- Derived edges must include derivation method and reviewer status.

## Domain Adapters

Adapters validate domain-specific metadata while the core stays neutral:

```ts
import type { DomainAdapter } from '@reading-advantage/knowledge-space-core';

const mathAdapter: DomainAdapter = {
  domain: 'math.im3',
  validateNodeMetadata: (node) => {
    if (!node.metadata?.course) {
      return { valid: false, errors: ['math node must have course metadata'] };
    }
    return { valid: true };
  },
};
```

## Boundary

This package ships mechanisms only. It **must not** import from:
- `apps/`
- `convex/_generated/`
- `packages/math-content/`
- Any domain content package

Proprietary math maps, Pearson/GSE descriptors, standards catalogs, and curriculum files belong in app/domain content packages.

## License

Private — part of the Math Advantage monorepo.

## Shared runtime release policy

This package is now canonical in the Reading Advantage monorepo. Its exact
version-to-`kst-srs.v3.2` mapping and supported graph major live in
`packages/mastery-runtime-compat/runtime-manifest.json`. Add normative fixtures
before behavior changes, use semver for public contracts, run the packed
consumer gate before release, and never ship consumers with `*` or `latest`.

## Contract checks

The Mastery Advantage repository owns the current v3.2 specification.
Local tests cover the imported v3.2 runtime behavior and current dependency boundaries.
The ra-math repository owns the retained v2 specification, IM3 evidence, Measure documents, and repository scripts.
Set `RA_MATH_V2_ROOT` to run those historical integration checks:

```sh
RA_MATH_V2_ROOT=/path/to/ra-math-advantage node ../../node_modules/vitest/vitest.mjs run src/__tests__/docs-reconciliation.test.ts src/__tests__/spec-markers.test.ts src/__tests__/phase4-spec-section-6-implementation.test.ts src/__tests__/phase5-spec-section-3-2-3-7-8-4-13-3-implementation.test.ts src/__tests__/phase4-doctor-generate-scripts.test.ts src/__tests__/phase4-final-verification.test.ts src/__tests__/phase-1-adversarial.test.ts src/__tests__/phase-5-adversarial.test.ts --maxWorkers=1 --no-file-parallelism
```
