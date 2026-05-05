import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";

const eslintConfig = [
  {
    ignores: [
      ".next/",
      "node_modules/",
      "prisma/generated/",
      "coverage/",
      "public/",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
    },
  },
  // Testing library recommended config (flat format)
  {
    files: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
    ...testingLibrary.configs["flat/react"],
  },
  // Jest-dom recommended config (flat format)
  {
    files: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
    ...jestDom.configs["flat/recommended"],
  },
  // Relaxed rules for test files
  {
    files: [
      "**/*.{test,spec}.{ts,tsx,js,jsx}",
      "**/__tests__/**",
      "**/__mocks__/**",
      "**/tests/**",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Relaxed rules for seed/script files
  {
    files: [
      "prisma/seed-functions/**",
      "scripts/**",
      "prisma/seed.ts",
      "prisma/demo-seed.ts",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
