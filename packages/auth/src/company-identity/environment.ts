import { createPrivateKey } from "node:crypto";

import { z } from "zod";

type RawEnvironment = Record<string, string | undefined>;
type NodeEnvironment = "development" | "production" | "test";

const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "::1", "localhost"]);
const STABLE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,127})$/;
const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~A-Za-z0-9]{1,128}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Adds a secret-free issue to an auth environment schema.
 * @param context The active Zod refinement context.
 * @param field The environment variable that violates the contract.
 * @param message The secret-free validation rule.
 * @returns Nothing.
 */
function addIssue(
  context: z.RefinementCtx,
  field: string,
  message: string,
): void {
  context.addIssue({ code: z.ZodIssueCode.custom, message, path: [field] });
}

/**
 * Determines whether a hostname is an explicit local loopback name.
 * @param hostname The URL hostname, possibly enclosed in IPv6 brackets.
 * @returns Whether the hostname is one of the reviewed loopback values.
 */
function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTNAMES.has(hostname.replace(/^\[|\]$/g, ""));
}

/**
 * Validates an issuer URL without including the URL in any error message.
 * @param value The candidate issuer URL.
 * @param nodeEnv The runtime environment controlling HTTP allowances.
 * @param context The active Zod refinement context.
 * @param field The issuer environment variable name.
 * @returns The parsed issuer URL when valid enough for subsequent checks.
 */
function validateIssuerUrl(
  value: string,
  nodeEnv: NodeEnvironment,
  context: z.RefinementCtx,
  field: string,
): URL | null {
  if (value !== value.trim()) {
    addIssue(
      context,
      field,
      "Issuer URL must not contain surrounding whitespace.",
    );
    return null;
  }

  let issuerUrl: URL;
  try {
    issuerUrl = new URL(value);
  } catch {
    addIssue(context, field, "Issuer must be an absolute URL.");
    return null;
  }

  if (issuerUrl.username !== "" || issuerUrl.password !== "") {
    addIssue(context, field, "Issuer URL must not contain credentials.");
  }
  if (issuerUrl.search !== "") {
    addIssue(context, field, "Issuer URL must not contain a query.");
  }
  if (issuerUrl.hash !== "") {
    addIssue(context, field, "Issuer URL must not contain a fragment.");
  }
  if (value.endsWith("/")) {
    addIssue(context, field, "Issuer URL must not contain a trailing slash.");
  }

  if (issuerUrl.protocol === "https:") {
    return issuerUrl;
  }

  const developmentLoopback =
    nodeEnv !== "production" &&
    issuerUrl.protocol === "http:" &&
    isLoopbackHostname(issuerUrl.hostname) &&
    issuerUrl.port !== "";
  if (!developmentLoopback) {
    addIssue(
      context,
      field,
      "Issuer must use HTTPS, except for loopback HTTP with an explicit port in development or test.",
    );
  }

  return issuerUrl;
}

/**
 * Validates an exact application redirect URI without canonicalizing it.
 * @param value The candidate application callback URI.
 * @param nodeEnv The runtime environment controlling HTTP allowances.
 * @param context The active Zod refinement context.
 * @param field The redirect environment variable name.
 * @returns Nothing.
 */
function validateRedirectUri(
  value: string,
  nodeEnv: NodeEnvironment,
  context: z.RefinementCtx,
  field: string,
): void {
  if (value !== value.trim()) {
    addIssue(
      context,
      field,
      "Redirect URI must not contain surrounding whitespace.",
    );
    return;
  }

  if (value.includes("*")) {
    addIssue(context, field, "Redirect URI must not contain a wildcard.");
    return;
  }

  let redirectUri: URL;
  try {
    redirectUri = new URL(value);
  } catch {
    addIssue(context, field, "Redirect URI must be an exact absolute URL.");
    return;
  }

  if (redirectUri.username !== "" || redirectUri.password !== "") {
    addIssue(context, field, "Redirect URI must not contain credentials.");
  }
  if (redirectUri.hash !== "") {
    addIssue(context, field, "Redirect URI must not contain a fragment.");
  }

  if (redirectUri.protocol === "https:") {
    return;
  }

  const developmentLoopback =
    nodeEnv !== "production" &&
    redirectUri.protocol === "http:" &&
    isLoopbackHostname(redirectUri.hostname) &&
    redirectUri.port !== "";
  if (!developmentLoopback) {
    addIssue(
      context,
      field,
      "Redirect URI must use HTTPS, except for explicitly ported loopback development callbacks.",
    );
  }
}

/**
 * Determines whether a value is canonical base64url decoding to sufficient key bytes.
 * @param value The candidate base64url key.
 * @param minimumBytes The minimum decoded key length.
 * @returns Whether the key is canonical and sufficiently long.
 */
function isStrongBase64UrlKey(value: string, minimumBytes: number): boolean {
  if (!BASE64URL_PATTERN.test(value)) {
    return false;
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    return (
      decoded.byteLength >= minimumBytes &&
      decoded.toString("base64url") === value
    );
  } catch {
    return false;
  }
}

/**
 * Determines whether a string occupies at least the required UTF-8 bytes.
 * @param value The candidate secret.
 * @param minimumBytes The minimum UTF-8 byte count.
 * @returns Whether the candidate is sufficiently long and NUL-free.
 */
function hasMinimumSecretBytes(value: string, minimumBytes: number): boolean {
  return (
    !value.includes("\u0000") &&
    Buffer.byteLength(value, "utf8") >= minimumBytes
  );
}

/**
 * Determines whether PEM text contains a parseable asymmetric private key.
 * @param value The candidate signing key PEM.
 * @returns Whether Node can parse the value as an asymmetric private key.
 */
function isAsymmetricPrivateKey(value: string): boolean {
  try {
    const key = createPrivateKey(value);
    return key.type === "private" && key.asymmetricKeyType !== undefined;
  } catch {
    return false;
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
 * Parses an auth environment with a strict schema and secret-free errors.
 * @param schema The strict configuration schema.
 * @param environment The explicit environment mapping.
 * @param label The configuration boundary name used in errors.
 * @returns The validated immutable configuration.
 * @throws When required values, security relationships, or unknown keys are invalid.
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

const nodeEnvironmentSchema = z
  .enum(["development", "test", "production"])
  .default("development");

/**
 * Builds an integer-string parser with explicit inclusive bounds.
 * @param minimum The smallest accepted integer.
 * @param maximum The largest accepted integer.
 * @param message The secret-free invalid-format message.
 * @returns A parser that converts a bounded decimal string to a number.
 */
const boundedIntegerString = (
  minimum: number,
  maximum: number,
  message: string,
) =>
  z
    .string()
    .regex(/^\d+$/, message)
    .transform(Number)
    .pipe(z.number().int().min(minimum).max(maximum));

/** Strict parser for the identifier keyed-hash secret. */
export const companyIdentitySecurityEnvSchema = z
  .object({
    COMPANY_AUTH_IDENTIFIER_HASH_KEY: z
      .string()
      .refine(
        (value) => isStrongBase64UrlKey(value, 32),
        "COMPANY_AUTH_IDENTIFIER_HASH_KEY must be canonical base64url decoding to at least 32 bytes.",
      ),
  })
  .strict()
  .transform((environment) =>
    Object.freeze({
      identifierHashKey: environment.COMPANY_AUTH_IDENTIFIER_HASH_KEY,
    }),
  );

/** Immutable identifier keyed-hash configuration. */
export type CompanyIdentitySecurityConfig = z.infer<
  typeof companyIdentitySecurityEnvSchema
>;

/** Strict parser for the Accounts issuer and session lifetime configuration. */
export const companyIdentityIssuerEnvSchema = z
  .object({
    NODE_ENV: nodeEnvironmentSchema,
    COMPANY_AUTH_ISSUER_URL: z.string().min(1),
    COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY: z
      .string()
      .refine(
        isAsymmetricPrivateKey,
        "COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY must be a valid asymmetric private key PEM.",
      ),
    COMPANY_AUTH_OIDC_SIGNING_KEY_ID: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/),
    COMPANY_AUTH_AUTHORIZATION_CODE_TTL_SECONDS: boundedIntegerString(
      60,
      300,
      "authorization-code TTL must be an integer from 60 through 300 seconds",
    ).default("300"),
    COMPANY_AUTH_SSO_IDLE_TTL_SECONDS: boundedIntegerString(
      300,
      86400,
      "SSO idle TTL must be an integer from 300 through 86400 seconds",
    ),
    COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS: boundedIntegerString(
      301,
      2592000,
      "SSO absolute TTL must be an integer no greater than 2592000 seconds",
    ),
    COMPANY_AUTH_APP_SESSION_TTL_SECONDS: boundedIntegerString(
      300,
      86400,
      "application session TTL must be an integer from 300 through 86400 seconds",
    ),
    COMPANY_AUTH_CLOCK_SKEW_SECONDS: boundedIntegerString(
      0,
      120,
      "clock skew must be an integer from 0 through 120 seconds",
    ).default("30"),
  })
  .strict()
  .superRefine((environment, context) => {
    validateIssuerUrl(
      environment.COMPANY_AUTH_ISSUER_URL,
      environment.NODE_ENV,
      context,
      "COMPANY_AUTH_ISSUER_URL",
    );

    if (
      environment.COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS <=
      environment.COMPANY_AUTH_SSO_IDLE_TTL_SECONDS
    ) {
      addIssue(
        context,
        "COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS",
        "SSO absolute TTL must be greater than the SSO idle TTL.",
      );
    }
    if (
      environment.COMPANY_AUTH_APP_SESSION_TTL_SECONDS >
      environment.COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS
    ) {
      addIssue(
        context,
        "COMPANY_AUTH_APP_SESSION_TTL_SECONDS",
        "Application session TTL must not exceed the SSO absolute TTL.",
      );
    }
  })
  .transform((environment) =>
    Object.freeze({
      issuerUrl: environment.COMPANY_AUTH_ISSUER_URL,
      signingPrivateKey: environment.COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY,
      signingKeyId: environment.COMPANY_AUTH_OIDC_SIGNING_KEY_ID,
      authorizationCodeTtlSeconds:
        environment.COMPANY_AUTH_AUTHORIZATION_CODE_TTL_SECONDS,
      ssoIdleTtlSeconds: environment.COMPANY_AUTH_SSO_IDLE_TTL_SECONDS,
      ssoAbsoluteTtlSeconds: environment.COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS,
      appSessionTtlSeconds: environment.COMPANY_AUTH_APP_SESSION_TTL_SECONDS,
      clockSkewSeconds: environment.COMPANY_AUTH_CLOCK_SKEW_SECONDS,
    }),
  );

/** Immutable issuer signing and session-lifetime configuration. */
export type CompanyIdentityIssuerConfig = z.infer<
  typeof companyIdentityIssuerEnvSchema
>;

/** Strict parser for the host-only Accounts SSO cookie configuration. */
export const companyIdentityCookieEnvSchema = z
  .object({
    NODE_ENV: nodeEnvironmentSchema,
    COMPANY_AUTH_ISSUER_URL: z.string().min(1),
    COMPANY_AUTH_COOKIE_NAME: z
      .string()
      .regex(COOKIE_NAME_PATTERN)
      .default("__Host-ra_company_sso"),
    COMPANY_AUTH_COOKIE_SECURE: z
      .enum(["true", "false"])
      .transform((value) => value === "true"),
    COMPANY_AUTH_COOKIE_SAME_SITE: z.literal("lax"),
    COMPANY_AUTH_COOKIE_DOMAIN: z.string().optional(),
    COMPANY_AUTH_COOKIE_PATH: z.literal("/"),
  })
  .strict()
  .superRefine((environment, context) => {
    const issuerUrl = validateIssuerUrl(
      environment.COMPANY_AUTH_ISSUER_URL,
      environment.NODE_ENV,
      context,
      "COMPANY_AUTH_ISSUER_URL",
    );

    if (environment.COMPANY_AUTH_COOKIE_DOMAIN !== undefined) {
      addIssue(
        context,
        "COMPANY_AUTH_COOKIE_DOMAIN",
        "Host-only company identity cookies must not set Domain.",
      );
    }

    if (environment.NODE_ENV === "production") {
      if (!environment.COMPANY_AUTH_COOKIE_NAME.startsWith("__Host-")) {
        addIssue(
          context,
          "COMPANY_AUTH_COOKIE_NAME",
          "Production cookie name must use the __Host- prefix.",
        );
      }
      if (!environment.COMPANY_AUTH_COOKIE_SECURE) {
        addIssue(
          context,
          "COMPANY_AUTH_COOKIE_SECURE",
          "Production company identity cookies must be Secure.",
        );
      }
      return;
    }

    if (!environment.COMPANY_AUTH_COOKIE_SECURE) {
      if (environment.COMPANY_AUTH_COOKIE_NAME !== "ra_company_sso") {
        addIssue(
          context,
          "COMPANY_AUTH_COOKIE_NAME",
          "Insecure development cookie name must be ra_company_sso.",
        );
      }
      if (
        issuerUrl === null ||
        issuerUrl.protocol !== "http:" ||
        !isLoopbackHostname(issuerUrl.hostname) ||
        issuerUrl.port === ""
      ) {
        addIssue(
          context,
          "COMPANY_AUTH_COOKIE_SECURE",
          "Insecure development cookies require a loopback HTTP issuer with an explicit port.",
        );
      }
    }
  })
  .transform((environment) =>
    Object.freeze({
      name: environment.COMPANY_AUTH_COOKIE_NAME,
      secure: environment.COMPANY_AUTH_COOKIE_SECURE,
      httpOnly: true as const,
      sameSite: environment.COMPANY_AUTH_COOKIE_SAME_SITE,
      path: environment.COMPANY_AUTH_COOKIE_PATH,
    }),
  );

/** Immutable host-only Accounts SSO cookie configuration. */
export type CompanyIdentityCookieConfig = z.infer<
  typeof companyIdentityCookieEnvSchema
>;

const confidentialClientEnvironmentBase = z.object({
  NODE_ENV: nodeEnvironmentSchema,
  COMPANY_AUTH_ISSUER_URL: z.string().min(1),
  COMPANY_AUTH_OIDC_CLIENT_ID: z.string().regex(CLIENT_ID_PATTERN),
  COMPANY_AUTH_OIDC_CLIENT_SECRET: z
    .string()
    .refine(
      (value) => hasMinimumSecretBytes(value, 32),
      "COMPANY_AUTH_OIDC_CLIENT_SECRET must contain at least 32 UTF-8 bytes.",
    ),
  COMPANY_AUTH_OIDC_REDIRECT_URI: z.string().min(1).max(2048),
  COMPANY_AUTH_EXPECTED_AUDIENCE: z.string().regex(STABLE_KEY_PATTERN),
  COMPANY_AUTH_CLOCK_SKEW_SECONDS: boundedIntegerString(
    0,
    120,
    "clock skew must be an integer from 0 through 120 seconds",
  ).default("30"),
});

/** Strict parser for a confidential company application OIDC client. */
export const companyIdentityServiceAuthEnvSchema =
  confidentialClientEnvironmentBase
    .strict()
    .superRefine((environment, context) => {
      validateIssuerUrl(
        environment.COMPANY_AUTH_ISSUER_URL,
        environment.NODE_ENV,
        context,
        "COMPANY_AUTH_ISSUER_URL",
      );
      validateRedirectUri(
        environment.COMPANY_AUTH_OIDC_REDIRECT_URI,
        environment.NODE_ENV,
        context,
        "COMPANY_AUTH_OIDC_REDIRECT_URI",
      );
    })
    .transform((environment) =>
      Object.freeze({
        issuerUrl: environment.COMPANY_AUTH_ISSUER_URL,
        clientId: environment.COMPANY_AUTH_OIDC_CLIENT_ID,
        clientSecret: environment.COMPANY_AUTH_OIDC_CLIENT_SECRET,
        redirectUri: environment.COMPANY_AUTH_OIDC_REDIRECT_URI,
        expectedAudience: environment.COMPANY_AUTH_EXPECTED_AUDIENCE,
        clockSkewSeconds: environment.COMPANY_AUTH_CLOCK_SKEW_SECONDS,
      }),
    );

/** Immutable confidential OIDC service-client configuration. */
export type CompanyIdentityServiceAuthConfig = z.infer<
  typeof companyIdentityServiceAuthEnvSchema
>;

/** Strict parser for a public company application OIDC client without a secret. */
export const companyIdentityPublicClientEnvSchema = z
  .object({
    NODE_ENV: nodeEnvironmentSchema,
    COMPANY_AUTH_ISSUER_URL: z.string().min(1),
    COMPANY_AUTH_OIDC_CLIENT_ID: z.string().regex(CLIENT_ID_PATTERN),
    COMPANY_AUTH_OIDC_REDIRECT_URI: z.string().min(1).max(2048),
    COMPANY_AUTH_EXPECTED_AUDIENCE: z.string().regex(STABLE_KEY_PATTERN),
  })
  .strict()
  .superRefine((environment, context) => {
    validateIssuerUrl(
      environment.COMPANY_AUTH_ISSUER_URL,
      environment.NODE_ENV,
      context,
      "COMPANY_AUTH_ISSUER_URL",
    );
    validateRedirectUri(
      environment.COMPANY_AUTH_OIDC_REDIRECT_URI,
      environment.NODE_ENV,
      context,
      "COMPANY_AUTH_OIDC_REDIRECT_URI",
    );
  })
  .transform((environment) =>
    Object.freeze({
      issuerUrl: environment.COMPANY_AUTH_ISSUER_URL,
      clientId: environment.COMPANY_AUTH_OIDC_CLIENT_ID,
      redirectUri: environment.COMPANY_AUTH_OIDC_REDIRECT_URI,
      expectedAudience: environment.COMPANY_AUTH_EXPECTED_AUDIENCE,
    }),
  );

/** Immutable public OIDC client configuration. */
export type CompanyIdentityPublicClientConfig = z.infer<
  typeof companyIdentityPublicClientEnvSchema
>;

/**
 * Creates the company identifier keyed-hash configuration.
 * @param environment The explicit security environment mapping.
 * @returns The validated immutable identifier-hash configuration.
 * @throws When the key is missing, malformed, too short, or accompanied by unknown keys.
 */
export function createCompanyIdentitySecurityConfig(
  environment: RawEnvironment,
): CompanyIdentitySecurityConfig {
  return parseEnvironment(
    companyIdentitySecurityEnvSchema,
    environment,
    "company identity security",
  );
}

/**
 * Creates the Accounts issuer signing and lifetime configuration.
 * @param environment The explicit issuer environment mapping.
 * @returns The validated immutable issuer configuration.
 * @throws When issuer, signing material, lifetimes, or unknown keys are unsafe.
 */
export function createCompanyIdentityIssuerConfig(
  environment: RawEnvironment,
): CompanyIdentityIssuerConfig {
  return parseEnvironment(
    companyIdentityIssuerEnvSchema,
    environment,
    "company identity issuer",
  );
}

/**
 * Creates the host-only Accounts SSO cookie configuration.
 * @param environment The explicit cookie environment mapping.
 * @returns The validated immutable cookie configuration.
 * @throws When cookie attributes, issuer relationship, or unknown keys are unsafe.
 */
export function createCompanyIdentityCookieConfig(
  environment: RawEnvironment,
): CompanyIdentityCookieConfig {
  return parseEnvironment(
    companyIdentityCookieEnvSchema,
    environment,
    "company identity cookie",
  );
}

/**
 * Creates a confidential application OIDC client configuration.
 * @param environment The explicit confidential-client environment mapping.
 * @returns The validated immutable service authentication configuration.
 * @throws When issuer, client secret, callback, audience, or unknown keys are unsafe.
 */
export function createCompanyIdentityServiceAuthConfig(
  environment: RawEnvironment,
): CompanyIdentityServiceAuthConfig {
  return parseEnvironment(
    companyIdentityServiceAuthEnvSchema,
    environment,
    "company identity confidential service client",
  );
}

/**
 * Creates a public application OIDC client configuration without a secret.
 * @param environment The explicit public-client environment mapping.
 * @returns The validated immutable public client configuration.
 * @throws When issuer, callback, audience, or unknown keys are unsafe.
 */
export function createCompanyIdentityPublicClientConfig(
  environment: RawEnvironment,
): CompanyIdentityPublicClientConfig {
  return parseEnvironment(
    companyIdentityPublicClientEnvSchema,
    environment,
    "company identity public client",
  );
}
