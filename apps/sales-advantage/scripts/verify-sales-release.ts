import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { z } from "zod";

const environmentSchema = z.object({
  SALES_RELEASE_BASE_URL: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("https://"),
      "Sales release URL must use HTTPS.",
    ),
  SALES_RELEASE_EXPECTED_MODE: z.enum(["company", "legacy-school"]),
});

const healthSchema = z.object({
  status: z.literal("alive"),
  service: z.literal("sales-advantage"),
});

/** Inputs required to verify public Sales release dependencies. */
export interface SalesReleaseVerificationInput {
  /** HTTPS origin to verify. */
  readonly baseUrl: string;
  /** Authentication mode the release must report. */
  readonly expectedMode: "company" | "legacy-school";
}

/** Non-sensitive evidence returned after release checks succeed. */
export interface SalesReleaseVerificationResult {
  /** Per-invocation correlation identifier. */
  readonly requestId: string;
  /** Checks completed against the release origin. */
  readonly checks: readonly ["health", "readiness"];
}

/**
 * Fetches and validates one public Sales release response.
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
 * Verifies public liveness and mode-specific dependency readiness.
 * @param input Release origin and expected authentication mode.
 * @param fetchImplementation Fetch implementation used for transport and tests.
 * @returns Non-sensitive evidence identifying the completed checks.
 * @throws When the origin, status, or response contract is invalid.
 */
export async function verifySalesRelease(
  input: SalesReleaseVerificationInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<SalesReleaseVerificationResult> {
  const validatedInput = environmentSchema.parse({
    SALES_RELEASE_BASE_URL: input.baseUrl,
    SALES_RELEASE_EXPECTED_MODE: input.expectedMode,
  });
  const baseUrl = new URL(validatedInput.SALES_RELEASE_BASE_URL);
  const requestId = `sales-release-${randomUUID()}`;
  const readySchema = z.object({
    status: z.literal("ready"),
    service: z.literal("sales-advantage"),
    mode: z.literal(validatedInput.SALES_RELEASE_EXPECTED_MODE),
    dependencies: z.object({
      database: z.literal("ready"),
      accounts:
        validatedInput.SALES_RELEASE_EXPECTED_MODE === "company"
          ? z.literal("ready")
          : z.literal("not-required"),
    }),
  });

  await fetchValidated(
    fetchImplementation,
    new URL("/api/health", baseUrl),
    healthSchema,
    requestId,
  );
  await fetchValidated(
    fetchImplementation,
    new URL("/api/ready", baseUrl),
    readySchema,
    requestId,
  );

  return { requestId, checks: ["health", "readiness"] };
}

/** Runs the public release verifier from validated Cloud Build environment input. */
async function main(): Promise<void> {
  const environment = environmentSchema.parse(process.env);
  const result = await verifySalesRelease({
    baseUrl: environment.SALES_RELEASE_BASE_URL,
    expectedMode: environment.SALES_RELEASE_EXPECTED_MODE,
  });
  process.stdout.write(
    `${JSON.stringify({
      level: "info",
      event: "sales_release_verified",
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
        event: "sales_release_verification_failed",
        errorName: error instanceof Error ? error.name : "UnknownError",
      })}\n`,
    );
    process.exitCode = 1;
  });
}
