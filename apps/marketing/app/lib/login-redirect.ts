/**
 * Reports whether a value contains a control character.
 * @param value Value to inspect.
 * @returns Whether the value contains a control character.
 */
function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.codePointAt(0);
    return code !== undefined && (code <= 0x1f || code === 0x7f);
  });
}

/**
 * Reports whether a value has malformed percent encoding.
 * @param value Value to inspect.
 * @returns Whether percent encoding is malformed.
 */
function hasMalformedPercentEncoding(value: string): boolean {
  try {
    decodeURIComponent(value);
    return false;
  } catch {
    return true;
  }
}

/**
 * Checks whether a pathname with query is safe for a local return path.
 * @param pathnameWithQuery Current pathname with its query string.
 * @returns Whether the value is a safe relative return path.
 */
function isSafeReturnPath(pathnameWithQuery: string): boolean {
  if (
    !pathnameWithQuery.startsWith("/") ||
    pathnameWithQuery.startsWith("//") ||
    pathnameWithQuery.includes("\\") ||
    pathnameWithQuery.includes("#") ||
    hasControlCharacter(pathnameWithQuery) ||
    hasMalformedPercentEncoding(pathnameWithQuery) ||
    pathnameWithQuery.length > 2_048
  ) {
    return false;
  }
  return true;
}

/**
 * Builds the Marketing login redirect for the current path and query.
 * @param pathnameWithQuery Current pathname including its query string.
 * @returns Login path with the original destination carried as `returnTo`.
 */
export function redirectToLogin(pathnameWithQuery: string): string {
  const returnTo = isSafeReturnPath(pathnameWithQuery)
    ? pathnameWithQuery
    : "/";
  return `/login?${new URLSearchParams({ returnTo }).toString()}`;
}
