import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  { ignores: [".next/", "node_modules/"] },
  ...compat.extends("next/core-web-vitals"),
  ...compat.extends("next/typescript"),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/messages/**", "@/messages/**", "../messages/**", "./messages/**"],
              message:
                "Import from '@/locales' instead. The 'src/messages' directory has been deprecated in favor of 'src/locales' for translation management.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
