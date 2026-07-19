import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { z } from "zod";

const environmentSchema = z.object({
  MARKETING_RELEASE_BASE_URL: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("https://"),
      "Marketing release URL must use HTTPS.",
    ),
});

const healthSchema = z.object({ status: z.literal("ok") });

const readinessSchema = z.object({
  status: z.literal("ready"),
  service: z.literal("marketing"),
  dependencies: z.object({
    database: z.literal("ready"),
    accounts: z.literal("ready"),
  }),
  requestId: z.string().min(1),
});

/** Inputs required to verify public Marketing release dependencies. */
export interface MarketingReleaseVerificationInput {
  /** HTTPS origin to verify. */
  readonly baseUrl: string;
}

/** Non-sensitive evidence returned after Marketing release checks succeed. */
export interface MarketingReleaseVerificationResult {
  /** Per-invocation correlation identifier. */
  readonly requestId: string;
  /** Checks completed against the release origin. */
  readonly checks: readonly ["health", "readiness"];
}

/**
 * Fetches and validates one public Marketing release response.
 * @param fetchImplementation Fetch implementation used for the request.
 * @param url Exact endpoint URL.
 * @param schema Runtime contract for the untrusted response body.
 * @param requestId Correlation identifier forwarded to the service.
 * @returns The validated response body.
 * @throws When transport, status, JSON parsing, or schema validation fails.
 */
async function fetchValidated<T>(
  fetchImplementation: typeof fetch,
  url: URL,
  schema: z.ZodType<T>,
  requestId: string,
): Promise<T> {
  const response = await fetchImplementation(url, {
    cache: "no-store",
    headers: { Accept: "application/json", "X-Request-Id": requestId },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`${url.pathname} returned HTTP ${response.status}.`);
  }
  return schema.parse(await response.json());
}

/**
 * Verifies public database health and Accounts-backed Marketing readiness.
 * @param input Marketing release origin.
 * @param fetchImplementation Fetch implementation used for transport and tests.
 * @returns Non-sensitive evidence identifying the completed checks.
 * @throws When the origin, status, or response contract is invalid.
 */
export async function verifyMarketingRelease(
  input: MarketingReleaseVerificationInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<MarketingReleaseVerificationResult> {
  const environment = environmentSchema.parse({
    MARKETING_RELEASE_BASE_URL: input.baseUrl,
  });
  const baseUrl = new URL(environment.MARKETING_RELEASE_BASE_URL);
  const requestId = `marketing-release-${randomUUID()}`;

  await fetchValidated(
    fetchImplementation,
    new URL("/api/health/db", baseUrl),
    healthSchema,
    requestId,
  );
  await fetchValidated(
    fetchImplementation,
    new URL("/api/ready", baseUrl),
    readinessSchema,
    requestId,
  );

  return { requestId, checks: ["health", "readiness"] };
}

/** Runs the public release verifier from validated Cloud Build input. */
async function main(): Promise<void> {
  const environment = environmentSchema.parse(process.env);
  const result = await verifyMarketingRelease({
    baseUrl: environment.MARKETING_RELEASE_BASE_URL,
  });
  process.stdout.write(
    `${JSON.stringify({
      level: "info",
      event: "marketing_release_verified",
      ...result,
    })}\n`,
  );
}

const invokedScript = process.argv[1];
if (
  invokedScript &&
  import.meta.url === pathToFileURL(resolve(invokedScript)).href
) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        level: "error",
        event: "marketing_release_verification_failed",
        errorName: error instanceof Error ? error.name : "UnknownError",
      })}\n`,
    );
    process.exitCode = 1;
  });
}
