import * as z from 'zod';
export const userDeleteManyResultSchema = z.object({
  count: z.number()
});