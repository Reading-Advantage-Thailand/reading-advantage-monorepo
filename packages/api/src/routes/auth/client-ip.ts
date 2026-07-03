import type { NextRequest } from "next/server";

/**
 * Parses the trusted-proxy count from the environment.
 *
 * `TRUST_PROXY_COUNT` is the number of reverse proxies between the
 * application and the internet. The rightmost N entries of
 * X-Forwarded-For are treated as trusted proxies and are skipped when
 * determining the client IP.
 *
 * When unset or invalid the function returns `undefined`, signalling that
 * the legacy leftmost-XFF behavior should be used for backward
 * compatibility. Production deployments SHOULD set this explicitly.
 */
function getTrustProxyCount(): number | undefined {
  const raw = process.env.TRUST_PROXY_COUNT;
  if (raw === undefined) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return undefined;
  return parsed;
}

/**
 * Extracts the client IP from a Next.js request in a proxy-aware way.
 *
 * When `TRUST_PROXY_COUNT` is set, the rightmost N X-Forwarded-For entries
 * are treated as trusted proxies and the client IP is the entry
 * immediately to their left. This prevents an attacker from prepending
 * arbitrary IPs to X-Forwarded-For in order to spoof their address or
 * poison another client's rate-limit bucket.
 *
 * When `TRUST_PROXY_COUNT` is unset, the legacy behavior is preserved:
 * the leftmost X-Forwarded-For entry is used. Production deployments
 * should always configure `TRUST_PROXY_COUNT` explicitly.
 *
 * Falls back to X-Real-IP when X-Forwarded-For is absent or does not
 * contain enough entries. Returns undefined when no trustworthy IP can
 * be determined.
 *
 * @param request - The incoming Next.js request.
 * @returns The client IP string, or undefined when unavailable.
 */
export function getClientIp(request: NextRequest): string | undefined {
  const trustProxyCount = getTrustProxyCount();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const ips = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (trustProxyCount === undefined) {
      // Legacy behavior for backward compatibility.
      return ips[0];
    }

    if (trustProxyCount === 0) {
      // No proxies are trusted; ignore user-supplied XFF.
      // Intentionally fall through to X-Real-IP / undefined.
    } else if (ips.length > trustProxyCount) {
      // The client is the entry just before the trusted proxies on the right.
      return ips[ips.length - trustProxyCount - 1];
    }
  }

  const xri = request.headers.get("x-real-ip");
  if (xri) {
    return xri.trim();
  }

  return undefined;
}
