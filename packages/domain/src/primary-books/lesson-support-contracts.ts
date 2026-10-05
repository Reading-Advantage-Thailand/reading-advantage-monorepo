import { z } from "zod";
import { classBookSchema } from "./class-book-contracts.js";

/** One workbook step of the teacher guide (FR-8), in one language. */
export const lessonGuideStepSchema = z.object({
  step: z.number().int().min(1).max(13),
  title: z.string(),
  period: z.number().int().min(1).max(4),
  teacherActions: z.array(z.string()),
  teacherLanguage: z.array(z.string()),
  studentActions: z.array(z.string()),
  watchFor: z.array(z.string()),
  /** The long scripted segment, Markdown, or null. */
  scriptMd: z.string().nullable(),
});
export type LessonGuideStep = z.infer<typeof lessonGuideStepSchema>;

/** The guide steps of one period. */
export const lessonGuidePeriodSchema = z.object({ period: z.number().int(), steps: z.array(lessonGuideStepSchema) });
export type LessonGuidePeriod = z.infer<typeof lessonGuidePeriodSchema>;

/** One glossary word of a lesson package. */
export const glossaryWordSchema = z.object({ word: z.string(), pos: z.string().optional(), definition: z.string().optional(), thai: z.string().optional(), example: z.string().optional() }).passthrough();

/** The question bank of a lesson package (the answer key, FR-12). */
export const lessonBankSchema = z.object({
  mcq: z.array(z.object({ id: z.string().optional(), question: z.string(), options: z.array(z.string()), answer: z.string(), evidence: z.string().optional() }).passthrough()).default([]),
  saq: z.array(z.object({ id: z.string().optional(), question: z.string(), answer: z.string().optional() }).passthrough()).default([]),
  laq: z.array(z.object({ id: z.string().optional(), question: z.string() }).passthrough()).default([]),
});

/** The print activities of a lesson package (the answer key, FR-12). */
export const lessonActivitiesSchema = z
  .object({
    vocabFill: z.array(z.object({ sentence: z.string(), answer: z.string() })).optional(),
    sentenceOrder: z.array(z.string()).optional(),
    sentenceCompletion: z.array(z.string()).optional(),
    sentenceStarters: z.array(z.string()).optional(),
    writingPrompt: z.string().optional(),
    writingFrames: z.array(z.string()).optional(),
  })
  .passthrough();

/** One lesson as the teacher pages show it: the catalogue row, the article text, and the key. */
export const teacherLessonSchema = z.object({
  classBook: classBookSchema,
  lesson: z.object({ number: z.number().int(), title: z.string(), key: z.string(), articleId: z.string().nullable(), approved: z.boolean() }),
  /** The article text (projector, FR-11), or null until the lesson is linked to an article. */
  article: z.object({ title: z.string(), paragraphs: z.array(z.string()) }).nullable(),
  glossary: z.array(glossaryWordSchema),
  bank: lessonBankSchema,
  activities: lessonActivitiesSchema.nullable(),
  summary: z.string().nullable(),
  thaiSummary: z.string().nullable(),
  /** Workbook steps the class has done in this lesson. */
  stepsDone: z.array(z.number().int()),
});
export type TeacherLesson = z.infer<typeof teacherLessonSchema>;

/** A lesson resolved from a printed QR link (FR-16). */
export const bookLessonRefSchema = z.object({
  bookId: z.string(),
  bookKey: z.string(),
  bookName: z.string(),
  number: z.number().int(),
  title: z.string(),
  articleId: z.string().nullable(),
  approved: z.boolean(),
});
export type BookLessonRef = z.infer<typeof bookLessonRefSchema>;
