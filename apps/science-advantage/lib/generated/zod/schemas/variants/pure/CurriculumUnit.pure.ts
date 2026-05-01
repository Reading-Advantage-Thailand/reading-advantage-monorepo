import * as z from 'zod';

import { StandardsAlignmentSchema } from '../../enums/StandardsAlignment.schema';
// prettier-ignore
export const CurriculumUnitModelSchema = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    framework: StandardsAlignmentSchema,
    gradeLevel: z.number().int(),
    order: z.number().int(),
    lessons: z.array(z.unknown()),
    classId: z.string(),
    class: z.unknown(),
    createdAt: z.date(),
    updatedAt: z.date()
}).strict();

export type CurriculumUnitPureType = z.infer<typeof CurriculumUnitModelSchema>;
