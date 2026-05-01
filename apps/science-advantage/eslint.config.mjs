import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
const eslintConfig = [{
  ignores: ["lib/generated/**"],
}, ...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/set-state-in-effect": "off",
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
  },
}, {
  files: [
    "prisma/seed-functions/**",
    "scripts/**",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
}];

export default eslintConfig;
