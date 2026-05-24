/**
 * Join Code Generation Utility
 * Generates unique 6-character alphanumeric codes for class join functionality
 */

import { db as defaultDb, eq } from '@reading-advantage/db';
import { scienceClasses } from '@reading-advantage/db/schema';

import {
  JOIN_CODE_CHARSET,
  JOIN_CODE_LENGTH,
  isValidJoinCodeFormat,
} from '@/lib/utils/join-code-format';

/**
 * Minimal slice of the Drizzle database client that `generateUniqueJoinCode`
 * needs. Both the regular `db` and a transaction client (`tx` from
 * `db.transaction(...)`) satisfy this shape, so callers can pass either.
 */
type JoinCodeDb = Pick<typeof defaultDb, 'select'>;

const CHARSET = JOIN_CODE_CHARSET;
const CODE_LENGTH = JOIN_CODE_LENGTH;
const MAX_RETRIES = 5;

/**
 * Generate a random 6-character alphanumeric join code
 * Excludes ambiguous characters: I, O, 0, 1
 */
export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    code += CHARSET[randomIndex];
  }
  return code;
}

/**
 * Generate a unique join code by checking database for collisions
 * Retries up to MAX_RETRIES times if collision occurs
 *
 * @param db - Drizzle database client or transaction handle
 * @returns Unique join code
 * @throws Error if unable to generate unique code after MAX_RETRIES attempts
 */
export async function generateUniqueJoinCode(
  db: JoinCodeDb
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const code = generateJoinCode();

    // Check if code already exists
    const [existing] = await db
      .select({ id: scienceClasses.id })
      .from(scienceClasses)
      .where(eq(scienceClasses.joinCode, code))
      .limit(1);

    if (!existing) {
      return code;
    }

    // If last attempt failed, throw error
    if (attempt === MAX_RETRIES) {
      throw new Error(
        `Failed to generate unique join code after ${MAX_RETRIES} attempts`
      );
    }
  }

  // This should never happen due to the loop logic, but TypeScript needs it
  throw new Error('Unexpected error in join code generation');
}

export { isValidJoinCodeFormat };
