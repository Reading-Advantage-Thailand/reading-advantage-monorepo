import * as z from 'zod';

import { LessonTypeSchema } from '../../enums/LessonType.schema';
// prettier-ignore
export const LessonModelSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    titleThai: z.string().nullable(),
    description: z.string().nullable(),
    descriptionThai: z.string().nullable(),
    content: z.string().nullable(),
    structuredContent: z.unknown().nullable(),
    lessonType: LessonTypeSchema,
    gradeLevel: z.number().int(),
    order: z.number().int(),
    standards: z.array(z.unknown()),
    curriculumUnits: z.array(z.unknown()),
    quizQuestions: z.array(z.unknown()),
    attempts: z.array(z.unknown()),
    lessonCompletions: z.array(z.unknown()),
    assignments: z.array(z.unknown()),
    createdAt: z.date(),
    updatedAt: z.date()
}).strict();

export type LessonPureType = z.infer<typeof LessonModelSchema>;
