import * as z from 'zod';
export const userUpdateManyResultSchema = z.object({
  count: z.number()
});