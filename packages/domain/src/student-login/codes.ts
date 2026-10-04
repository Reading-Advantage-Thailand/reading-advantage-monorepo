import { createHash, randomBytes, randomInt } from "node:crypto";
import { hashPassword, verifyPassword } from "@reading-advantage/auth";
import {
  CLASS_CODE_ALPHABET,
  CLASS_CODE_LENGTH,
  PICTURE_GRID_SIZE,
  PICTURE_SEQUENCE_LENGTH,
} from "./contracts.js";

/**
 * Makes a random class code from the Phase 1 alphabet.
 * @param pick Returns a random integer below the given bound. Tests replace it.
 * @returns A code of `CLASS_CODE_LENGTH` characters.
 */
export function generateClassCode(pick: (max: number) => number = randomInt): string {
  return Array.from({ length: CLASS_CODE_LENGTH }, () => CLASS_CODE_ALPHABET[pick(CLASS_CODE_ALPHABET.length)]).join("");
}

/**
 * Hashes a class code for storage and lookup. SHA-256 is enough: a code lives 3 hours
 * and every lookup path is rate limited.
 * @param code A validated, upper-case class code.
 * @returns The hex SHA-256 digest.
 */
export function hashClassCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Makes a random picture sequence.
 * @param pick Returns a random integer below the given bound. Tests replace it.
 * @returns `PICTURE_SEQUENCE_LENGTH` picture indexes, each from 0 to `PICTURE_GRID_SIZE - 1`.
 */
export function generatePictureSequence(pick: (max: number) => number = randomInt): number[] {
  return Array.from({ length: PICTURE_SEQUENCE_LENGTH }, () => pick(PICTURE_GRID_SIZE));
}

/**
 * Hashes a picture sequence with argon2id.
 * @param pictures The picture indexes in tap order.
 * @returns The argon2id hash.
 */
export function hashPictureSequence(pictures: readonly number[]): Promise<string> {
  return hashPassword(pictures.join("-"));
}

/**
 * Checks a picture sequence against a stored argon2id hash.
 * @param pictures The picture indexes in tap order.
 * @param hash The stored hash.
 * @returns True when the sequence matches.
 */
export function verifyPictureSequence(pictures: readonly number[], hash: string): Promise<boolean> {
  return verifyPassword(pictures.join("-"), hash);
}

let dummyHash: Promise<string> | undefined;

/**
 * Runs one argon2id verification against a throw-away hash. Sign-in calls it for an
 * unknown student so that the response time does not tell a real handle from a false one.
 * @returns Resolves when the verification ends.
 */
export async function burnVerifyTime(): Promise<void> {
  dummyHash ??= hashPictureSequence(generatePictureSequence()).catch((error) => {
    dummyHash = undefined;
    throw error;
  });
  await verifyPictureSequence([0, 0, 0], await dummyHash);
}

/**
 * Makes a QR card token: 256 random bits as base64url without padding.
 * @returns A token of `QR_TOKEN_LENGTH` characters.
 */
export function generateCardToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hashes a card token for storage and lookup. SHA-256 is enough because the token has 256 bits of entropy.
 * @param token A card token.
 * @returns The hex SHA-256 digest.
 */
export function hashCardToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
