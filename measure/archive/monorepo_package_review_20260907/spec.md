# Monorepo Package Review

Evaluate every workspace app, package, and service for concrete defects and necessary improvements.
Use Astra with low reasoning for reviews. Use Sol with medium reasoning for implementation.
Apply the Ponytail Rules. Reuse existing implementations and dependencies.
Preserve existing work. Exclude speculative features, framework migrations, new provenance machinery, and production changes.

## Acceptance criteria

- Record an evaluation for each workspace unit.
- Support findings with source evidence and a concrete failure scenario.
- Implement confirmed, necessary fixes with focused regression tests.
- Review changes and run relevant tests, lint, and type checks.
- Record unresolved failures and environmental limits accurately.
