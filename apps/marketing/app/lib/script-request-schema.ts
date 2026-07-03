import { z } from "zod";
import { appEnum } from "@reading-advantage/db/schema";

/**
 * Zod schema for the `/api/video/generate-script` request body.
 *
 * Defense-in-depth: this schema sits in front of the LLM prompt builder so
 * unvalidated request bodies cannot reach the prompt. The topic field is
 * length-bounded to reject obviously oversized / prompt-injection-shaped
 * payloads (the Red test asserts a 60KB topic is rejected).
 */

const appEnumValues = appEnum.enumValues;

// 50KB cap on the topic string. Marketing topics are short narrative hooks;
// anything past 50KB is almost certainly a payload probe.
const MAX_TOPIC_LENGTH = 50_000;

const appField = z.enum(appEnumValues as [string, ...string[]]);

export const generateScriptSchema = z
  .object({
    app: appField,
    topic: z.string().min(1).max(MAX_TOPIC_LENGTH),
  })
  .strict();

export type GenerateScriptBody = z.infer<typeof generateScriptSchema>;