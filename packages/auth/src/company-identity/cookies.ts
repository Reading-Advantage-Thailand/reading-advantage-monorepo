/**
 * Reads one exact cookie from a NextRequest-compatible or standard request.
 * @param request The request that carries product cookies.
 * @param name The exact cookie name.
 * @returns The first cookie value, or undefined when the cookie is absent.
 */
export function readRequestCookie(
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
