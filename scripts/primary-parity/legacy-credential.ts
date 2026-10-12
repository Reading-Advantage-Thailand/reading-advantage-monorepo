import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/** Scrypt settings of legacy `bfea121` `lib/password.ts:8-45` (Better-Auth defaults). */
const OPTIONS = { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 } as const;

const derive = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, 64, OPTIONS, (err, key) => (err ? reject(err) : resolve(key))),
  );

/**
 * Hashes a password in the legacy format `<32 hex salt>:<128 hex key>`.
 * @param password The clear password; the function applies NFKC first.
 * @returns The hash string that the legacy sign-in accepts.
 */
export async function hashLegacyPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await derive(password, salt)).toString("hex")}`;
}

/**
 * Checks a password against a legacy scrypt hash in constant time.
 * @param input The hash and the clear password.
 * @returns True when the password matches; false for a wrong password or a malformed hash.
 */
export async function verifyLegacyPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  const [salt, key] = hash.split(":");
  if (!salt || !key || !/^[0-9a-f]+$/.test(key)) return false;
  const expected = Buffer.from(key, "hex");
  const actual = await derive(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
