# Phase S2 Test Strategy: Curriculum Bindings

## Scope and protected sources

The current Codecamp seed remains the read-only curriculum authority for this phase.
Its dirty in-progress edits are not modified. A deterministic package-local generator
reads the four phase exports and produces a reviewed binding snapshot owned by
`@reading-advantage/codecamp-knowledge`.

Inventory baseline: 19 published modules, 88 lessons, 70 theory lessons, one explicit
exercise lesson, 17 quiz lessons, 16 embedded exercises, 85 quiz questions, 16 module
repositories, and four portfolio repositories.

## Red gates

1. Reject unknown binding, module-summary, provenance, and release fields.
2. Reject missing, retired, or wrong-version objective IDs.
3. Reject exposure resources with non-zero evidence weight or mastery projection.
4. Reject assessed activities without a variant family, misconception tags, rubric,
   practice mode, and positive bounded evidence weight.
5. Reject duplicate activity IDs and duplicate objective/variant/source evidence.
6. Preserve repeated quiz questions as one variant family rather than independent
   triangulation.
7. Fail coverage when any published lesson, question, exercise, or repository in the
   inventory is absent from bindings.
8. Report coverage by module, objective, practice mode, activity kind, evidence source,
   and unique variant family.
9. Require all 19 published modules and fail with module/activity diagnostics rather than
   silently dropping an unmapped source.

## Green gates

```bash
pnpm --filter @reading-advantage/codecamp-knowledge test
pnpm --filter @reading-advantage/codecamp-knowledge test:coverage
pnpm --filter @reading-advantage/codecamp-knowledge check-types
pnpm --filter @reading-advantage/codecamp-knowledge lint
pnpm --filter @reading-advantage/codecamp-knowledge build
pnpm --filter @reading-advantage/codecamp-knowledge bindings:validate
pnpm --filter @reading-advantage/codecamp-knowledge bindings:report
```

## Browser disposition

S2 authors and validates data contracts only; it does not change a learner or teacher
surface. Browser acceptance is N/A for S2. Browser verification becomes mandatory when
S4 publishes these bindings into the live Codecamp app.

