import * as z from 'zod';

// prettier-ignore
export const AssignmentResultSchema = z.object({
    id: z.string(),
    classId: z.string(),
    lessonId: z.string(),
    assignedAt: z.date(),
    dueAt: z.date().nullable(),
    assignedBy: z.string(),
    class: z.unknown(),
    lesson: z.unknown(),
    teacher: z.unknown(),
    createdAt: z.date()
}).strict();

export type AssignmentResultType = z.infer<typeof AssignmentResultSchema>;
