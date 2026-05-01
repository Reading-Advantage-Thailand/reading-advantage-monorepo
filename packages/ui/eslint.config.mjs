import baseConfig from "@reading-advantage/config/eslint";

export default [
  ...baseConfig,
  {
    ignores: ["dist/", "node_modules/", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "react/prop-types": "off",
    },
  },
];
