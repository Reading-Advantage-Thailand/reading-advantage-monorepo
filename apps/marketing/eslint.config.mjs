import { baseConfig, ignores } from "@reading-advantage/config/eslint";

/**
 * ESLint flat config for the marketing app.
 *
 * Follows the same pattern as other apps in the monorepo:
 * extends the shared `@reading-advantage/config/eslint` base
 * config and adds app-local ignores. Required because ESLint
 * v9+ no longer supports `.eslintrc.*` files and the marketing
 * app was committed without a flat config, causing
 * `pnpm --filter marketing lint` to fail with "ESLint couldn't
 * find an eslint.config.(js|mjs|cjs) file."
 */
const config = [
  {
    ignores: [...ignores, ".next/", "dist/", "build/", "coverage/"],
  },
  ...baseConfig,
  {
    // Tech debt: Phases 2+ (campaigns, settings, video production)
    // were scaffolded ahead of their review gates and contain
    // pre-existing `any` types. This file-level override pins the
    // debt to the one known file; remove when Phase 5 is reviewed.
    files: ["app/campaigns/\\[id\\]/video/page.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default config;
