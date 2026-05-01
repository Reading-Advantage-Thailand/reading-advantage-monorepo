import * as z from 'zod';

import { StandardsAlignmentSchema } from '../../enums/StandardsAlignment.schema';
// prettier-ignore
export const CurriculumUnitInputSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    description: z.string().optional().nullable(),
    framework: StandardsAlignmentSchema,
    gradeLevel: z.number().int(),
    order: z.number().int(),
    lessons: z.array(z.unknown()),
    classId: z.string(),
    class: z.unknown(),
    createdAt: z.date(),
    updatedAt: z.date()
}).strict();

export type CurriculumUnitInputType = z.infer<typeof CurriculumUnitInputSchema>;
