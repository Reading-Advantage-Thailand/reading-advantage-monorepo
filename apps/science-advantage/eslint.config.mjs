import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * ESLint flat config for science-advantage.
 *
 * Phase 7 (FR-7): adds the `no-console` rule to prevent raw `console.*`
 * calls in production code. The logger sinks (`lib/observability/logger.ts`
 * for server logs and `components/client-logger.ts` for dev-only client logs)
 * are the only files permitted to use `console.{error,warn,info,debug}` —
 * all other source files must use the {@link logger} or {@link clientLogger} APIs.
 *
 * @see measure/tracks/observability_stack_20260603/spec.md FR-7
 */
const eslintConfig = [{
  ignores: [
    "lib/generated/**",
    // Phase 7 (FR-7): keep ESLint micro-fixtures out of global lint
    // (linted via targeted `--no-ignore` invocation in the
    // `eslint-no-console.test.ts` contract test).
    "lib/observability/__tests__/fixtures/eslint/**",
  ],
}, ...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/set-state-in-effect": "off",
    // Phase 7 (FR-7): forbid raw `console.log` / `console.info` /
    // `console.debug`.  `console.error` and `console.warn` are
    // permitted so the logger sinks (`lib/observability/logger.ts`
    // and `components/client-logger.ts`) are not flagged.  Phase 8d
    // migrated proxy.ts to `logger.error`; the grep gate enforces
    // zero `console.*` outside the sinks.
    "no-console": ["error", { allow: ["error", "warn"] }],
  },
}, {
  // Phase 7 (FR-7): `lib/observability/logger.ts` is the server-side
  // sink — its `emit()` function routes `logger.info(...)` →
  // `console.info(line)`.
  files: ["lib/observability/logger.ts"],
  rules: {
    "no-console": "off",
  },
}, {
  // Phase 8 (FR-8): `components/client-logger.ts` is the browser-side
  // sink — it no-ops in production and emits to `console.*` in development.
  files: ["components/client-logger.ts"],
  rules: {
    "no-console": "off",
  },
}, {
  files: [
    "**/*.{test,spec}.ts?(x)",
    "**/*.integration.test.ts?(x)",
    "tests/**",
    "**/__tests__/**",
    "**/__mocks__/**"
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    // Phase 7 (FR-7): test files may freely use `console.*` for
    // debugging, log capture assertions, and fixture verification.
    "no-console": "off",
  },
}, {
  files: [
    "scripts/**",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    // Phase 8: scripts are CLI tools that legitimately use console.*
    // for user-facing output. FR-8 scope is app/ + lib/ + components/ +
    // proxy.ts only; scripts/ is out of scope per spec line 199.
    "no-console": "off",
  },
}, {
  // Phase 8: test infrastructure files (not matched by *.test.ts
  // patterns) that legitimately use console.log for setup diagnostics.
  files: [
    "vitest.integration.global-setup.ts",
  ],
  rules: {
    "no-console": "off",
  },
}, {
  // Phase 7 (FR-7): re-enable `no-console` for the ESLint
  // micro-fixtures.  The fixtures live under `__tests__/` so the
  // test-file block above disables the rule, but the contract test
  // (`eslint-no-console.test.ts`) must exercise the real rule
  // against `bad.ts`.  This block is placed last so it takes
  // precedence over the `**/__tests__/**` match.
  files: ["lib/observability/__tests__/fixtures/eslint/**"],
  rules: {
    "no-console": ["error", { allow: ["error", "warn"] }],
  },
}];

export default eslintConfig;
