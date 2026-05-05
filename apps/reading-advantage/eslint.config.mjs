import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  {
    ignores: [
      ".next/",
      "node_modules/",
      "prisma/generated/",
      "coverage/",
      "public/",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
];

export default eslintConfig;
