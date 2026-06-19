// Phase 7 ESLint `no-console` fixture — "good" case.
//
// Uses the `logger.info(...)` API instead of a raw `console.*`
// call. The project-wide `no-console: ['error', { allow: ['error', 'warn'] }]`
// rule (added by the Green role in `apps/science-advantage/eslint.config.mjs`)
// must NOT flag this file because no `console.*` method is invoked.
// The accompanying `eslint-no-console.test.ts` invokes the real
// `eslint` binary against this fixture (with `--no-ignore` to
// bypass the `lib/observability/__tests__/fixtures/eslint/**` ignore
// entry that keeps the global `pnpm lint` clean) and asserts an
// exit code of zero.
//
// Strategy reference:
//   measure/tracks/observability_stack_20260603/test-strategy.md §6 (Phase 7)
//     "Pin two micro-fixtures ... `good.ts` using `logger.info` ..."
//   measure/tracks/observability_stack_20260603/test-strategy.md §8
//     "The Phase 7 eslint fixture files ... are excluded from app linting
//      via `eslint.config.mjs` `ignores: ['lib/observability/__tests__/fixtures/eslint/**']`"
//
// Keep this file minimal: `logger` is intentionally undeclared so
// the fixture does not pull in real app code or trigger `import/*`
// resolvers. The ESLint TypeScript parser accepts the undeclared
// reference (no `no-undef` rule is active under the Next.js
// `nextTypescript` config; the per-test-file rule block also
// disables `no-unused-vars` / `no-explicit-any`).
logger.info("phase7-good-fixture-logger-info");
