import { baseConfig, ignores } from "@reading-advantage/config/eslint";

export default [
  { ignores: [".next/", "node_modules/", "coverage/"] },
  ...baseConfig,
  { ignores },
];
