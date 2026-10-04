import { z } from "zod";

/** Shortest password length that the system accepts when a password is set. */
export const PASSWORD_MIN_LENGTH = 8;

/** Longest password length that the system accepts anywhere (set or login). */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Shared Zod schema for a new password: 8 to 128 characters.
 * Use it wherever a user or an admin sets a password.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH);
