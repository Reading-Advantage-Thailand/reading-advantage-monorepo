import { baseConfig, ignores } from "@reading-advantage/config/eslint";

const eslintConfig = [
  { ignores: [".next/", "node_modules/", "coverage/", "public/"] },
  ...baseConfig,
  {
    // Node-only ESM scripts (post-build tooling, codegen, etc.). The base
    // config's `files` pattern only matches .js/.jsx/.ts/.tsx, so .mjs
    // scripts under `scripts/` get the small Node globals we need here and
    // the base no-undef + no-unused-vars rules.
    files: ["scripts/**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "writable",
        global: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        queueMicrotask: "readonly",
        fetch: "readonly",
      },
    },
  },
  { ignores },
];

export default eslintConfig;

