/**
 * Shared join code helpers that can safely run in client and server environments.
 * Keep all Prisma-dependent logic in server-only modules to avoid bundling issues.
 *
 * Canonical definitions live in @reading-advantage/types/contracts/class.
 * These re-exports preserve backward compatibility for existing imports.
 */

export {
  JOIN_CODE_CHARSET,
  JOIN_CODE_LENGTH,
  JOIN_CODE_PATTERN,
  isValidJoinCodeFormat,
} from '@reading-advantage/types/contracts/class';

import { JOIN_CODE_CHARSET, JOIN_CODE_LENGTH } from '@reading-advantage/types/contracts/class';

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
    .filter((char) => JOIN_CODE_CHARSET.includes(char))
    .join('')
    .slice(0, JOIN_CODE_LENGTH);
}
