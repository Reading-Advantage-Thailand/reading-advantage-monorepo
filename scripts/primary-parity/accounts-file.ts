import { z } from "zod";
import { SignedInRole } from "./pairs.js";

/**
 * Sign-in data for the legacy app. Staff use email and password.
 * A student uses the class code and the student name.
 */
export const LegacySignIn = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("password"), email: z.string().min(1), password: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("classCode"), classCode: z.string().min(1), studentName: z.string().min(1) }).strict(),
]);

/**
 * Sign-in data for the new app. `password` is empty until the forced change
 * runs; the capture script then stores the new password here.
 */
export const NewSignIn = z
  .object({
    username: z.string().min(1),
    password: z.string().min(1).optional(),
  })
  .strict();

/** One matched user: the same `users.id` in both copies. */
export const AccountEntry = z
  .object({
    userId: z.string().min(1),
    legacy: LegacySignIn,
    new: NewSignIn,
  })
  .strict();

/**
 * The file `~/Desktop/primary-parity-acceptance/accounts.json`.
 *
 * Rule: the file has mode 600, lives in the private folder (mode 700), and
 * is never inside a git repository. It holds passwords and a class code, so
 * no tool prints it and no report copies a field of it.
 * `PUBLIC` is not a key: a public pair needs no sign-in.
 */
export const AccountsFile = z
  .object({
    legacyDatabase: z.string().min(1),
    newDatabase: z.string().min(1),
    accounts: z.record(SignedInRole, AccountEntry),
  })
  .strict();

export type AccountsFileData = z.output<typeof AccountsFile>;
