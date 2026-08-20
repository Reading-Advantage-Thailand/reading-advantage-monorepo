import {
  createCompanyIdentityServiceAuthConfig,
  createCompanyOidcClient,
  type CompanyOidcIdentity,
} from "@reading-advantage/auth";

/** Host-only opaque Accounting application-session cookie. */
export const ACCOUNTING_SESSION_COOKIE = "__Host-ra_accounting_session";
/** Host-only short-lived Accounting authorization transaction cookie. */
export const ACCOUNTING_TRANSACTION_COOKIE = "__Host-ra_accounting_oidc_tx";

/** Accounting application roles issued by Accounts for the accounting audience. */
export type AccountingRole = "OWNER" | "ACCOUNTANT" | "STAFF";

let config:
  | ReturnType<typeof createCompanyIdentityServiceAuthConfig>
  | undefined;
let client: ReturnType<typeof createCompanyOidcClient> | undefined;

/**
 * Returns the validated Accounting OIDC configuration for this process.
 * @returns Confidential client configuration derived from the runtime environment.
 */
function getAccountingOidcConfig(): ReturnType<
  typeof createCompanyIdentityServiceAuthConfig
> {
  config ??= createCompanyIdentityServiceAuthConfig({
    NODE_ENV: process.env.NODE_ENV,
    COMPANY_AUTH_ISSUER_URL: process.env.COMPANY_AUTH_ISSUER_URL,
    COMPANY_AUTH_OIDC_CLIENT_ID: process.env.COMPANY_AUTH_OIDC_CLIENT_ID,
    COMPANY_AUTH_OIDC_CLIENT_SECRET:
      process.env.COMPANY_AUTH_OIDC_CLIENT_SECRET,
    COMPANY_AUTH_OIDC_REDIRECT_URI: process.env.COMPANY_AUTH_OIDC_REDIRECT_URI,
    COMPANY_AUTH_EXPECTED_AUDIENCE: process.env.COMPANY_AUTH_EXPECTED_AUDIENCE,
    COMPANY_AUTH_CLOCK_SKEW_SECONDS:
      process.env.COMPANY_AUTH_CLOCK_SKEW_SECONDS,
  });
  return config;
}

/**
 * Returns the trusted public Accounting origin from the registered callback URI.
 * @returns Public origin used for post-callback browser redirects.
 */
export function getAccountingPublicOrigin(): string {
  return new URL(getAccountingOidcConfig().redirectUri).origin;
}

/**
 * Returns the process-local Accounting OIDC client backed only by Accounts endpoints.
 * @returns Validated confidential OIDC client.
 */
export function getAccountingOidcClient(): ReturnType<
  typeof createCompanyOidcClient
> {
  client ??= createCompanyOidcClient({ config: getAccountingOidcConfig() });
  return client;
}

/**
 * Reads one cookie from either NextRequest or a standard Request.
 * @param request Request carrying product-local cookies.
 * @param name Exact host-only cookie name.
 * @returns Cookie value or undefined.
 */
export function readAccountingCookie(
  request: Request,
  name: string,
): string | undefined {
  const nextCookies = (
    request as Request & {
      cookies?: { get: (cookieName: string) => { value: string } | undefined };
    }
  ).cookies;
  const nextValue = nextCookies?.get(name)?.value;
  if (nextValue) return nextValue;
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [cookieName, ...value] = part.trim().split("=");
    if (cookieName === name) return value.join("=");
  }
  return undefined;
}

/**
 * Resolves the strongest exact Accounting role from audience-scoped claims.
 * @param roles Role keys returned by Accounts introspection.
 * @returns OWNER, ACCOUNTANT, STAFF, or null when Accounting access has been removed.
 */
export function resolveAccountingRole(
  roles: readonly string[],
): AccountingRole | null {
  if (roles.includes("OWNER")) return "OWNER";
  if (roles.includes("ACCOUNTANT")) return "ACCOUNTANT";
  if (roles.includes("STAFF")) return "STAFF";
  return null;
}

/**
 * Produces the compatibility user projection consumed by the current UI provider.
 * @param identity Verified Accounting audience identity.
 * @returns Secret-free application-local user projection, or null without an Accounting role.
 */
export function accountingSessionUser(identity: CompanyOidcIdentity) {
  const accountingRole = resolveAccountingRole(identity.roles);
  if (!accountingRole) return null;
  return {
    id: identity.sub,
    username: identity.username,
    name: identity.displayName,
    role: accountingRole,
    organizationId: identity.organizationId,
    schoolId: null,
    xp: 0,
    level: 1,
    cefrLevel: "N/A",
    applicationRoles: identity.roles,
  };
}
