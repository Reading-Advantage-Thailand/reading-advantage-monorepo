import { baseConfig, plugins, ignores } from "@reading-advantage/config/eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    plugins,
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      "no-constant-binary-expression": "warn",
      "no-undef": "warn",
      "react/no-unknown-property": "warn",
    },
  },
  {
    ignores: [
      ...ignores,
      "**/out/**",
      "**/build/**",
      "next-env.d.ts",
    ],
  },
];
