import { baseConfig, ignores } from "@reading-advantage/config/eslint";

const eslintConfig = [{ ignores: [...ignores] }, ...baseConfig];

export default eslintConfig;
