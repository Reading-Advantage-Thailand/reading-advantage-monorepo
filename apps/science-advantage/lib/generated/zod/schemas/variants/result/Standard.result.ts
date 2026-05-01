import * as z from 'zod';

import { StandardsAlignmentSchema } from '../../enums/StandardsAlignment.schema';
// prettier-ignore
export const StandardResultSchema = z.object({
    id: z.string(),
    framework: StandardsAlignmentSchema,
    code: z.string(),
    description: z.string(),
    gradeLevel: z.number().int().nullable(),
    lessons: z.array(z.unknown()),
    quizQuestions: z.array(z.unknown()),
    masteryRecords: z.array(z.unknown())
}).strict();

export type StandardResultType = z.infer<typeof StandardResultSchema>;
