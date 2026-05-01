import * as z from 'zod';
export const sessionDeleteManyResultSchema = z.object({
  count: z.number()
});