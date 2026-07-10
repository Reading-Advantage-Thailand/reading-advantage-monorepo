# Phase S1 Test Strategy: Codecamp Knowledge Graph

## Authority and ownership

- The normative graph is `~/Desktop/mastery-advantage/code/code-knowledge-space.json`.
- `@reading-advantage/codecamp-knowledge` owns the strict Code-domain envelope,
  adapter, validation, deterministic reports, and a byte-identical consumer snapshot.
- `@reading-advantage/knowledge-space-core` remains the domain-neutral graph engine;
  this phase does not extend or fork its contracts.
- Graph IDs are permanent once published. A breaking semantic change creates a new ID;
  title and description edits do not.

## Red gates

The phase tests must fail before implementation for:

1. strict envelope/schema violations and unknown fields;
2. duplicate IDs, dangling edges, invalid endpoint pairs, and prerequisite cycles;
3. hard gates that are not high-confidence prerequisite edges at the shared engine threshold;
4. soft relationships that can accidentally become progression gates;
5. disconnected active objectives and invalid intra-domain transfer edges;
6. missing cluster, priority, lifecycle, objective-type, source, review, or provenance data;
7. standards presented as replacement objective IDs instead of projections;
8. snapshot divergence between the normative source and the packaged consumer copy;
9. missing required clusters or an unreviewed prerequisite edge in a published release.

## Fixture matrix

| Fixture | Expected result | Purpose |
|---|---|---|
| minimal representative foundation-to-frontend graph | pass | contract smoke test |
| duplicate objective ID | fail | stable identity |
| dangling prerequisite | fail | referential integrity |
| prerequisite cycle | fail | readiness safety |
| low-weight hard gate | fail | gate semantics |
| `supports` edge marked hard | fail | non-gating support |
| active disconnected skill | fail | graph coverage |
| same-domain transfer | fail | transfer semantics |
| framework node used as a Codecamp objective | fail | projection-only standards |
| unknown metadata/envelope field | fail | strict authoring contract |

## Green and acceptance gates

```bash
pnpm --filter @reading-advantage/codecamp-knowledge test
pnpm --filter @reading-advantage/codecamp-knowledge test:coverage
pnpm --filter @reading-advantage/codecamp-knowledge check-types
pnpm --filter @reading-advantage/codecamp-knowledge lint
pnpm --filter @reading-advantage/codecamp-knowledge build
pnpm --filter @reading-advantage/codecamp-knowledge graph:validate
pnpm --filter @reading-advantage/codecamp-knowledge graph:report
```

Coverage target is at least 80% for statements, branches, functions, and lines.
The final report must be deterministic and include node/edge totals, cluster counts,
hard/soft prerequisite counts, lifecycle/review counts, and standards projections.

## Manual and browser disposition

S1 creates no learner- or teacher-visible UI. Browser acceptance is therefore N/A for
this phase. Manual verification consists of reviewing the deterministic graph report,
the prerequisite-edge checklist, the migration impact record, and the source/snapshot
digest proof. Browser testing becomes mandatory when S4 publishes graph-backed content.
