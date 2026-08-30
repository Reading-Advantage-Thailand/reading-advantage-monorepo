import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { z } from "zod";

const environmentSchema = z.object({
  ACCOUNTING_RELEASE_BASE_URL: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("https://"),
      "Accounting release URL must use HTTPS.",
    ),
});

/** Inputs required to verify public Accounting release dependencies. */
export interface AccountingReleaseVerificationInput {
  /** HTTPS origin to verify. */
  readonly baseUrl: string;
}

/** Non-sensitive evidence returned after release checks succeed. */
export interface AccountingReleaseVerificationResult {
  /** Per-invocation correlation identifier. */
  readonly requestId: string;
  /** Checks completed against the release origin. */
  readonly checks: readonly ["login-page", "unauthenticated-api", "safe-return-to"];
}

/**
 * Fetches and validates one public Accounting release response.
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

const loginPageSchema = z.object({ status: z.literal(200) });

/**
 * Verifies the Accounting login page, unauthenticated API, and safe return-to.
 * @param input Release origin to verify.
 * @param fetchImplementation Fetch implementation used for transport and tests.
 * @returns Non-sensitive evidence identifying the completed checks.
 * @throws When the origin, status, or response contract is invalid.
 */
export async function verifyAccountingRelease(
  input: AccountingReleaseVerificationInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<AccountingReleaseVerificationResult> {
  const validatedInput = environmentSchema.parse({
    ACCOUNTING_RELEASE_BASE_URL: input.baseUrl,
  });
  const baseUrl = new URL(validatedInput.ACCOUNTING_RELEASE_BASE_URL);
  const requestId = `accounting-release-${randomUUID()}`;

  // The login page must render (2xx) for an unauthenticated browser.
  const loginResponse = await fetchImplementation(new URL("/login", baseUrl), {
    cache: "no-store",
    headers: { Accept: "text/html", "X-Request-Id": requestId },
    signal: AbortSignal.timeout(15_000),
  });
  if (!loginResponse.ok) {
    throw new Error(`/login returned HTTP ${loginResponse.status}.`);
  }
  loginPageSchema.parse({ status: loginResponse.status as 200 });

  // An unauthenticated API call must return 401, never 500.
  const sessionResponse = await fetchImplementation(
    new URL("/api/auth/session", baseUrl),
    {
      cache: "no-store",
      headers: { Accept: "application/json", "X-Request-Id": requestId },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (sessionResponse.status !== 401) {
    throw new Error(
      `/api/auth/session returned HTTP ${sessionResponse.status}; expected 401.`,
    );
  }

  // A malformed returnTo must redirect (307), never return 500.
  const startResponse = await fetchImplementation(
    new URL("/api/auth/company/start?returnTo=https://evil.example.com", baseUrl),
    {
      cache: "no-store",
      headers: { Accept: "application/json", "X-Request-Id": requestId },
      signal: AbortSignal.timeout(15_000),
      redirect: "manual",
    },
  );
  if (startResponse.status !== 307) {
    throw new Error(
      `/api/auth/company/start with malformed returnTo returned HTTP ${startResponse.status}; expected 307.`,
    );
  }

  return {
    requestId,
    checks: ["login-page", "unauthenticated-api", "safe-return-to"],
  };
}

/** Runs the public release verifier from validated Cloud Build environment input. */
async function main(): Promise<void> {
  const environment = environmentSchema.parse(process.env);
  const result = await verifyAccountingRelease({
    baseUrl: environment.ACCOUNTING_RELEASE_BASE_URL,
  });
  process.stdout.write(
    `${JSON.stringify({
      level: "info",
      operation: "accounting_release_verification",
      ...result,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      level: "error",
      operation: "accounting_release_verification",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    })}\n`,
  );
  process.exitCode = 1;
});
