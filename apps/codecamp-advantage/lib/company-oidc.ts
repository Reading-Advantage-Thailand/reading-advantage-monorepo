import {
  createCompanyIdentityServiceAuthConfig,
  createCompanyOidcClient,
  type CompanyOidcIdentity,
} from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { resolveCodecampCompanyPrincipal } from "@reading-advantage/domain";

/** Host-only opaque Codecamp application-session cookie. */
export const CODECAMP_SESSION_COOKIE = "__Host-ra_codecamp_session";
/** Host-only short-lived Codecamp authorization transaction cookie. */
export const CODECAMP_TRANSACTION_COOKIE = "__Host-ra_codecamp_oidc_tx";

let config:
  | ReturnType<typeof createCompanyIdentityServiceAuthConfig>
  | undefined;
let client: ReturnType<typeof createCompanyOidcClient> | undefined;

/**
 * Returns the validated Codecamp OIDC configuration for this process.
 * @returns Confidential client configuration derived from the runtime environment.
 */
function getCodecampOidcConfig(): ReturnType<
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
 * Returns the trusted public Codecamp origin from the registered callback URI.
 * @returns Public origin used for post-callback browser redirects.
 */
export function getCodecampPublicOrigin(): string {
  return new URL(getCodecampOidcConfig().redirectUri).origin;
}

/**
 * Returns the process-local Codecamp OIDC client backed only by Accounts endpoints.
 * @returns Validated confidential OIDC client.
 */
export function getCodecampOidcClient(): ReturnType<
  typeof createCompanyOidcClient
> {
  client ??= createCompanyOidcClient({ config: getCodecampOidcConfig() });
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
