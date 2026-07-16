# Phase 2 Expected Red Verification

## Command

```bash
CI=true ./node_modules/.bin/vitest run packages/architecture-enforcement/src/__tests__
```

The command ran from the monorepo root and exited `1`, as required before the
Phase 3 analyzer and ratchet implementation exists.

## Failure signature

- Test files: 2 failed, 9 passed.
- Assertions: 25 failed, 56 passed, 81 total.
- Analyzer matrix: 21/21 named database/provider behavior assertions failed
  only because `packages/architecture-enforcement/src/analyzer.js` does not yet
  exist.
- Ratchet matrix: 4/5 behavior assertions failed only because
  `packages/architecture-enforcement/src/ratchet.js` does not yet exist.
- The ratchet wildcard/malformed-policy assertion already passes against the
  strict Phase 1 contracts.

All fixture loading, syntax parsing, ownership contracts, deterministic
inventory, baseline validation, workspace resolution, and existing tests
remained Green. Package type-check and ESLint also pass with the intentional
missing-module imports guarded by `@ts-expect-error`; those markers must be
removed when Phase 3 supplies the modules.

## Named analyzer coverage

The Red matrix names every required positive and negative case:

- database direct, path-alias, barrel, static dynamic import, raw
  client/SQL-route, webhook job-table, and worker job-table violations;
- exact PostgreSQL job-adapter and worker job-port allowances;
- provider direct, path-alias, barrel, static dynamic import, client
  construction, and credential-read violations;
- exact AI, storage, and GitHub adapter allowances;
- provider-neutral AI and storage interface allowances; and
- one exact reviewed test-path allowance.

Allowed fixtures require an empty finding collection across every rule, so a
different-rule violation cannot produce a false Green result.

## Named ratchet coverage

- same-semantic debt growth fails;
- deletion requires baseline reduction;
- a moved path retains the same semantic violation identity;
- wildcard and malformed policy fail closed; and
- diagnostics serialize identically when current findings are reordered.

The Phase 2 acceptance gate is satisfied: failures are caused by absent Phase 3
behavior, not malformed fixtures, path/cwd assumptions, parser errors, or test
setup failures.
