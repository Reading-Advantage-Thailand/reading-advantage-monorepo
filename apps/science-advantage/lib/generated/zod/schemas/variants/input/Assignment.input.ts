import * as z from 'zod';

// prettier-ignore
export const AssignmentInputSchema = z.object({
    id: z.string(),
    classId: z.string(),
    lessonId: z.string(),
    assignedAt: z.date(),
    dueAt: z.date().optional().nullable(),
    assignedBy: z.string(),
    class: z.unknown(),
    lesson: z.unknown(),
    teacher: z.unknown(),
    createdAt: z.date()
}).strict();

export type AssignmentInputType = z.infer<typeof AssignmentInputSchema>;
