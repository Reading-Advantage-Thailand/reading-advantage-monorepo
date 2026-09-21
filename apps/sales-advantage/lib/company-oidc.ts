import {
  createCompanyIdentityServiceAuthConfig,
  createCompanyOidcClient,
  readRequestCookie,
  validateSession,
  type CompanyOidcIdentity,
  type ProductAuthorizationScope,
  type UserContext,
} from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import {
  resolveLegacySalesCompanyPrincipal,
  resolveSalesCompanyPrincipal,
  type ResolvedSalesCompanyPrincipal,
} from "@reading-advantage/domain";

import { isLegacySalesAuthEnabled } from "./auth-mode";

/** Principal shape shared by company mode and the explicit legacy rollback mode. */
export interface ResolvedSalesRequestPrincipal {
  /** Authenticated compatibility user. */
  readonly user: UserContext;
  /** Complete product boundary selected by the explicit runtime mode. */
  readonly scope: ProductAuthorizationScope & {
    readonly applicationKey: "sales";
  };
}

/** Outcome returned while resolving the current Sales application session. */
export type SalesRequestAuthenticationResult =
  | { readonly kind: "no-session" }
  | { readonly kind: "no-sales-role" }
  | {
      readonly kind: "authenticated";
      readonly principal: ResolvedSalesRequestPrincipal;
    };

/**
 * Resolves a Sales OIDC cookie name for the current runtime environment.
 * @param baseName Unprefixed Sales OIDC cookie name.
 * @returns Cookie name with the host-only prefix in production.
 */
export function resolveSalesCookieName(
  baseName: "ra_sales_session" | "ra_sales_oidc_tx",
): string {
  return process.env.NODE_ENV === "production"
    ? `__Host-${baseName}`
    : baseName;
}

/** Sales application-session cookie. */
export const SALES_SESSION_COOKIE = resolveSalesCookieName("ra_sales_session");
/** Short-lived Sales authorization transaction cookie. */
export const SALES_TRANSACTION_COOKIE = resolveSalesCookieName(
  "ra_sales_oidc_tx",
);

let config:
  | ReturnType<typeof createCompanyIdentityServiceAuthConfig>
  | undefined;
let client: ReturnType<typeof createCompanyOidcClient> | undefined;

/**
 * Checks whether an Accounts identity currently carries a Sales product role.
 * @param identity Verified audience-scoped Accounts identity.
 * @returns Whether the identity may enter Sales.
 */
function hasSalesRole(identity: CompanyOidcIdentity): boolean {
  return (
    identity.roles.includes("SALES_ADMIN") ||
    identity.roles.includes("SALES_REP")
  );
}

/**
 * Selects the exact Sales application role from verified audience claims.
 * @param identity Verified Sales audience identity.
 * @returns Highest-authority recognized Sales role.
 * @throws When the identity has no recognized Sales role.
 */
export function salesSessionRole(identity: CompanyOidcIdentity) {
  const role = (["SALES_ADMIN", "SALES_REP"] as const).find((candidate) =>
    identity.roles.includes(candidate),
  );
  if (!role) throw new Error("Accounts session has no recognized Sales role.");
  return role;
}

/**
 * Attempts durable role removal without making anonymous access depend on PostgreSQL.
 * @param identity Verified Accounts identity whose Sales role is absent.
 * Each later no-role request schedules another best-effort attempt; no durable queue is used.
 * @returns Nothing; completion or failure is handled asynchronously.
 */
function scheduleSalesDeauthorization(identity: CompanyOidcIdentity): void {
  void resolveSalesCompanyPrincipal(db, identity).catch((error: unknown) => {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "sales_deauthorization_deferred",
        companyAccountId: identity.sub,
        detail: error instanceof Error ? error.message : String(error),
      }),
    );
  });
}

/**
 * Returns the validated Sales OIDC configuration for this process.
 * @returns Confidential client configuration derived from the runtime environment.
 */
function getSalesOidcConfig(): ReturnType<
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
export function getSalesOidcClient(): ReturnType<
  typeof createCompanyOidcClient
> {
  client ??= createCompanyOidcClient({ config: getSalesOidcConfig() });
  return client;
}

/**
 * Reads one product-local cookie from NextRequest or a standard Request.
 * @param request Request carrying Sales cookies.
 * @param name Exact host-only cookie name.
 * @returns Cookie value or undefined.
 */
export function readSalesCookie(
  request: Request,
  name: string,
): string | undefined {
  return readRequestCookie(request, name);
}

/**
 * Reads legacy session evidence only for the explicitly selected rollback adapter.
 * @param request Request carrying a legacy cookie or bearer token.
 * @returns Opaque legacy session token or undefined.
 */
function readLegacySalesToken(request: Request): string | undefined {
  const cookieToken = readSalesCookie(request, "session_token");
  if (cookieToken) return cookieToken;
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;
}

 /**
  * Resolves a legacy credential session through its exact app-local Sales mapping.
  * @param request Request carrying legacy session evidence.
 * @returns The authentication outcome for the legacy session.
 */
async function authenticateLegacySalesRequest(
  request: Request,
): Promise<SalesRequestAuthenticationResult> {
  const token = readLegacySalesToken(request);
  if (!token) return { kind: "no-session" };
  const session = await validateSession(db, token);
  if (!session) return { kind: "no-session" };
  const principal = await resolveLegacySalesCompanyPrincipal(db, session.user.id);
  return principal
    ? { kind: "authenticated", principal }
    : { kind: "no-sales-role" };
}

/**
 * Maps exact Sales roles into the compatibility user projection.
 * @param identity Verified Sales audience identity.
 * @returns Product-local user consumed by UI and tRPC context.
 */
export async function salesSessionUser(
  identity: CompanyOidcIdentity,
): Promise<ResolvedSalesCompanyPrincipal | null> {
  if (hasSalesRole(identity)) return resolveSalesCompanyPrincipal(db, identity);
  scheduleSalesDeauthorization(identity);
  return null;
}

/**
 * Resolves a request's active Accounts session into its durable Sales principal.
 * @param request Request carrying the host-only Sales application cookie.
 * @returns The authentication outcome for the Sales application session.
 */
export async function authenticateSalesRequest(
  request: Request,
): Promise<SalesRequestAuthenticationResult> {
  if (isLegacySalesAuthEnabled())
    return authenticateLegacySalesRequest(request);
  const token = readSalesCookie(request, SALES_SESSION_COOKIE);
  if (!token) return { kind: "no-session" };
  const session = await getSalesOidcClient().introspect(token);
  if (!session) return { kind: "no-session" };
  const principal = await salesSessionUser(session.identity);
  return principal
    ? { kind: "authenticated", principal }
    : { kind: "no-sales-role" };
}
