import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunSelectObjectSchema as MasteryRunSelectObjectSchema } from './objects/MasteryRunSelect.schema';
import { MasteryRunIncludeObjectSchema as MasteryRunIncludeObjectSchema } from './objects/MasteryRunInclude.schema';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './objects/MasteryRunWhereUniqueInput.schema';

export const MasteryRunFindUniqueSchema: z.ZodType<Prisma.MasteryRunFindUniqueArgs> = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), where: MasteryRunWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.MasteryRunFindUniqueArgs>;

export const MasteryRunFindUniqueZodSchema = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), where: MasteryRunWhereUniqueInputObjectSchema }).strict();