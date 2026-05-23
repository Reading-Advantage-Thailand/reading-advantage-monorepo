/**
 * Local replacements for Prisma's generated enum types.
 *
 * Track 3 (prisma_drizzle_science_controllers_20260505) removes the
 * `@prisma/client` runtime; these string-union types preserve the same
 * compile-time shape so we can swap the import without rewriting call sites.
 *
 * The string values match the Postgres enum literals defined in
 * `packages/db/src/schema/science.ts` (`framework`, `lessonType`, etc.).
 */

export const STANDARDS_ALIGNMENT_VALUES = ['THAI', 'NGSS'] as const;
export type StandardsAlignment = (typeof STANDARDS_ALIGNMENT_VALUES)[number];
export const StandardsAlignment = {
  THAI: 'THAI',
  NGSS: 'NGSS',
} as const satisfies Record<StandardsAlignment, StandardsAlignment>;

export const LESSON_TYPE_VALUES = ['LESSON', 'LAB', 'ASSESSMENT', 'REVIEW'] as const;
export type LessonType = (typeof LESSON_TYPE_VALUES)[number];
export const LessonType = {
  LESSON: 'LESSON',
  LAB: 'LAB',
  ASSESSMENT: 'ASSESSMENT',
  REVIEW: 'REVIEW',
} as const satisfies Record<LessonType, LessonType>;
