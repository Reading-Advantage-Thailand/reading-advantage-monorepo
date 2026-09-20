/**
 * Shared public-origin and return-path helpers for the Marketing and Sales
 * applications.
 *
 * The module is Edge-safe by design: it imports no Node built-ins so the
 * Sales proxy (Edge middleware) can consume the dedicated
 * `@reading-advantage/auth/public-url` subpath without pulling the rest of
 * the package (which uses `node:crypto`).
 *
 * @packageDocumentation
 */

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "::1", "localhost"]);

/** Configuration used to approve browser-visible origins for one product. */
export interface PublicOriginGuardConfig {
  /** Canonical production origin of the product. */
  defaultOrigin: string;
  /** Name of the environment variable holding semicolon-separated preview origins. */
  previewOriginsEnv: string;
  /** Environment values used to resolve approved origins. Defaults to `process.env`. */
  environment?: Readonly<Record<string, string | undefined>>;
}

/**
 * Reports whether a value contains a control character.
 * @param value Value to inspect.
 * @returns Whether the value contains a control character.
 */
export function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.codePointAt(0);
    return code !== undefined && (code <= 0x1f || code === 0x7f);
  });
}

/**
 * Reports whether a value has malformed percent encoding.
 * @param value Value to inspect.
 * @returns Whether the percent encoding is malformed.
 */
export function hasMalformedPercentEncoding(value: string): boolean {
  try {
    decodeURIComponent(value);
    return false;
  } catch {
    return true;
  }
}

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
 * Creates the public-origin guard for one product.
 *
 * The returned functions read the environment at call time so tests and
 * runtimes can inject configuration through `config.environment` or the
 * real `process.env`.
 * @param config Product-specific origin configuration.
 * @returns The callback-origin and public-origin resolvers for the product.
 * @throws When a configured origin or preview origin is malformed.
 */
export function createPublicOriginGuard(config: PublicOriginGuardConfig): {
  getCallbackOrigin: () => URL;
  getPublicOrigin: (request: Request) => URL;
} {
  const environment = config.environment ?? process.env;

  /**
   * Reports whether an origin is an approved browser origin for the product.
   * @param origin Candidate public origin.
   * @returns Whether the origin is canonical, configured, or local development.
   */
  function isApprovedOrigin(origin: URL): boolean {
    if (
      environment.NODE_ENV !== "production" &&
      origin.protocol === "http:" &&
      LOCAL_HOSTNAMES.has(origin.hostname)
    ) {
      return true;
    }
    if (origin.protocol !== "https:") return false;
    const canonicalOrigins = new Set(
      [
        config.defaultOrigin,
        configuredOrigin(environment.NEXT_PUBLIC_API_URL),
        configuredOrigin(environment.COMPANY_AUTH_OIDC_REDIRECT_URI),
      ].filter((value): value is string => value !== undefined),
    );
    const previewOrigins = configuredPreviewOrigins(
      environment[config.previewOriginsEnv],
    );
    return canonicalOrigins.has(origin.origin) || previewOrigins.has(origin.origin);
  }

  /**
   * Gets the configured product OIDC callback origin.
   * @returns The callback origin used by Accounts.
   * @throws When the callback URL configuration is malformed.
   */
  function getCallbackOrigin(): URL {
    const callbackOrigin = configuredOrigin(
      environment.COMPANY_AUTH_OIDC_REDIRECT_URI,
    );
    if (environment.COMPANY_AUTH_OIDC_REDIRECT_URI && !callbackOrigin) {
      throw new Error("PUBLIC_ORIGIN_INVALID");
    }
    return new URL(callbackOrigin ?? config.defaultOrigin);
  }

  /**
   * Builds the browser-visible origin for a request.
   * @param request Incoming browser request.
   * @returns Public origin URL.
   * @throws When the resolved origin is not approved.
   */
  function getPublicOrigin(request: Request): URL {
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

  return { getCallbackOrigin, getPublicOrigin };
}
