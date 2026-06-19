// Phase 7 ESLint `no-console` fixture — "bad" case.
//
// Contains a raw `console.log(...)` call. The project-wide
// `no-console: ['error', { allow: ['error', 'warn'] }]` rule
// (added by the Green role in `apps/science-advantage/eslint.config.mjs`)
// must flag this file as an error. The accompanying
// `eslint-no-console.test.ts` invokes the real `eslint` binary
// against this fixture (with `--no-ignore` to bypass the
// `lib/observability/__tests__/fixtures/eslint/**` ignore entry
// that keeps the global `pnpm lint` clean) and asserts a non-zero
// exit code.
//
// Strategy reference:
//   measure/tracks/observability_stack_20260603/test-strategy.md §6 (Phase 7)
//     "Pin two micro-fixtures ... `bad.ts` containing `console.log('x')` ..."
//   measure/tracks/observability_stack_20260603/test-strategy.md §7 (Phase 7)
//     "command-construction proof — bounded to two fixture files, never
//      invokes full `pnpm lint` so it cannot mask other lint failures"
//   measure/tracks/observability_stack_20260603/test-strategy.md §8
//     "The Phase 7 eslint fixture files ... are excluded from app linting
//      via `eslint.config.mjs` `ignores: ['lib/observability/__tests__/fixtures/eslint/**']`"
//
// Keep this file minimal: the rule only inspects `console.*` calls,
// so a single `console.log` line is the smallest faithful proxy for
// the legacy `console.{log,info,debug}` sites the Phase 8 migration
// will replace.
console.log("phase7-bad-fixture-console-log");
