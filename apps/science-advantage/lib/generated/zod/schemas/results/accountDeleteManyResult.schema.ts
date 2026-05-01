import * as z from 'zod';
export const accountDeleteManyResultSchema = z.object({
  count: z.number()
});