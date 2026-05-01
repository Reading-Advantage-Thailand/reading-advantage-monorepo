import * as z from 'zod';
export const StandardCreateManyResultSchema = z.object({
  count: z.number()
});