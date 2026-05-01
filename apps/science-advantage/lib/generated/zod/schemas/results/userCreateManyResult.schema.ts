import * as z from 'zod';
export const userCreateManyResultSchema = z.object({
  count: z.number()
});