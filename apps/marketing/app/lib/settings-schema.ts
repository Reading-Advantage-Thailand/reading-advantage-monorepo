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
  .record(z.string(), z.string())
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one setting entry is required",
  });

export type SettingsPostBody = z.infer<typeof settingsPostSchema>;