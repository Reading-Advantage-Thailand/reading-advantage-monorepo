import {
  createCompanyIdentityServiceAuthConfig,
  createCompanyOidcClient,
  type CompanyOidcIdentity,
} from "@reading-advantage/auth";

import { resolveMarketingRole } from "./marketing-permissions";

/** Host-only opaque Marketing application-session cookie. */
export const MARKETING_SESSION_COOKIE = "__Host-ra_marketing_session";
/** Host-only short-lived Marketing authorization transaction cookie. */
export const MARKETING_TRANSACTION_COOKIE = "__Host-ra_marketing_oidc_tx";

let config: ReturnType<typeof createCompanyIdentityServiceAuthConfig> | undefined;
let client: ReturnType<typeof createCompanyOidcClient> | undefined;

/**
 * Returns the validated Marketing OIDC configuration for this process.
 * @returns Confidential client configuration derived from the runtime environment.
 */
function getMarketingOidcConfig(): ReturnType<typeof createCompanyIdentityServiceAuthConfig> {
  config ??= createCompanyIdentityServiceAuthConfig({
    NODE_ENV: process.env.NODE_ENV,
    COMPANY_AUTH_ISSUER_URL: process.env.COMPANY_AUTH_ISSUER_URL,
    COMPANY_AUTH_OIDC_CLIENT_ID: process.env.COMPANY_AUTH_OIDC_CLIENT_ID,
    COMPANY_AUTH_OIDC_CLIENT_SECRET: process.env.COMPANY_AUTH_OIDC_CLIENT_SECRET,
    COMPANY_AUTH_OIDC_REDIRECT_URI: process.env.COMPANY_AUTH_OIDC_REDIRECT_URI,
    COMPANY_AUTH_EXPECTED_AUDIENCE: process.env.COMPANY_AUTH_EXPECTED_AUDIENCE,
    COMPANY_AUTH_CLOCK_SKEW_SECONDS: process.env.COMPANY_AUTH_CLOCK_SKEW_SECONDS,
  });
  return config;
}

/**
 * Returns the trusted public Marketing origin from the registered callback URI.
 * @returns Public origin used for post-callback browser redirects.
 */
export function getMarketingPublicOrigin(): string {
  return new URL(getMarketingOidcConfig().redirectUri).origin;
}

/**
 * Returns the process-local Marketing OIDC client backed only by Accounts endpoints.
 * @returns Validated confidential OIDC client.
 */
export function getMarketingOidcClient(): ReturnType<typeof createCompanyOidcClient> {
  client ??= createCompanyOidcClient({ config: getMarketingOidcConfig() });
  return client;
}

/**
 * Reads one cookie from either NextRequest or a standard Request.
 * @param request Request carrying product-local cookies.
 * @param name Exact host-only cookie name.
 * @returns Cookie value or undefined.
 */
export function readMarketingCookie(request: Request, name: string): string | undefined {
  const nextCookies = (request as Request & {
    cookies?: { get: (cookieName: string) => { value: string } | undefined };
  }).cookies;
  const nextValue = nextCookies?.get(name)?.value;
  if (nextValue) return nextValue;
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [cookieName, ...value] = part.trim().split("=");
    if (cookieName === name) return value.join("=");
  }
  return undefined;
}

/**
 * Produces the compatibility user projection consumed by the current UI provider.
 * @param identity Verified Marketing audience identity.
 * @returns Secret-free application-local user projection, or null without a Marketing role.
 */
export function marketingSessionUser(identity: CompanyOidcIdentity) {
  const marketingRole = resolveMarketingRole(identity.roles);
  if (!marketingRole) return null;
  return {
    id: identity.sub,
    username: identity.username,
    name: identity.displayName,
    role: marketingRole,
    schoolId: null,
    xp: 0,
    level: 1,
    cefrLevel: "N/A",
    applicationRoles: identity.roles,
  };
}
