import { baseConfig, ignores } from "@reading-advantage/config/eslint";

const eslintConfig = [
  { ignores: [...ignores, "prisma/generated/", "public/"] },
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
];

export default eslintConfig;
