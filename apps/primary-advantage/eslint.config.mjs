import { baseConfig, ignores } from "@reading-advantage/config/eslint";

const eslintConfig = [
  // legacy-sw.js is a byte copy of the live legacy service worker (see tests/pwa/fixtures/README.md).
  { ignores: [...ignores, "public/", "tests/pwa/fixtures/legacy-sw.js"] },
  ...baseConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // The console module is a Node-only shim. Importing it breaks client
      // bundles; server code must use the console global instead.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "console",
              message: "Import the console module breaks client bundles. Use the console global instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // The PWA fixture server runs in Node; the base config sets globals only for js/jsx/ts/tsx.
    files: ["tests/pwa/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", URL: "readonly", console: "readonly" } },
  },
];

export default eslintConfig;
