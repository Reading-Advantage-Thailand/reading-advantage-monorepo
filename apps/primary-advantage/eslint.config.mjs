import { baseConfig, ignores } from "@reading-advantage/config/eslint";

const eslintConfig = [
  { ignores: [...ignores, "prisma/generated/", "public/"] },
  ...baseConfig,
];

export default eslintConfig;
