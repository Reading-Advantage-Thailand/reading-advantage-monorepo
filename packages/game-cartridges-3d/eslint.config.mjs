import eslintConfig from "../config/eslint/index.js";

export default [
  ...eslintConfig,
  {
    // Phaser scene callbacks run with their own `this`; the views keep the scene in a local.
    files: ["src/**/view2d/**/*.ts"],
    rules: { "@typescript-eslint/no-this-alias": "off" },
  },
];
