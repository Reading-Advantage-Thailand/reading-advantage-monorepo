/** Version of the canonical company username normalization algorithm. */
export const COMPANY_USERNAME_NORMALIZATION_VERSION = 1 as const;

const NORMALIZED_COMPANY_USERNAME_PATTERN =
  /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

/**
 * Determines whether a value contains a NUL or ASCII control character.
 * @param value The string to inspect.
 * @returns Whether the value contains a forbidden control character.
 */
function containsAsciiControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return true;
    }
  }
  return false;
}

/**
 * Normalizes a company username with the immutable Version 1 algorithm.
 * @param value The case-preserving username supplied at an identity boundary.
 * @returns The lowercase ASCII username used for equality and uniqueness.
 * @throws When the input is not a string or contains unsupported characters or length.
 */
export function normalizeCompanyUsernameV1(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError("Company username must be a string.");
  }

  if (containsAsciiControl(value)) {
    throw new Error("Company username must not contain control characters.");
  }

  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!NORMALIZED_COMPANY_USERNAME_PATTERN.test(normalized)) {
    throw new Error(
      "Company username must be 1-64 ASCII characters, begin and end with a letter or digit, and use only letters, digits, period, underscore, or hyphen.",
    );
  }

  return normalized;
}

/**
 * Normalizes a company username using the currently approved algorithm version.
 * @param value The case-preserving username supplied at an identity boundary.
 * @returns The canonical username used for equality and uniqueness.
 * @throws When the current normalization algorithm rejects the username.
 */
export function normalizeCompanyUsername(value: string): string {
  return normalizeCompanyUsernameV1(value);
}
