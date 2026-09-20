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
 * Checks whether a value is safe for a local return path.
 * @param pathname Current request pathname.
 * @param search Current request query string.
 * @returns Whether the path and query are safe.
 */
export function isSafeReturnTo(pathname: string, search: string): boolean {
  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("?") ||
    pathname.includes("#") ||
    pathname.includes("\\") ||
    hasControlCharacter(pathname)
  ) {
    return false;
  }
  if (
    search !== "" &&
    (!search.startsWith("?") || search.startsWith("??") || search.includes("#"))
  ) {
    return false;
  }
  const returnTo = `${pathname}${search}`;
  return (
    !hasControlCharacter(search) &&
    !hasMalformedPercentEncoding(search) &&
    !search.includes("\\") &&
    returnTo.length <= 2_048
  );
}