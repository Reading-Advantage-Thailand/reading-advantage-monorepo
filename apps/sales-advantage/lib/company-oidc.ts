import {
  createCompanyIdentityServiceAuthConfig,
  createCompanyOidcClient,
  type CompanyOidcIdentity,
  type UserContext,
} from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { resolveSalesCompanyPrincipal } from "@reading-advantage/domain";

/** Host-only opaque Sales application-session cookie. */
export const SALES_SESSION_COOKIE = "__Host-ra_sales_session";
/** Host-only short-lived Sales authorization transaction cookie. */
export const SALES_TRANSACTION_COOKIE = "__Host-ra_sales_oidc_tx";

let config: ReturnType<typeof createCompanyIdentityServiceAuthConfig> | undefined;
let client: ReturnType<typeof createCompanyOidcClient> | undefined;

/**
 * Returns the validated Sales OIDC configuration for this process.
 * @returns Confidential client configuration derived from the runtime environment.
 */
function getSalesOidcConfig(): ReturnType<typeof createCompanyIdentityServiceAuthConfig> {
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
 * Returns the trusted public Sales origin from the registered callback URI.
 * @returns Public origin used for post-callback browser redirects.
 */
export function getSalesPublicOrigin(): string {
  return new URL(getSalesOidcConfig().redirectUri).origin;
}

/**
 * Returns the process-local Sales OIDC client backed only by Accounts endpoints.
 * @returns Validated confidential OIDC client.
 */
export function getSalesOidcClient(): ReturnType<typeof createCompanyOidcClient> {
  client ??= createCompanyOidcClient({ config: getSalesOidcConfig() });
  return client;
}

/**
 * Reads one product-local cookie from NextRequest or a standard Request.
 * @param request Request carrying Sales cookies.
 * @param name Exact host-only cookie name.
 * @returns Cookie value or undefined.
 */
export function readSalesCookie(request: Request, name: string): string | undefined {
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
 * Maps exact Sales roles into the compatibility user projection.
 * @param identity Verified Sales audience identity.
 * @returns Product-local user consumed by UI and tRPC context.
 */
export async function salesSessionUser(
  identity: CompanyOidcIdentity,
): Promise<UserContext> {
  return resolveSalesCompanyPrincipal(db, identity);
}

/**
 * Resolves a request's active Accounts session into its durable Sales principal.
 * @param request Request carrying the host-only Sales application cookie.
 * @returns Mapped local Sales principal, or null when the session is absent or inactive.
 */
export async function authenticateSalesRequest(
  request: Request,
): Promise<UserContext | null> {
  const token = readSalesCookie(request, SALES_SESSION_COOKIE);
  if (!token) return null;
  const session = await getSalesOidcClient().introspect(token);
  return session ? salesSessionUser(session.identity) : null;
}
