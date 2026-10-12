import { z } from "zod";

/** Allowed font file names of the print kit: Fontsource woff2 files and their OFL texts. */
export const PRINT_FONT_FILE = /^(?:[a-z-]+-(?:latin|thai)-\d{3}-(?:normal|italic)\.woff2|OFL-[a-z-]+\.txt)$/;

/** Workbooks paths that the print kit copies. A directory ends with a slash. */
export const PRINT_KIT_PATHS = {
  template: "dashboard/templates/primary_template.html",
  icons: "dashboard/lib/document-wrapper/icons.ts",
  styles: "dashboard/lib/document-wrapper/styles.ts",
  utils: "dashboard/lib/document-wrapper/utils.ts",
  fontsDir: "dashboard/assets/print-fonts/",
} as const;

/** Theme placeholders in the kit CSS. The renderer replaces them with the series colors. */
export const PRINT_THEME_TOKENS = {
  primary: "__THEME_PRIMARY__",
  secondary: "__THEME_SECONDARY__",
  gradient: "__THEME_GRADIENT__",
} as const;

/** The print kit: the Workbooks primary template and its support files at one Workbooks commit. */
export const printKitSchema = z.object({
  /** Handlebars source of the primary template. */
  template: z.string().min(1),
  /** TypeScript source of the Lucide icon map (keeps its ISC header). */
  iconsSource: z.string().min(1),
  /** TypeScript source of the shared helpers (theme colors, HTML escape). */
  utilsSource: z.string().min(1),
  /** Print CSS of `getPrintStyles` for A4 with no cover, with theme placeholders. */
  css: z.string().min(1),
  /** File names in `public/print-fonts/`. */
  fonts: z.array(z.string().regex(PRINT_FONT_FILE)).min(1),
  sourceRepo: z.string().min(1),
  commit: z.string().regex(/^[0-9a-f]{40}$/),
  commitDate: z.string().min(1),
});

export type PrintKit = z.infer<typeof printKitSchema>;
