import {
  createCompanyIdentityServiceAuthConfig,
  createCompanyOidcClient,
  readRequestCookie,
  type CompanyOidcIdentity,
} from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { resolveCodecampCompanyPrincipal } from "@reading-advantage/domain";

/**
 * Resolves a Codecamp OIDC cookie name for the current runtime environment.
 * @param baseName Unprefixed Codecamp OIDC cookie name.
 * @returns Cookie name with the host-only prefix in production.
 */
export function resolveCodecampCookieName(
  baseName: "ra_codecamp_session" | "ra_codecamp_oidc_tx",
): string {
  return process.env.NODE_ENV === "production"
    ? `__Host-${baseName}`
    : baseName;
}

/** Codecamp application-session cookie. */
export const CODECAMP_SESSION_COOKIE = resolveCodecampCookieName(
  "ra_codecamp_session",
);
/** Short-lived Codecamp authorization transaction cookie. */
export const CODECAMP_TRANSACTION_COOKIE = resolveCodecampCookieName(
  "ra_codecamp_oidc_tx",
);

let client: ReturnType<typeof createCompanyOidcClient> | undefined;

/**
 * Returns the process-local Codecamp OIDC client backed only by Accounts endpoints.
 * @returns Validated confidential OIDC client.
 */
export function getCodecampOidcClient(): ReturnType<
  typeof createCompanyOidcClient
> {
  client ??= createCompanyOidcClient({
    config: createCompanyIdentityServiceAuthConfig({
      NODE_ENV: process.env.NODE_ENV,
      COMPANY_AUTH_ISSUER_URL: process.env.COMPANY_AUTH_ISSUER_URL,
      COMPANY_AUTH_OIDC_CLIENT_ID: process.env.COMPANY_AUTH_OIDC_CLIENT_ID,
      COMPANY_AUTH_OIDC_CLIENT_SECRET:
        process.env.COMPANY_AUTH_OIDC_CLIENT_SECRET,
      COMPANY_AUTH_OIDC_REDIRECT_URI:
        process.env.COMPANY_AUTH_OIDC_REDIRECT_URI,
      COMPANY_AUTH_EXPECTED_AUDIENCE:
        process.env.COMPANY_AUTH_EXPECTED_AUDIENCE,
      COMPANY_AUTH_CLOCK_SKEW_SECONDS:
        process.env.COMPANY_AUTH_CLOCK_SKEW_SECONDS,
    }),
  });
  return client;
}

/**
 * Reads one product-local cookie from NextRequest or a standard Request.
 * @param request Request carrying Codecamp cookies.
 * @param name Exact host-only cookie name.
 * @returns Cookie value or undefined.
 */
export function readCodecampCookie(
  request: Request,
  name: string,
): string | undefined {
  return readRequestCookie(request, name);
}

/**
 * Selects the exact Codecamp application role from verified audience claims.
 * @param identity Verified Codecamp audience identity.
 * @returns Highest-authority recognized Codecamp role.
 * @throws When the identity has no recognized Codecamp role.
 */
export function codecampSessionRole(identity: CompanyOidcIdentity) {
  const role = (["ADMIN", "TEACHER", "INTERN", "STUDENT"] as const).find(
    (candidate) => identity.roles.includes(candidate),
  );
  if (!role)
    throw new Error("Accounts session has no recognized Codecamp role.");
  return role;
}

/**
 * Resolves a verified Accounts identity to its existing Codecamp product owner.
 * @param identity Verified Codecamp-audience identity.
 * @returns Existing local user, or null when role or mapping access was removed.
 */
export async function resolveCodecampSessionUser(
  identity: CompanyOidcIdentity,
) {
  const resolved = await resolveCodecampCompanyPrincipal(db, identity);
  return resolved?.user ?? null;
}
