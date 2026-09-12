import { z } from "zod";

import { roomStoreConfigSchema, type RoomStoreConfig } from "./room-store.js";

/** Strict env-derived configuration for the session service bootstrap. */
export const sessionServiceConfigSchema = z
  .object({
    host: z.string().min(1).default("0.0.0.0"),
    port: z.coerce.number().int().min(0).max(65535).default(8080),
    store: roomStoreConfigSchema,
  })
  .strict();

/** The strict session-service configuration union. */
export type SessionServiceConfig = z.infer<typeof sessionServiceConfigSchema>;

/**
 * Parses the session service bootstrap from process environment values.
 * @param env The process environment to read.
 * @returns The validated service configuration.
 * @throws When the environment fails validation, including a redis store
 * selection without REDIS_URL.
 */
export function parseSessionServiceConfig(
  env: NodeJS.ProcessEnv,
): SessionServiceConfig {
  const store: RoomStoreConfig =
    env.SESSION_STORE === "redis"
      ? {
          kind: "redis",
          redisUrl: env.REDIS_URL ?? "",
          ...(env.SESSION_ROOM_KEY_PREFIX
            ? { keyPrefix: env.SESSION_ROOM_KEY_PREFIX }
            : {}),
        }
      : {
          kind: "memory",
          ...(env.SESSION_ROOM_KEY_PREFIX
            ? { keyPrefix: env.SESSION_ROOM_KEY_PREFIX }
            : {}),
        };
  return sessionServiceConfigSchema.parse({
    host: env.HOST,
    port: env.PORT,
    store,
  });
}
