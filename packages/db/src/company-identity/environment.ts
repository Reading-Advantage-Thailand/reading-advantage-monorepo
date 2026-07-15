import { z } from "zod";

type RawEnvironment = Record<string, string | undefined>;

const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "::1", "localhost"]);

/**
 * Adds a secret-free PostgreSQL URL issue to a Zod environment parser.
 * @param value The untrusted database URL.
 * @param context The active Zod refinement context.
 * @param field The environment variable being validated.
 * @param expectedDatabase The exact required PostgreSQL database name.
 * @param expectedPort The exact required PostgreSQL port, when the boundary is local-only.
 * @param loopbackOnly Whether the URL must target a loopback hostname.
 * @param rejectQuery Whether all query parameters must be rejected.
 * @returns Nothing.
 */
function validatePostgresUrl(
  value: string,
  context: z.RefinementCtx,
  field: string,
  expectedDatabase: "company_identity" | "postgres",
  expectedPort: "5432" | undefined,
  loopbackOnly: boolean,
  rejectQuery: boolean,
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
  if (databaseUrl.pathname !== `/${expectedDatabase}`) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} database pathname must be exactly /${expectedDatabase}.`,
      path: [field],
    });
  }
  if (expectedPort !== undefined && databaseUrl.port !== expectedPort) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must use PostgreSQL port ${expectedPort}.`,
      path: [field],
    });
  }

  const hostname = databaseUrl.hostname.replace(/^\[|\]$/g, "");
  if (loopbackOnly && !LOOPBACK_HOSTNAMES.has(hostname)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must use a loopback hostname.`,
      path: [field],
    });
  }
  if (rejectQuery && databaseUrl.search !== "") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must not contain query parameters.`,
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

/**
 * Parses an environment with a strict schema and emits secret-free errors.
 * @param schema The strict configuration schema.
 * @param environment The explicit environment mapping.
 * @param label The configuration boundary name used in errors.
 * @returns The validated immutable configuration.
 * @throws When a required field, URL target, local-only port, or unknown key is invalid.
 */
function parseEnvironment<Schema extends z.ZodTypeAny>(
  schema: Schema,
  environment: RawEnvironment,
  label: string,
): z.output<Schema> {
  const parsed = schema.safeParse(environment);
  if (!parsed.success) {
    throw configurationError(parsed.error, label);
  }
  return parsed.data as z.output<Schema>;
}

const runtimePoolMaxSchema = z
  .string()
  .regex(/^\d+$/, "must be an integer between 1 and 20")
  .transform(Number)
  .pipe(z.number().int().min(1).max(20));

/** Strict parser for pooled company-identity runtime database configuration. */
export const companyIdentityRuntimeEnvSchema = z
  .object({
    COMPANY_AUTH_DATABASE_URL: z.string().min(1),
    COMPANY_AUTH_DATABASE_POOL_MAX: runtimePoolMaxSchema.default("3"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .strict()
  .superRefine((environment, context) => {
    validatePostgresUrl(
      environment.COMPANY_AUTH_DATABASE_URL,
      context,
      "COMPANY_AUTH_DATABASE_URL",
      "company_identity",
      undefined,
      false,
      false,
    );
  })
  .transform((environment) =>
    Object.freeze({
      databaseUrl: environment.COMPANY_AUTH_DATABASE_URL,
      nodeEnv: environment.NODE_ENV,
      poolMax: environment.COMPANY_AUTH_DATABASE_POOL_MAX,
    }),
  );

/** Immutable pooled company-identity runtime configuration. */
export type CompanyIdentityRuntimeConfig = z.infer<
  typeof companyIdentityRuntimeEnvSchema
>;

/** Strict parser for direct company-identity migration database configuration. */
export const companyIdentityDirectEnvSchema = z
  .object({
    COMPANY_AUTH_DIRECT_DATABASE_URL: z.string().min(1),
  })
  .strict()
  .superRefine((environment, context) => {
    validatePostgresUrl(
      environment.COMPANY_AUTH_DIRECT_DATABASE_URL,
      context,
      "COMPANY_AUTH_DIRECT_DATABASE_URL",
      "company_identity",
      undefined,
      false,
      false,
    );
  })
  .transform((environment) =>
    Object.freeze({
      directDatabaseUrl: environment.COMPANY_AUTH_DIRECT_DATABASE_URL,
    }),
  );

/** Immutable direct company-identity migration configuration. */
export type CompanyIdentityDirectConfig = z.infer<
  typeof companyIdentityDirectEnvSchema
>;

/** Strict parser for the loopback PostgreSQL integration-test administrator. */
export const companyIdentityTestEnvSchema = z
  .object({
    COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL: z.string().min(1),
  })
  .strict()
  .superRefine((environment, context) => {
    validatePostgresUrl(
      environment.COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL,
      context,
      "COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL",
      "postgres",
      "5432",
      true,
      true,
    );
  })
  .transform((environment) =>
    Object.freeze({
      adminDatabaseUrl: environment.COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL,
    }),
  );

/** Immutable loopback test-administrator database configuration. */
export type CompanyIdentityTestConfig = z.infer<
  typeof companyIdentityTestEnvSchema
>;

/**
 * Creates the pooled company-identity runtime configuration.
 * @param environment The explicit runtime environment mapping.
 * @returns The validated immutable pooled runtime configuration.
 * @throws When required values, database identity, or unknown keys are invalid.
 */
export function createCompanyIdentityRuntimeConfig(
  environment: RawEnvironment,
): CompanyIdentityRuntimeConfig {
  return parseEnvironment(
    companyIdentityRuntimeEnvSchema,
    environment,
    "company identity runtime",
  );
}

/**
 * Creates the direct company-identity migration configuration.
 * @param environment The explicit direct-connection environment mapping.
 * @returns The validated immutable direct database configuration.
 * @throws When required values, database identity, or unknown keys are invalid.
 */
export function createCompanyIdentityDirectConfig(
  environment: RawEnvironment,
): CompanyIdentityDirectConfig {
  return parseEnvironment(
    companyIdentityDirectEnvSchema,
    environment,
    "company identity direct",
  );
}

/**
 * Creates the loopback PostgreSQL integration-test administrator configuration.
 * @param environment The explicit test-administrator environment mapping.
 * @returns The validated immutable test-administrator configuration.
 * @throws When the URL is not loopback PostgreSQL 5432 for the postgres database.
 */
export function createCompanyIdentityTestConfig(
  environment: RawEnvironment,
): CompanyIdentityTestConfig {
  return parseEnvironment(
    companyIdentityTestEnvSchema,
    environment,
    "company identity test administrator",
  );
}
