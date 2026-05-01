import * as z from 'zod';

import { StandardsAlignmentSchema } from '../../enums/StandardsAlignment.schema';
// prettier-ignore
export const ClassModelSchema = z.object({
    id: z.string(),
    name: z.string().min(3).max(100).trim(),
    gradeLevel: z.number().int().int().min(3).max(6),
    standardsAlignment: StandardsAlignmentSchema,
    joinCode: z.string(),
    teacherId: z.string(),
    teacher: z.unknown(),
    students: z.array(z.unknown()),
    curriculumUnits: z.array(z.unknown()),
    assignments: z.array(z.unknown()),
    createdAt: z.date(),
    updatedAt: z.date()
}).strict();

export type ClassPureType = z.infer<typeof ClassModelSchema>;
