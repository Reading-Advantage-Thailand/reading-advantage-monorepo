import { baseConfig, plugins, ignores } from "@reading-advantage/config/eslint";
import globals from "globals";

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
    files: [
      "**/*.test.{js,jsx,ts,tsx}",
      "**/__tests__/**/*.{js,jsx,ts,tsx}",
      "**/__mocks__/**/*.{js,jsx,ts,tsx}",
      "jest.setup.ts",
      "jest.config.ts",
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
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
