import { z } from "zod";

const workerStartupEnvironmentSchema = z
  .object({
    HOST: z.string().trim().min(1).default("0.0.0.0"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("production"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
    WORKER_SERVICE_NAME: z
      .string()
      .trim()
      .regex(/^[a-z0-9](?:[a-z0-9-]{0,62})$/)
      .default("reading-advantage-worker"),
    WORKER_SHUTDOWN_GRACE_MS: z.coerce
      .number()
      .int()
      .min(1)
      .max(300_000)
      .default(10_000),
  })
  .transform((environment) => ({
    environment: environment.NODE_ENV,
    host: environment.HOST,
    port: environment.PORT,
    serviceName: environment.WORKER_SERVICE_NAME,
    shutdownGraceMs: environment.WORKER_SHUTDOWN_GRACE_MS,
  }));

/** Validated process configuration needed to start the worker health bootstrap. */
export interface WorkerStartupConfig {
  /** Runtime environment controlling development and production behavior. */
  environment: "development" | "test" | "production";
  /** Network interface used by the health server. */
  host: string;
  /** HTTP port exposed by the worker container. */
  port: number;
  /** Stable service identifier included in health responses and logs. */
  serviceName: string;
  /** Maximum time reserved for a future graceful worker drain. */
  shutdownGraceMs: number;
}

/**
 * Validates untrusted process environment values for worker startup.
 * @param environment Process environment values to validate.
 * @returns A provider-neutral worker startup configuration.
 * @throws When a required value is malformed or outside its safe bounds.
 */
export function parseWorkerStartupConfig(
  environment: Readonly<Record<string, string | undefined>>,
): WorkerStartupConfig {
  const result = workerStartupEnvironmentSchema.safeParse(environment);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid worker startup configuration: ${issues}`);
  }

  return Object.freeze(result.data);
}
