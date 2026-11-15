import { baseConfig, ignores } from "@reading-advantage/config/eslint";

const eslintConfig = [
  {
    ignores: [
      ...ignores,
      "public/",
      // Built legacy service-worker fixture: minified browser code on purpose.
      "tests/pwa/fixtures/",
    ],
  },
  ...baseConfig,
  {
    // The PWA fixture server runs in Node, so the Node globals are defined here.
    files: ["tests/pwa/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly",
      },
    },
  },
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
];

export default eslintConfig;
