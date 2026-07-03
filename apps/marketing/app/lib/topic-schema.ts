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

export const saveTopicsSchema = z.object({
  app: appField,
  topics: z.array(z.string().min(1)).min(1),
});

export type SaveTopicsBody = z.infer<typeof saveTopicsSchema>;

export const researchTopicsSchema = z.object({
  app: appField,
});

export type ResearchTopicsBody = z.infer<typeof researchTopicsSchema>;