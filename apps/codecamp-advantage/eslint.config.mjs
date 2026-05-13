import { baseConfig, ignores } from "@reading-advantage/config/eslint";

const eslintConfig = [
  { ignores: [".next/", "node_modules/", "coverage/", "public/"] },
  ...baseConfig,
  { ignores },
];

export default eslintConfig;
