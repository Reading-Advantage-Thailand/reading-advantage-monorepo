import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../trpc.js";
import { articles } from "@reading-advantage/db/schema";

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
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(articles)
        .limit(input.limit)
        .offset(input.offset);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [article] = await ctx.db
        .select()
        .from(articles)
        .where(eq(articles.id, input.id))
        .limit(1);

      if (!article) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
      }

      return article;
    }),

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
    .mutation(async ({ ctx, input }) => {
      const [article] = await ctx.db
        .insert(articles)
        .values(input)
        .returning();

      return article;
    }),

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
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const [updated] = await ctx.db
        .update(articles)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(articles.id, id))
        .returning();

      return updated;
    }),
});
