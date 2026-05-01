/**
 * Shared join code helpers that can safely run in client and server environments.
 * Keep all Prisma-dependent logic in server-only modules to avoid bundling issues.
 */

export const JOIN_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 6;

/**
 * Regex accepting only characters in `JOIN_CODE_CHARSET`.
 * Useful for form input patterns.
 */
export const JOIN_CODE_PATTERN = `[A-HJ-NP-Z2-9]{${JOIN_CODE_LENGTH}}`;

/**
 * Ensure a raw string conforms to join code expectations.
 * - Removes unsupported characters
 * - Uppercases
 * - Truncates to expected length
 */
export function sanitizeJoinCodeInput(raw: string): string {
  return raw
    .toUpperCase()
    .split('')
    .filter(char => JOIN_CODE_CHARSET.includes(char))
    .join('')
    .slice(0, JOIN_CODE_LENGTH);
}

/**
 * Validate join code format against shared constraints.
 */
export function isValidJoinCodeFormat(code: string): boolean {
  if (code.length !== JOIN_CODE_LENGTH) {
    return false;
  }

  return code.split('').every(char => JOIN_CODE_CHARSET.includes(char));
}
