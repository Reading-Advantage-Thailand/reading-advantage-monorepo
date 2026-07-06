/**
 * Centralized, Zod-validated environment variable accessor for
 * the reading-advantage app.
 *
 * Reading-advantage forbids raw `process.env.X` reads anywhere outside
 * this module (enforced by `__tests__/controllers/env-reads-guard-red.test.ts`).
 *
 * The export is a lazy Proxy that reads `process.env` on every property
 * access. This lets tests mutate `process.env` between assertions without
 * forcing every consumer to invalidate a cache.
 *
 * ```ts
 * import { env } from "@/lib/env";
 * const url = env.NEXT_PUBLIC_BASE_URL;
 * ```
 */

import { z } from "zod";

// A string-or-undefined helper that treats empty-string env vars as unset.
// This matches Node's behavior and keeps tests that write `process.env.X = ""`
// behaving the same as `delete process.env.X`.
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const envSchema = z.object({
  // Authentication / scheduler
  ACCESS_KEY: optionalString,
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PHASE: optionalString,

  // Public base URL — used by client-side fetchers. May be unset in tests.
  NEXT_PUBLIC_BASE_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  NEXT_PUBLIC_BASE_PATH: optionalString,

  // External services
  DISCORD_WEBHOOK_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  RESEND_API_KEY: optionalString,
  RESEND_FROM: optionalString,

  // Google Cloud / TTS
  GOOGLE_CLOUD_PROJECT_ID: optionalString,
  GOOGLE_PROJECT_ID: optionalString,
  GOOGLE_APPLICATION_CREDENTIALS: optionalString,
  GOOGLE_TEXT_TO_SPEECH_API_KEY: optionalString,
});

export type Env = z.infer<typeof envSchema>;

const ENV_KEYS = Object.keys(envSchema.shape) as (keyof Env)[];

function readEnv(): Env {
  const raw = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key as string]]),
  );
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `[env] Invalid environment configuration: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

/**
 * Lazy environment accessor. Every property read re-parses `process.env`
 * via the Zod schema above. Tests that mutate `process.env` between calls
 * will see the new value on the next read.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop) {
    if (typeof prop !== "string") return undefined;
    const snapshot = readEnv();
    return snapshot[prop as keyof Env];
  },
});