/**
 * Shorten a GitHub Pull Request URL to `owner/repo/pull/123` format.
 * Falls back to the original URL if parsing fails.
 */
export function getPrDisplayName(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 4) {
      return `${parts[0]}/${parts[1]}/pull/${parts[3]}`;
    }
  } catch {
    // fall through
  }
  return url;
}
