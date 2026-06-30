import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/** Exported plugins for apps that need to add plugin-scoped rules. */
export const plugins = {
  react,
  "react-hooks": reactHooks,
};

/** Base ESLint config for TypeScript + React packages and apps. */
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: true,
        JSX: true,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      // Redundant in a TypeScript codebase — prop shapes are type-checked.
      "react/prop-types": "off",
      // Allow custom canvas/renderer props (react-konva, revideo, etc.).
      "react/no-unknown-property": "off",
      // Surface `any` usage without failing builds on it.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Legacy-tolerance rules: kept visible as warnings rather than hard
      // errors so the shared config is satisfiable across all apps. Tighten
      // to "error" per-rule as the codebases are cleaned up.
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-wrapper-object-types": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-duplicate-enum-values": "warn",
      "no-empty": "warn",
      "no-empty-pattern": "warn",
      "prefer-const": "warn",
      "no-useless-escape": "warn",
      "no-case-declarations": "warn",
      "no-self-assign": "warn",
      "no-prototype-builtins": "warn",
      "no-constant-binary-expression": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];

/** Default ignores for monorepo apps/packages. */
export const ignores = [
  "**/node_modules/**",
  "**/.next/**",
  "**/dist/**",
  "**/coverage/**",
];

/** Default export for backward compatibility. */
export default [
  ...baseConfig,
  { ignores },
];
