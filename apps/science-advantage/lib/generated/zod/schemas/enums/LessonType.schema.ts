import * as z from 'zod';

export const LessonTypeSchema = z.enum(['LESSON', 'LAB', 'ASSESSMENT', 'REVIEW'])

export type LessonType = z.infer<typeof LessonTypeSchema>;