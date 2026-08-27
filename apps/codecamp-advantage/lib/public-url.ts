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
 * Builds the browser-visible origin for a request.
 *
 * @param request Incoming browser request.
 * @returns Public origin URL.
 */
export function getPublicOrigin(request: Request): URL {
  const publicOrigin = new URL(request.url);
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));

  if (forwardedProto) publicOrigin.protocol = `${forwardedProto}:`;
  if (forwardedHost) {
    publicOrigin.host = forwardedHost;
    if (!hasExplicitPort(forwardedHost)) publicOrigin.port = "";
  }
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
