const DEFAULT_MARKETING_ORIGIN = "https://marketing.reading-advantage.com";
const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "::1", "localhost"]);

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
 * Parses the configured exact preview origins.
 * @param value Semicolon-separated preview origins.
 * @returns Exact configured preview origins.
 * @throws When a configured preview entry is not an HTTPS origin.
 */
function configuredPreviewOrigins(value: string | undefined): Set<string> {
  if (!value) return new Set();
  const origins = new Set<string>();
  for (const rawEntry of value.split(";")) {
    const entry = rawEntry.trim();
    if (!entry) throw new Error("PUBLIC_ORIGIN_INVALID");
    let url: URL;
    try {
      url = new URL(entry);
    } catch {
      throw new Error("PUBLIC_ORIGIN_INVALID");
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error("PUBLIC_ORIGIN_INVALID");
    }
    origins.add(url.origin);
  }
  return origins;
}

/**
 * Reports whether an origin is an approved Marketing browser origin.
 * @param origin Candidate public origin.
 * @returns Whether the origin is canonical, configured, or local development.
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
      DEFAULT_MARKETING_ORIGIN,
      configuredOrigin(process.env.NEXT_PUBLIC_API_URL),
      configuredOrigin(process.env.COMPANY_AUTH_OIDC_REDIRECT_URI),
    ].filter((value): value is string => value !== undefined),
  );
  const previewOrigins = configuredPreviewOrigins(
    process.env.MARKETING_PREVIEW_ORIGINS,
  );
  return canonicalOrigins.has(origin.origin) || previewOrigins.has(origin.origin);
}

/**
 * Gets the configured Marketing OIDC callback origin.
 * @returns The callback origin used by Accounts.
 * @throws When the callback URL configuration is malformed.
 */
export function getMarketingCallbackOrigin(): URL {
  const callbackOrigin = configuredOrigin(
    process.env.COMPANY_AUTH_OIDC_REDIRECT_URI,
  );
  if (process.env.COMPANY_AUTH_OIDC_REDIRECT_URI && !callbackOrigin) {
    throw new Error("PUBLIC_ORIGIN_INVALID");
  }
  return new URL(callbackOrigin ?? DEFAULT_MARKETING_ORIGIN);
}

/**
 * Builds the browser-visible origin for a request.
 * @param request Incoming browser request.
 * @returns Public origin URL.
 * @throws When the resolved origin is not approved.
 */
export function getPublicOrigin(request: Request): URL {
  const publicOrigin = new URL(request.url);
  const forwardedProto = firstForwardedValue(
    request.headers.get("x-forwarded-proto"),
  );
  const forwardedHost = firstForwardedValue(
    request.headers.get("x-forwarded-host"),
  );
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
