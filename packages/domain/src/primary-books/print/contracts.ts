import { z } from "zod";
import { legacyWorkbookLessonSchema } from "../../workbooks/legacy-workbook-importer.js";

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

/** The Workbooks lesson that the template renders. Keeps the fields that the shared schema does not list. */
const printWorkbookLessonSchema = legacyWorkbookLessonSchema
  .extend({
    /** Optional public URL of the writing practice page (QR code of the writing step). */
    writing_practice_url: z.string().optional(),
  })
  .passthrough();

/**
 * The print data of one lesson: the file that Workbooks exports to `content/primary/<book>/print/`.
 * `article_image_url` accepts a string or a list, as the legacy files carry both.
 */
export const printLessonSchema = z
  .object({
    /** Series name in the page header, for example "Origins 3.2". */
    seriesName: z.string().min(1),
    /** Level label of the series, for example "A0+". */
    seriesLevel: z.string().min(1),
    /** Lesson number in the book. */
    lessonNumber: z.number().int().positive(),
    /** Package key `<book>/<n>`, for example "o3-2/5". */
    packageKey: z.string().regex(/^[a-z0-9-]+\/\d+$/),
    /** The lesson that Workbooks `make-lesson-pdfs.ts` renders. */
    lesson: printWorkbookLessonSchema,
    /** The Workbooks commit of the export (the importer sets it from `--workbooks-commit`). */
    workbooksCommit: z.string().regex(/^[0-9a-f]{7,40}$/).optional(),
  })
  .refine((value) => value.packageKey.endsWith(`/${value.lessonNumber}`), {
    message: "lessonNumber does not match packageKey",
    path: ["lessonNumber"],
  });

export type PrintLesson = z.infer<typeof printLessonSchema>;

/** Locales of the Primary app. The template prints English, so the locale sets only `<html lang>`. */
export const PRINT_LOCALES = ["en", "th", "cn", "tw", "vi"] as const;

/** The input of `renderPrintLesson`: the print data of one lesson and the locale of the viewer. */
export const renderPrintLessonInputSchema = z.object({
  printLesson: printLessonSchema,
  locale: z.enum(PRINT_LOCALES).default("en"),
});

export type RenderPrintLessonInput = z.input<typeof renderPrintLessonInputSchema>;

/** The output of `renderPrintLesson`: one A4 HTML document for a sandboxed frame. */
export const renderPrintLessonOutputSchema = z.string().startsWith("<!DOCTYPE html>");
