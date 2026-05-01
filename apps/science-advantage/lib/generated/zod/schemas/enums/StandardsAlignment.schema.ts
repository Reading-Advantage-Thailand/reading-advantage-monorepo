import * as z from 'zod';

export const StandardsAlignmentSchema = z.enum(['THAI', 'NGSS'])

export type StandardsAlignment = z.infer<typeof StandardsAlignmentSchema>;