import { z } from "zod";

type RawEnvironment = Record<string, string | undefined>;

const ACCOUNTING_DATABASE = "accounting";

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

/** Strict parser for direct accounting migration database configuration. */
export const accountingDirectEnvSchema = z
  .object({
    ACCOUNTING_DIRECT_DATABASE_URL: z.string().min(1),
  })
  .strict()
  .superRefine((environment, context) => {
    const value = environment.ACCOUNTING_DIRECT_DATABASE_URL;
    if (value !== value.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "ACCOUNTING_DIRECT_DATABASE_URL must not contain surrounding whitespace.",
        path: ["ACCOUNTING_DIRECT_DATABASE_URL"],
      });
      return;
    }

    let databaseUrl: URL;
    try {
      databaseUrl = new URL(value);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "ACCOUNTING_DIRECT_DATABASE_URL must be an absolute postgresql URL.",
        path: ["ACCOUNTING_DIRECT_DATABASE_URL"],
      });
      return;
    }

    if (databaseUrl.protocol !== "postgresql:") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "ACCOUNTING_DIRECT_DATABASE_URL must use the postgresql protocol.",
        path: ["ACCOUNTING_DIRECT_DATABASE_URL"],
      });
    }
    if (databaseUrl.pathname !== `/${ACCOUNTING_DATABASE}`) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `ACCOUNTING_DIRECT_DATABASE_URL database pathname must be exactly /${ACCOUNTING_DATABASE}.`,
        path: ["ACCOUNTING_DIRECT_DATABASE_URL"],
      });
    }
    if (databaseUrl.hash !== "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ACCOUNTING_DIRECT_DATABASE_URL must not contain a fragment.",
        path: ["ACCOUNTING_DIRECT_DATABASE_URL"],
      });
    }
  })
  .transform((environment) =>
    Object.freeze({
      directDatabaseUrl: environment.ACCOUNTING_DIRECT_DATABASE_URL,
    }),
  );

/** Immutable direct accounting migration configuration. */
export type AccountingDirectConfig = z.infer<typeof accountingDirectEnvSchema>;

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
