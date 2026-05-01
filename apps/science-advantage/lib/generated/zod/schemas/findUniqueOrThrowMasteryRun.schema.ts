import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunSelectObjectSchema as MasteryRunSelectObjectSchema } from './objects/MasteryRunSelect.schema';
import { MasteryRunIncludeObjectSchema as MasteryRunIncludeObjectSchema } from './objects/MasteryRunInclude.schema';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './objects/MasteryRunWhereUniqueInput.schema';

export const MasteryRunFindUniqueOrThrowSchema: z.ZodType<Prisma.MasteryRunFindUniqueOrThrowArgs> = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), where: MasteryRunWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.MasteryRunFindUniqueOrThrowArgs>;

export const MasteryRunFindUniqueOrThrowZodSchema = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), where: MasteryRunWhereUniqueInputObjectSchema }).strict();