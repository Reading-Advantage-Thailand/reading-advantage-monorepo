import { z } from 'zod';

const basePracticeItemSchema = z.object({
  practiceItemId: z.string().trim().min(1),
  activityId: z.string().trim().min(1),
  variantKey: z.string().trim().min(1).optional(),
  objectiveId: z.string().trim().min(1).optional(),
  variantLabel: z.string().trim().min(1),
});

export const practiceItemSchema = basePracticeItemSchema
  .refine((d) => d.variantKey != null || d.objectiveId != null, {
    message: 'Either variantKey or objectiveId must be provided',
  })
  .transform((d) => ({
    practiceItemId: d.practiceItemId,
    activityId: d.activityId,
    variantKey: (d.variantKey ?? d.objectiveId)!,
    variantLabel: d.variantLabel,
  }));

export type PracticeItem = z.output<typeof practiceItemSchema>;
export type PracticeItemInput = z.input<typeof practiceItemSchema>;
