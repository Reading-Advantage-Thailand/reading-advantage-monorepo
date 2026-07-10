# knowledge-space-practice

Domain-neutral practice blueprints, generators, and evidence contracts for the knowledge-space ecosystem.

## When to create one blueprint vs multiple blueprints

- **One blueprint** per node that represents a single practice activity type. If the skill, the pedagogical mode (worked/guided/independent), and the renderer are the same, use a single blueprint.
- **Multiple blueprints** when a skill supports different pedagogical modes that need different specs, or when different renderers are appropriate for different stages of mastery (e.g., a worked example using an algebraic solver vs independent practice using a drag-and-drop canvas).

## Source provenance and review status

Every blueprint carries a `reviewStatus` field. The lifecycle is:

| Status | Meaning |
|--------|---------|
| `draft` | Blueprint is under construction, not ready for production |
| `reviewed` | Blueprint content has been checked by a subject-matter expert |
| `approved` | Blueprint is cleared for learner-facing use |
| `rejected` | Blueprint was reviewed and found unsuitable |

Source provenance is tracked through `sourceNodeIds` and `alignmentNodeIds`, which reference nodes in the knowledge-space-core graph. This ensures every blueprint can be traced back to its originating skills, standards, and worked examples.

## Synthetic examples

### Algebraic (factoring skill)

```typescript
import { syntheticAlgebraicBlueprint } from '@reading-advantage/knowledge-space-practice';

// A blueprint for practicing factoring quadratics.
// Includes worked example, guided practice, and independent practice specs.
// References synthetic math nodes from syntheticMathFixture.
```

### Graphing (coordinate-plane skill)

```typescript
import { syntheticGraphingBlueprint } from '@reading-advantage/knowledge-space-practice';

// A blueprint for graphing parabolas on the coordinate plane.
// Includes worked example and independent practice with a visual renderer.
```

### English/GSE-style (reading comprehension)

```typescript
import { syntheticEnglishBlueprint } from '@reading-advantage/knowledge-space-practice';

// A blueprint for reading comprehension at B1 CEFR level.
// Includes worked example, guided practice, and independent practice.
// References synthetic English/GSE nodes from syntheticEnglishGseFixture.
```

## Domain separation

Actual domain maps, descriptors, generator implementations, and renderer bindings live in domain packages. This package only defines the **contract** — the types, schemas, and interfaces that domain packages must satisfy. No real math maps, Pearson/GSE descriptors, standards catalogs, or `apps/` imports live here.

## Projections

Projection utilities convert knowledge-space graphs and blueprints into runtime artifacts. All outputs are regenerated — they are not source truth. Review diffs before replacing app artifacts.

| Function | Output | Use case |
|---|---|---|
| `projectActivityMap(nodes, edges, blueprints)` | `ProjectedActivity[]` | Generate `practice.v1` activity map rows with provenance |
| `projectSrsInputs(nodes, edges, blueprints)` | `SrsProjectionEntry[]` | Feed the SRS engine with node/standard/prereq context |
| `projectTeacherEvidence(nodes, edges, classStats?)` | `TeacherEvidence` | Standard/skill coverage, prerequisite gaps, attempt artifacts |
| `projectStudentVisualization(nodes, edges, learnerState?)` | `StudentVisualizationV1` | Mastered/ready/blocked/review-due/recommended-next buckets |
| `projectParentVisualization(nodes, edges, learnerState?)` | `ParentVisualizationV1` | Plain-language can-do summary, next focus, blockers, trend |
| `projectTeacherVisualization(nodes, edges, classStats?)` | `TeacherVisualizationV1` | Heatmap, bottlenecks, misconception clusters, interventions |

All three visualization functions return payloads validated against versioned `visualization.v1` Zod schemas. UI components must consume these payloads — they must not infer canonical graph state directly from raw graph files.

## Package structure

```
src/
  blueprints/
    types.ts        — TypeScript types (KnowledgeBlueprint, GeneratorInput, etc.)
    schemas.ts      — Zod schemas, generatorRegistrySchema, and validation helpers
    generator.ts    — DeterministicGenerator interface and validation re-exports
    evidence.ts     — EvidenceAdapter, PracticeSubmissionPart, conversion helpers
    fixtures.ts     — Synthetic test-only fixtures (no real data)
    index.ts        — Barrel exports
  projections/
    types.ts        — ProjectedActivity, SrsProjectionEntry, TeacherEvidence, Visualization v1 types
    schemas.ts      — visualization.v1 Zod schemas (student/parent/teacher)
    activity-map.ts — projectActivityMap: blueprints → practice.v1 activity rows
    srs.ts          — projectSrsInputs: nodes/blueprints → SRS projection entries
    teacher-evidence.ts — projectTeacherEvidence: graph → standard/skill coverage
    visualization.ts    — projectStudentVisualization, projectParentVisualization, projectTeacherVisualization
    fixtures.ts     — Synthetic knowledge-space fixtures for testing
    index.ts        — Barrel exports
  __tests__/
    blueprints.test.ts  — Blueprint schema, generator, and evidence tests
    projections.test.ts — Projection, visualization, and cross-domain smoke tests
```
