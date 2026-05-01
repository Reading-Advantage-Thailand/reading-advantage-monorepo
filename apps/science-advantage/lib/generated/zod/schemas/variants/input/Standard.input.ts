import * as z from 'zod';

import { StandardsAlignmentSchema } from '../../enums/StandardsAlignment.schema';
// prettier-ignore
export const StandardInputSchema = z.object({
    id: z.string(),
    framework: StandardsAlignmentSchema,
    code: z.string(),
    description: z.string(),
    gradeLevel: z.number().int().optional().nullable(),
    lessons: z.array(z.unknown()),
    quizQuestions: z.array(z.unknown()),
    masteryRecords: z.array(z.unknown())
}).strict();

export type StandardInputType = z.infer<typeof StandardInputSchema>;
