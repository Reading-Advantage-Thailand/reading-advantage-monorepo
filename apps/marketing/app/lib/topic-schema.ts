import { z } from "zod";
import { appEnum } from "@reading-advantage/db/schema";

/**
 * Zod schemas for the `/api/video/save-topics` and
 * `/api/video/research-topics` route bodies.
 *
 * The `app` field must be one of the marketing app enum values (driven by
 * `packages/db/src/schema/marketing.ts`). The `topics` array on save must
 * be a list of non-empty strings.
 */

const appEnumValues = appEnum.enumValues;

const appField = z.enum(appEnumValues as [string, ...string[]]);

export const saveTopicsSchema = z
  .object({
    app: appField,
    topics: z.array(z.string().trim().min(1).max(500)).min(1).max(25),
  })
  .strict();

/** A validated approved-topic persistence request. */
export type SaveTopicsBody = z.infer<typeof saveTopicsSchema>;

export const researchTopicsSchema = z
  .object({
    app: appField,
  })
  .strict();

/** A validated topic-research request. */
export type ResearchTopicsBody = z.infer<typeof researchTopicsSchema>;

/** Validates the untrusted AI response for topic research. */
export const researchedTopicListSchema = z
  .array(z.string().trim().min(1).max(500))
  .min(1)
  .max(25);

/** A validated candidate topic list returned by the AI adapter. */
export type ResearchedTopicList = z.infer<typeof researchedTopicListSchema>;
