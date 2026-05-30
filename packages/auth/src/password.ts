import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hashes a password using bcrypt with 10 salt rounds.
 * @param password - The plaintext password to hash
 * @returns The hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a bcrypt hash.
 * @param password - The plaintext password to verify
 * @param hash - The bcrypt hash to compare against
 * @returns True if password matches hash, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
