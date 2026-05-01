import * as z from 'zod';
export const StandardDeleteManyResultSchema = z.object({
  count: z.number()
});