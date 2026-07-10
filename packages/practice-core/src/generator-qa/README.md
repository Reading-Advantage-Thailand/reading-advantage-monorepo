# Generator Correctness Harness

Location: `packages/practice-core/src/generator-qa/`

This harness verifies that math problem generators satisfy the correctness
contract (FR2–FR5). The harness core is **domain-neutral** — math-specific
oracles live in `math-content` or `app` layers.

## Plug-in Pattern

To add a new generator to the CI gate, register it in your test or gate
entry list:

```ts
import { runGeneratorGate } from '@reading-advantage/practice-core/generator-qa/gate';
import { myGenerator } from './my-generator';

const report = runGeneratorGate([
  { key: 'my-generator', gen: myGenerator },
]);
// report.exitCode === 0 means the generator passes all checks.
```

## Consumer Tracks

- **T17** — Core Algebra Generators
- **T18** — Advanced Math Generators
- **T19** — Geometry, Stats & Trig Generators

Each track authors generators that plug into this harness via the pattern
above. The CI gate (`npm run test:generators`) blocks merges when a
generator violates the contract.

## Boundary Rule

The harness core (`verifyGenerator`, `runGeneratorGate`) is domain-neutral.
Domain-specific oracles (e.g., algebraic equivalence, geometric validity)
belong in the `math-content` or app packages — not in `practice-core`.
