const DEFAULT_CODECAMP_ORIGIN = "https://codecamp.reading-advantage.com";
const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "::1", "localhost"]);
const CLOUD_RUN_TAG_HOST_PATTERN =
  /^sso-candidate---codecamp-advantage-[a-z][a-z0-9-]{4,28}[a-z0-9]\.as\.a\.run\.app$/;

/**
 * Gets the first value from a forwarded header.
 * @param value Forwarded header value.
 * @returns The first header value, if present.
 */
function firstForwardedValue(value: string | null): string | undefined {
  const forwardedValue = value?.split(",")[0]?.trim();
  return forwardedValue || undefined;
}

/**
 * Reports whether a forwarded host has an explicit port.
 * @param host Forwarded host value.
 * @returns Whether the host has a port.
 */
function hasExplicitPort(host: string): boolean {
  return host.startsWith("[") ? host.includes("]:") : host.includes(":");
}

/**
 * Gets an origin from an existing public URL configuration value.
 * @param value Configured public URL or callback URL.
 * @returns The configured origin, if valid.
 */
function configuredOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/**
 * Reports whether an origin is an approved Codecamp browser origin.
 * @param origin Candidate public origin.
 * @returns Whether the origin is canonical, a tagged service, or local development.
 */
function isApprovedOrigin(origin: URL): boolean {
  if (
    process.env.NODE_ENV !== "production" &&
    origin.protocol === "http:" &&
    LOCAL_HOSTNAMES.has(origin.hostname)
  ) {
    return true;
  }
  if (origin.protocol !== "https:") return false;

  const canonicalOrigins = new Set(
    [
      DEFAULT_CODECAMP_ORIGIN,
      configuredOrigin(process.env.NEXT_PUBLIC_API_URL),
      configuredOrigin(process.env.COMPANY_AUTH_OIDC_REDIRECT_URI),
    ].filter((value): value is string => value !== undefined),
  );
  return (
    canonicalOrigins.has(origin.origin) ||
    CLOUD_RUN_TAG_HOST_PATTERN.test(origin.hostname)
  );
}

/**
 * Builds the browser-visible origin for a request.
 *
 * @param request Incoming browser request.
 * @returns Public origin URL.
 */
export function getPublicOrigin(request: Request): URL {
  const publicOrigin = new URL(request.url);
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));

  try {
    if (forwardedProto) {
      const protocol = forwardedProto.toLowerCase();
      if (protocol !== "http" && protocol !== "https") {
        throw new Error("PUBLIC_ORIGIN_INVALID");
      }
      publicOrigin.protocol = `${protocol}:`;
    }
    if (forwardedHost) {
      publicOrigin.host = forwardedHost;
      if (!hasExplicitPort(forwardedHost)) publicOrigin.port = "";
    }
  } catch {
    throw new Error("PUBLIC_ORIGIN_INVALID");
  }
  if (!isApprovedOrigin(publicOrigin)) throw new Error("PUBLIC_ORIGIN_INVALID");
  publicOrigin.pathname = "/";
  publicOrigin.search = "";
  publicOrigin.hash = "";
  return publicOrigin;
}

/**
 * Builds a public redirect URL for a pathname.
 *
 * @param request Incoming browser request.
 * @param pathname Public destination pathname.
 * @returns Public redirect URL.
 */
export function getPublicUrl(request: Request, pathname: string): URL {
  const publicUrl = getPublicOrigin(request);
  publicUrl.pathname = pathname;
  return publicUrl;
}
