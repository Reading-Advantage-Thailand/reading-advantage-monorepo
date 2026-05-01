import * as z from 'zod';
export const accountCreateManyResultSchema = z.object({
  count: z.number()
});