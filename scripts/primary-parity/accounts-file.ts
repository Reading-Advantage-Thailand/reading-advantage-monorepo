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
    /** New classroom id of the student class (STUDENT only); the capture script reads its class sheet. */
    classroomId: z.string().min(1).optional(),
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

/** Parsed accounts file. */
export type AccountsFileData = z.output<typeof AccountsFile>;

/**
 * Checks that the accounts file has an entry for every signed-in role that a pair list uses.
 * @param file The parsed accounts file.
 * @param roles The roles of the pairs (`PUBLIC` needs no entry).
 * @returns The entry of each needed role.
 * @throws When a needed role has no entry.
 */
export function requireRoles(
  file: AccountsFileData,
  roles: Iterable<string>,
): Partial<Record<z.output<typeof SignedInRole>, z.output<typeof AccountEntry>>> {
  const missing = [...new Set(roles)].filter((r) => r !== "PUBLIC" && !file.accounts[r as z.output<typeof SignedInRole>]);
  if (missing.length) throw new Error(`accounts file has no entry for role: ${missing.join(", ")}`);
  return file.accounts;
}
