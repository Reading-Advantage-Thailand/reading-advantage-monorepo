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
          paths: [
            {
              name: "next/link",
              message:
                "Import { Link } from '@/locales/navigation' (or '@/i18n/navigation' after track link_localization_fix_20260525 Phase S3) so the current locale prefix is preserved on the rendered href. Raw next/link drops the locale on middle-click, copy-link, share, hard refresh, and SEO crawls.",
            },
          ],
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
  {
    // Allow the navigation shim itself to import next/link if ever needed.
    files: [
      "src/locales/navigation.ts",
      "src/i18n/navigation.ts",
      "src/components/common/localized-link.tsx",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];

export default eslintConfig;
