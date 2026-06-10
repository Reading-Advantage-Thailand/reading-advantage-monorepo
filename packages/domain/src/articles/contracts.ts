import { z } from "zod";

export const createArticleInputSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  summary: z.string().optional(),
  level: z.number().int().optional(),
  cefrLevel: z.string().optional(),
  topic: z.string().optional(),
  image: z.string().optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleInputSchema>;

export const updateArticleInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  published: z.boolean().optional(),
});

export type UpdateArticleInput = z.infer<typeof updateArticleInputSchema>;

export const listArticlesInputSchema = z.object({
  topic: z.string().optional(),
  cefrLevel: z.string().optional(),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
});

export type ListArticlesInput = z.infer<typeof listArticlesInputSchema>;
