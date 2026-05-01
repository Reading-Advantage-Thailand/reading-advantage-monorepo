import * as z from 'zod';
export const verificationDeleteManyResultSchema = z.object({
  count: z.number()
});