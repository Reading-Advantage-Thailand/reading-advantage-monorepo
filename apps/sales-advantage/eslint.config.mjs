import { baseConfig, ignores } from "@reading-advantage/config/eslint";

const eslintConfig = [
  { ignores: [".next/", "node_modules/", "coverage/", "public/"] },
  ...baseConfig,
  {
    files: ["scripts/**/*.{js,mjs,ts}"],
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
        queueMicrotask: "readonly",
        fetch: "readonly",
      },
    },
  },
  { ignores },
];

export default eslintConfig;
