import { z } from "zod";

type RawEnvironment = Record<string, string | undefined>;

const ACCOUNTING_DATABASE = "accounting";

/**
 * Adds a secret-free PostgreSQL URL issue to an accounting environment parser.
 * @param value The untrusted database URL.
 * @param context The active Zod refinement context.
 * @param field The environment variable being validated.
 * @returns Nothing.
 */
function validateAccountingDatabaseUrl(
  value: string,
  context: z.RefinementCtx,
  field: "ACCOUNTING_DATABASE_URL" | "ACCOUNTING_DIRECT_DATABASE_URL",
): void {
  if (value !== value.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must not contain surrounding whitespace.`,
      path: [field],
    });
    return;
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(value);
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must be an absolute postgresql URL.`,
      path: [field],
    });
    return;
  }

  if (databaseUrl.protocol !== "postgresql:") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must use the postgresql protocol.`,
      path: [field],
    });
  }
  if (databaseUrl.pathname !== `/${ACCOUNTING_DATABASE}`) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} database pathname must be exactly /${ACCOUNTING_DATABASE}.`,
      path: [field],
    });
  }
  if (databaseUrl.hash !== "") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must not contain a fragment.`,
      path: [field],
    });
  }
}

/**
 * Formats Zod issues without including environment values or secrets.
 * @param error The failed Zod environment parse.
 * @param label The configuration boundary being parsed.
 * @returns A secret-free configuration error.
 */
function configurationError(error: z.ZodError, label: string): Error {
  const details = error.issues.map((issue) => {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      return `unrecognized keys: ${issue.keys.join(", ")}`;
    }
    const path = issue.path.length === 0 ? "environment" : issue.path.join(".");
    return `${path}: ${issue.message}`;
  });

  return new Error(`Invalid ${label} environment: ${details.join("; ")}`);
}

const runtimePoolMaxSchema = z
  .string()
  .regex(/^\d+$/, "must be an integer between 1 and 20")
  .transform(Number)
  .pipe(z.number().int().min(1).max(20));

/** Strict parser for pooled accounting runtime database configuration. */
export const accountingRuntimeEnvSchema = z
  .object({
    ACCOUNTING_DATABASE_URL: z.string().min(1),
    ACCOUNTING_DATABASE_POOL_MAX: runtimePoolMaxSchema.default("3"),
  })
  .strict()
  .superRefine((environment, context) => {
    validateAccountingDatabaseUrl(
      environment.ACCOUNTING_DATABASE_URL,
      context,
      "ACCOUNTING_DATABASE_URL",
    );
  })
  .transform((environment) =>
    Object.freeze({
      databaseUrl: environment.ACCOUNTING_DATABASE_URL,
      poolMax: environment.ACCOUNTING_DATABASE_POOL_MAX,
    }),
  );

/** Immutable pooled accounting runtime configuration. */
export type AccountingRuntimeConfig = z.infer<
  typeof accountingRuntimeEnvSchema
>;

/** Strict parser for direct accounting migration database configuration. */
export const accountingDirectEnvSchema = z
  .object({
    ACCOUNTING_DIRECT_DATABASE_URL: z.string().min(1),
  })
  .strict()
  .superRefine((environment, context) => {
    validateAccountingDatabaseUrl(
      environment.ACCOUNTING_DIRECT_DATABASE_URL,
      context,
      "ACCOUNTING_DIRECT_DATABASE_URL",
    );
  })
  .transform((environment) =>
    Object.freeze({
      directDatabaseUrl: environment.ACCOUNTING_DIRECT_DATABASE_URL,
    }),
  );

/** Immutable direct accounting migration configuration. */
export type AccountingDirectConfig = z.infer<typeof accountingDirectEnvSchema>;

/**
 * Creates the pooled accounting runtime configuration.
 * @param environment The explicit runtime environment mapping.
 * @returns The validated immutable pooled runtime configuration.
 * @throws When required values, database identity, pool bounds, or unknown keys are invalid.
 */
export function createAccountingRuntimeConfig(
  environment: RawEnvironment,
): AccountingRuntimeConfig {
  const parsed = accountingRuntimeEnvSchema.safeParse(environment);
  if (!parsed.success) {
    throw configurationError(parsed.error, "accounting runtime");
  }
  return parsed.data;
}

/**
 * Creates the direct accounting migration configuration.
 * @param environment The explicit direct-connection environment mapping.
 * @returns The validated immutable direct database configuration.
 * @throws When required values, database identity, or unknown keys are invalid.
 */
export function createAccountingDirectConfig(
  environment: RawEnvironment,
): AccountingDirectConfig {
  const parsed = accountingDirectEnvSchema.safeParse(environment);
  if (!parsed.success) {
    throw configurationError(parsed.error, "accounting direct");
  }
  return parsed.data;
}
