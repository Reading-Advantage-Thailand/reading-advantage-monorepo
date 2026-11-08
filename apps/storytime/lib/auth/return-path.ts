/**
 * The return-path check of the sign-in (design section 2, AC-4.2).
 *
 * A scanned page comes back after the sign-in only when `next` names a Storytime page of the same
 * origin. Every other value falls back to `/<locale>/st`, so the sign-in never sends a visitor to
 * another site.
 */

/** The longest accepted path. */
const MAX_LENGTH = 200;

/** The Storytime pages a visitor may come back to. */
const ALLOWED_PATH = /^\/(th|en)\/(st|teacher)\//;

/**
 * Reports whether a text holds a control character.
 * @param value The text to read.
 * @returns `true` when the text holds a control character.
 */
function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 32 || code === 127) return true;
  }
  return false;
}

/**
 * Reports whether a text holds a code point above U+007F.
 * @param value The text to read.
 * @returns `true` when the text holds a non-ASCII code point (each half of a surrogate pair counts).
 */
function hasNonAscii(value: string): boolean {
  return /[\u0080-￿]/.test(value);
}

/**
 * Reports whether a path holds a dot segment.
 * @param path The path to read.
 * @returns `true` when the path holds a `.` or `..` segment.
 */
function hasDotSegment(path: string): boolean {
  return path.split("/").some((segment) => segment === "." || segment === "..");
}

/**
 * Reads the return path of a sign-in.
 *
 * The raw value must be ASCII, because it becomes a `Location` header and a header value cannot
 * hold a code point above U+007F (finding F90). A non-ASCII character must arrive percent-encoded.
 * The check reads the raw value only, so a percent-encoded value such as `%C3%A9` stays accepted.
 * @param value The raw `next` value of the request.
 * @param fallback The path to use when the value is not an ASCII Storytime path.
 * @returns The accepted path, or the fallback.
 */
export function safeReturnPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (value.length === 0 || value.length > MAX_LENGTH) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  if (hasControlCharacter(value)) return fallback;
  if (hasNonAscii(value)) return fallback;
  if (!ALLOWED_PATH.test(value)) return fallback;
  if (hasDotSegment(value)) return fallback;
  if (value.includes("%")) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      return fallback;
    }
    if (decoded.includes("//")) return fallback;
    if (hasControlCharacter(decoded)) return fallback;
    if (hasDotSegment(decoded)) return fallback;
  }
  return value;
}
