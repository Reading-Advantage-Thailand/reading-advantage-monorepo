import { siteConfig } from "@/configs/site-config";

/** The Storytime QR host (decision S23): the printed QR codes name `https://<host>/th/st/<level>/<week>`. */
export const STORYTIME_HOST = "storytime.reading-advantage.com";

/**
 * Tells whether a request host is the Storytime host.
 * @param host The `Host` header, maybe with a port.
 * @returns True for the Storytime host.
 */
export function isStorytimeHost(host: string | null | undefined): boolean {
  return host?.split(":")[0].toLowerCase() === STORYTIME_HOST;
}

/**
 * The redirect of a path that the Storytime host does not serve: that host serves only the week
 * pages (`/<locale>/st/...`, or `/st/...` before the locale prefix); every other page goes to the
 * same path on the Primary host. The proxy matcher already leaves the assets alone.
 * @param host The `Host` header.
 * @param pathname The request path.
 * @returns The Primary URL to redirect to, or null when the request stays.
 */
export function storytimeHostRedirect(host: string | null | undefined, pathname: string): string | null {
  if (!isStorytimeHost(host) || /^\/(?:[a-z]{2}\/)?st(?:\/|$)/.test(pathname)) return null;
  return `${siteConfig.url}${pathname}`;
}
