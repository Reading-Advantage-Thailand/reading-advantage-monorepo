# Codecamp Graph Authoring Contract

## Taxonomy

The Codecamp graph uses one product domain (`codecamp`) with instructional clusters:
foundation, frontend, backend, data, testing, AI, workflow, deployment, architecture,
and game development. Concept nodes are language-agnostic. Skill nodes apply a concept
or professional workflow in a named context. Technology names belong in metadata and
titles, not in duplicate copies of an equivalent concept.

External standards are projection nodes in their own domains (`standards.csta` and
`standards.thai-ict`). `aligned_to_standard` edges map Codecamp objectives to those
projections. Standards never replace Codecamp objective IDs.

## Stable IDs and lifecycle

- IDs use dot-separated lower-kebab-case segments under `codecamp.*`.
- Published IDs are never reused or renamed.
- Lifecycle is `draft`, `active`, or `retired`; published releases may contain draft
  edges for unresolved relationships but only reviewed/approved active objectives.
- Removing or changing an active objective requires a graph version bump and a migration
  impact report describing learner-progress consequences.

## Edge semantics

- `prerequisite_for` points from prerequisite to dependent objective.
- A hard gate has `metadata.gate = "hard"`, weight `1.0` (the imported engine's
  executable `MASTERY_THRESHOLDS_DEFAULT.hardGateThreshold`), high confidence, and an
  explicit rationale. It means the learner genuinely cannot proceed safely without it.
- A soft relationship uses `supports`, has `metadata.gate = "soft"`, and never gates
  readiness regardless of weight.
- Unresolved prerequisite proposals remain draft and cannot gate a published release.
- `transfers_to` is reserved for distinct domains and cannot represent reuse inside the
  Codecamp graph.

## Priority and review

Objective priority is `must`, `should`, or `could`. Reviewer roles are:

- graph owner: identity, topology, lifecycle, and migration safety;
- curriculum owner: granularity, sequencing, language, and learner appropriateness;
- technical maintainer: correctness of technology and professional-workflow objectives;
- standards reviewer: projection accuracy only, without ownership of product objectives.

Every release records these roles, review outcomes, version provenance, and source
revision. No generator or runtime process may mutate the committed graph.
