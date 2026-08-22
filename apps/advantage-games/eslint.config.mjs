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
      // TypeScript itself resolves identifiers, and no-undef cannot see type-only
      // names such as FrameRequestCallback. typescript-eslint documents turning it
      // off for TS files for exactly this reason.
      "no-undef": "off",
      "react/no-unknown-property": ["warn", { ignore: ["jsx", "global"] }],
    },
  },
  {
    // R3F scene files (convention: *Scene.tsx) render three.js intrinsic
    // elements whose props (position, args, attach, ...) are unknown to
    // react/no-unknown-property.
    files: ["src/components/games/**/*Scene.tsx"],
    rules: {
      "react/no-unknown-property": "off",
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
        ...globals.browser,
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
