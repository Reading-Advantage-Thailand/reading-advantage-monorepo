import { baseConfig, ignores } from "@reading-advantage/config/eslint";

const eslintConfig = [
  { ignores: [...ignores, "prisma/generated/", "public/"] },
  ...baseConfig,
  {
    // Jest hoists jest.mock() factory calls to the top of the module and
    // requires the referenced module-scope mock handles to be declared with
    // `var` so they are also hoisted; using `let`/`const` triggers a TDZ
    // ReferenceError inside the mock factory. Allow `no-var` in Wave 1
    // Phase 2 test scaffolding where this pattern is used deliberately.
    files: [
      "__tests__/**/*.test.ts",
      "__tests__/**/*.test.tsx",
    ],
    rules: {
      "no-var": "off",
    },
  },
];

export default eslintConfig;
