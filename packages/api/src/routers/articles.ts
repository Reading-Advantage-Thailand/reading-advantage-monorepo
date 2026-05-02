import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc.js";
import {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
} from "@reading-advantage/domain/articles";

export const articlesRouter = router({
  list: publicProcedure
    .input(
      z.object({
        topic: z.string().optional(),
        cefrLevel: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(({ ctx, input }) => listArticles({ db: ctx.db, input })),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => getArticle({ db: ctx.db, input })),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        content: z.string().min(1),
        summary: z.string().optional(),
        level: z.number().optional(),
        cefrLevel: z.string().optional(),
        topic: z.string().optional(),
        image: z.string().url().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createArticle({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        content: z.string().min(1).optional(),
        summary: z.string().optional(),
        published: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      updateArticle({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),
});
