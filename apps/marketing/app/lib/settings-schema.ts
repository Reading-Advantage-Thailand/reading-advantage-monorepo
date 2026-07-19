import { z } from "zod";

/**
 * Zod schema for `POST /api/settings` bodies.
 *
 * The settings table stores arbitrary key/value pairs. Values are encrypted
 * at rest by `apps/marketing/app/lib/encryption`; the wire format here is
 * a flat object of `Record<string, string>`. Non-object payloads and
 * non-string values are rejected before any DB insert.
 */
export const settingsPostSchema = z
  .record(z.string().min(1).max(100), z.string().max(8_192))
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one setting entry is required",
  })
  .refine((obj) => Object.keys(obj).length <= 20, {
    message: "At most 20 setting entries are allowed",
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
