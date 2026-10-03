import { baseConfig, ignores } from "@reading-advantage/config/eslint";
import { plugin as shadcn } from "@shadcn/lint";

const eslintConfig = [
  { ignores: [...ignores, "scripts/", "e2e/", "revideo/"] },
  ...baseConfig,
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
    // Design-system rules (@shadcn/lint). Errors: the marketing UI has no violations.
    files: ["src/**/*.{tsx,jsx}"],
    ignores: ["src/**/*.test.tsx", "src/__tests__/**", "src/components/ui/**"],
    plugins: { shadcn },
    settings: {
      shadcn: {
        note: "See DESIGN.md and docs/design-rules.md for the design rules.",
      },
    },
    rules: {
      "shadcn/no-raw-colors": [
        "error",
        {
          message:
            'Use a theme color, not "{{className}}". Site neutrals: site-page, site-body, site-border, site-navy. Mastery states: mastery-mastered, mastery-here, mastery-ready, mastery-locked. Others: {{tokens}}. Add new colors to {{file}}.',
        },
      ],
      "shadcn/no-arbitrary-values": [
        "error",
        {
          message:
            'Do not use the arbitrary value "{{className}}". Use a scale class or a theme token. Site neutrals are site-page, site-body, site-border and site-navy. Declare a repeated value once in {{file}}.',
        },
      ],
      "shadcn/no-inline-styles": [
        "error",
        {
          allow: ["--*"],
          message:
            "Style with classes. Use an inline style only to set a CSS custom property or a value that is computed at run time.",
        },
      ],
      "shadcn/no-unknown-classes": "error",
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
