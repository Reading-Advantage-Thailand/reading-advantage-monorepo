import { z } from "zod";

/**
 * Zod schema for `POST /api/settings` bodies.
 *
 * The settings page writes exactly four keys: `llm.provider`, `llm.model`,
 * `llm.apiKey`, and `tools.mmxPath`. The route persists those keys into the
 * shared `settings` table, so the contract rejects any other key. Values
 * are encrypted at rest by `apps/marketing/app/lib/encryption`; the wire
 * format is a flat object of `Record<string, string>`. Non-object payloads,
 * unknown keys, and non-string values are rejected before any DB insert.
 */
const MARKETING_SETTING_VALUE_SCHEMA = z.string().max(8_192);

export const settingsPostSchema = z
  .strictObject({
    "llm.provider": MARKETING_SETTING_VALUE_SCHEMA.optional(),
    "llm.model": MARKETING_SETTING_VALUE_SCHEMA.optional(),
    "llm.apiKey": MARKETING_SETTING_VALUE_SCHEMA.optional(),
    "tools.mmxPath": MARKETING_SETTING_VALUE_SCHEMA.optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one setting entry is required",
  });

export type SettingsPostBody = z.infer<typeof settingsPostSchema>;

/** Zod contract for administrator-only LLM connection test requests. */
export const settingsTestConnectionSchema = z.strictObject({
  provider: z.enum(["google", "openai", "openrouter"]),
  modelName: z.string().trim().min(1).max(200),
  apiKey: z.string().trim().min(1).max(2_048),
});

/** Validated administrator connection-test payload. */
export type SettingsTestConnectionBody = z.infer<
  typeof settingsTestConnectionSchema
>;
