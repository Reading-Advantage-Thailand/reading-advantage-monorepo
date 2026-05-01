import * as z from 'zod';
export const sessionCreateManyResultSchema = z.object({
  count: z.number()
});