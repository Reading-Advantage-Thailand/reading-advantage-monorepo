/**
 * The client address of a sign-in attempt (test strategy P2b.7).
 *
 * The service runs behind Cloud Run, which appends the address of the caller to the
 * `X-Forwarded-For` header. The last entry is the address that Cloud Run saw, so the rate limit
 * keys on that entry. A forged header can therefore add entries but never move the key.
 */

/**
 * Reads the client address of a request.
 * @param headers The headers of the request.
 * @returns The client address, or `unknown` when the request names none.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded !== null) {
    const entries = forwarded
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    if (entries.length > 0) return entries[entries.length - 1];
  }
  const realIp = headers.get("x-real-ip");
  if (realIp !== null && realIp.trim().length > 0) return realIp.trim();
  return "unknown";
}
