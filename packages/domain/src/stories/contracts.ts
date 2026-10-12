import { z } from "zod";

/** Stories on one page of the shelf (legacy shows 10). */
export const STORIES_PAGE_SIZE = 10;

/** Input of `listPrimaryStories`: the genre, a title or topic search, and the page (from 1). */
export const listPrimaryStoriesInputSchema = z.object({
  genre: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.number().int().min(1).max(10_000).default(1),
});

export type ListPrimaryStoriesInput = z.input<typeof listPrimaryStoriesInputSchema>;

/** One book on the shelf. `imageKey` is `image ?? id`; the cover is `images/story/<imageKey>.png`. */
export const storyCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  genre: z.string().nullable(),
  raLevel: z.number().int().nullable(),
  cefrLevel: z.string().nullable(),
  imageKey: z.string(),
});

export type StoryCard = z.infer<typeof storyCardSchema>;

/** Output of `listPrimaryStories`: the page of cards, the match count, and the genres to filter by. */
export const listPrimaryStoriesOutputSchema = z.object({
  stories: z.array(storyCardSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  genres: z.array(z.string()),
});

export type ListPrimaryStoriesOutput = z.infer<typeof listPrimaryStoriesOutputSchema>;
