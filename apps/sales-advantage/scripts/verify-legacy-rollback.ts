import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { z } from "zod";

const environmentSchema = z.object({
  SALES_LEGACY_ROLLBACK_URL: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("https://"),
      "Sales rollback URL must use HTTPS.",
    ),
  SALES_LEGACY_ROLLBACK_SESSION_TOKEN: z.string().regex(/^[0-9a-f]{64}$/),
  SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST: z.string().min(1),
});

const repairManifestSchema = z
  .object({
    accountId: z.string().uuid(),
    expectedCurrentRole: z.enum(["SALES_REP", "SALES_ADMIN"]),
    targetRole: z.enum(["INTERN", "STUDENT", "TEACHER", "ADMIN"]),
  })
  .strict();

const repairManifestJsonSchema = z
  .string()
  .transform((value, context): unknown => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({
        code: "custom",
        message: "Sales repair manifest must be valid JSON.",
      });
      return z.NEVER;
    }
  })
  .pipe(repairManifestSchema);

const healthSchema = z.object({
  status: z.literal("alive"),
  service: z.literal("sales-advantage"),
});

const readySchema = z.object({
  status: z.literal("ready"),
  service: z.literal("sales-advantage"),
  mode: z.literal("legacy-school"),
  dependencies: z.object({
    database: z.literal("ready"),
    accounts: z.literal("not-required"),
  }),
});

const trpcSuccessSchema = z.object({
  result: z.object({ data: z.unknown() }),
});

const verificationInputSchema = z.object({
  baseUrl: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("https://"),
      "Sales rollback URL must use HTTPS.",
    ),
  sessionToken: z.string().regex(/^[0-9a-f]{64}$/),
  repairManifestJson: repairManifestJsonSchema,
});

/** Inputs required to verify one tagged legacy rollback revision. */
export interface LegacyRollbackVerificationInput {
  /** HTTPS origin of the tagged no-traffic revision. */
  readonly baseUrl: string;
  /** Short-lived raw session token whose digest is stored in PostgreSQL. */
  readonly sessionToken: string;
  /** Exact source-role repair manifest supplied to the release. */
  readonly repairManifestJson: string;
}

/** Non-sensitive evidence returned after every rollback check succeeds. */
export interface LegacyRollbackVerificationResult {
  /** Per-invocation correlation identifier. */
  readonly requestId: string;
  /** Checks completed against the tagged revision. */
  readonly checks: readonly [
    "health",
    "readiness",
    "session",
    "protected-access",
  ];
}

/**
 * Fetches and validates one JSON release-gate response.
 * @param fetchImplementation Fetch implementation used for the request.
 * @param url Exact endpoint URL.
 * @param schema Runtime contract for the untrusted response body.
 * @param init Optional request configuration.
 * @returns The validated response body.
 * @throws When transport, status, JSON parsing, or schema validation fails.
 */
async function fetchValidated<T>(
  fetchImplementation: typeof fetch,
  url: URL,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetchImplementation(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`${url.pathname} returned HTTP ${response.status}.`);
  }
  return schema.parse(await response.json());
}

/**
 * Verifies liveness, readiness, manifest-bound authentication, and protected access.
 * @param input Tagged revision origin, disposable session token, and repair manifest.
 * @param fetchImplementation Fetch implementation used for transport and executable tests.
 * @returns Non-sensitive evidence identifying the completed checks.
 * @throws When input validation, transport, response status, or response validation fails.
 */
export async function verifyLegacyRollback(
  input: LegacyRollbackVerificationInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<LegacyRollbackVerificationResult> {
  const validatedInput = verificationInputSchema.parse(input);
  const baseUrl = new URL(validatedInput.baseUrl);
  const requestId = `sales-legacy-rollback-${randomUUID()}`;
  const headers = {
    Accept: "application/json",
    Cookie: `session_token=${validatedInput.sessionToken}`,
    "X-Request-Id": requestId,
  };
  const expectedUserId = `sales:${validatedInput.repairManifestJson.accountId}`;
  const sessionSchema = z.object({
    session: z.object({
      user: z
        .object({
          id: z.literal(expectedUserId),
          role: z.literal(
            validatedInput.repairManifestJson.expectedCurrentRole,
          ),
        })
        .passthrough(),
    }),
  });

  await fetchValidated(
    fetchImplementation,
    new URL("/api/health", baseUrl),
    healthSchema,
  );
  await fetchValidated(
    fetchImplementation,
    new URL("/api/ready", baseUrl),
    readySchema,
  );
  await fetchValidated(
    fetchImplementation,
    new URL("/api/auth/session", baseUrl),
    sessionSchema,
    { headers },
  );
  await fetchValidated(
    fetchImplementation,
    new URL("/api/trpc/sales.dashboard?input=%7B%22json%22%3Anull%7D", baseUrl),
    trpcSuccessSchema,
    { headers },
  );

  return {
    requestId,
    checks: ["health", "readiness", "session", "protected-access"],
  };
}

/** Runs the rollback verifier from validated Cloud Build environment input. */
async function main(): Promise<void> {
  const environment = environmentSchema.parse(process.env);
  const result = await verifyLegacyRollback({
    baseUrl: environment.SALES_LEGACY_ROLLBACK_URL,
    sessionToken: environment.SALES_LEGACY_ROLLBACK_SESSION_TOKEN,
    repairManifestJson: environment.SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST,
  });

  process.stdout.write(
    `${JSON.stringify({
      level: "info",
      event: "sales_legacy_rollback_verified",
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
        event: "sales_legacy_rollback_verification_failed",
        errorName: error instanceof Error ? error.name : "UnknownError",
      })}\n`,
    );
    process.exitCode = 1;
  });
}
