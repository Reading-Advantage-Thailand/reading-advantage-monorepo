import { z } from "zod";

/**
 * The parts of a Workbooks lesson package (`~/Desktop/Workbooks/content/primary/<book>/*.json`,
 * schema `dashboard/lib/lesson-package/schema.ts`) that the importer reads. Other parts pass
 * through unchecked, so a package with new fields still imports.
 */

const timed = z.object({ text: z.string(), startTime: z.number(), endTime: z.number() });

export const lessonPackageSchema = z
  .object({
    version: z.number().optional(),
    meta: z
      .object({
        book: z.string().min(1),
        lesson: z.string().min(1),
        number: z.number().int().min(1),
        key: z.string().regex(/^[a-z0-9-]+\/\d+$/),
        title: z.string().min(1),
        raLevel: z.number().int(),
        cefrLevel: z.string().min(1),
        genre: z.string().optional(),
        appType: z.enum(["fiction", "nonfiction"]).optional(),
        role: z.enum(["workbook", "bank"]).default("workbook"),
        replaces: z.string().optional(),
        printed: z.object({ articleId: z.string().min(1) }).passthrough().optional(),
      })
      .passthrough(),
    text: z.object({ paragraphs: z.array(z.string()).min(1), summary: z.string() }).passthrough(),
    glossary: z.array(z.object({ word: z.string(), pos: z.string().optional(), definition: z.string(), thai: z.string().default(""), example: z.string().optional() })),
    bank: z.object({
      mcq: z.array(z.object({ id: z.string(), question: z.string(), options: z.array(z.string()), answer: z.string(), evidence: z.string().optional(), objectives: z.array(z.string()).optional() })),
      saq: z.array(z.object({ id: z.string(), question: z.string(), answer: z.string(), objectives: z.array(z.string()).optional() })),
      laq: z.array(z.object({ id: z.string(), question: z.string(), objectives: z.array(z.string()).optional() })),
    }),
    print: z.unknown().optional(),
    activities: z.unknown().optional(),
    thai: z
      .object({
        /** One array per paragraph; one English-Thai pair per sentence. */
        paragraphs: z.array(z.array(z.object({ en: z.string(), th: z.string() }))).default([]),
        summary: z.string().default(""),
      })
      .passthrough()
      .optional(),
    images: z.array(z.object({ position: z.string().optional(), prompt: z.string().optional(), caption: z.string().optional() }).passthrough()).default([]),
    audio: z
      .object({
        sentences: z.array(timed).default([]),
        wordTimes: z.array(timed).default([]),
        flashcardTimes: z.array(timed).default([]),
      })
      .passthrough()
      .optional(),
    tags: z.unknown().optional(),
    approval: z.record(z.string(), z.object({ status: z.string() }).passthrough()).optional(),
    db: z
      .object({
        legacy: z.object({ articleId: z.string().min(1) }).passthrough().optional(),
      })
      .passthrough()
      .default({}),
  })
  .passthrough();

/** A parsed lesson package. */
export type LessonPackage = z.infer<typeof lessonPackageSchema>;

/**
 * Parses a lesson package JSON value.
 * @param value The parsed JSON.
 * @returns The package.
 * @throws ZodError when a required part is missing.
 */
export function parseLessonPackage(value: unknown): LessonPackage {
  return lessonPackageSchema.parse(value);
}
