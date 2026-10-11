import { randomInt } from "node:crypto";
import path from "node:path";

/** Letters and digits that are easy to read on paper: no i, l, o, 0, or 1. */
export const TEMPORARY_PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** The roles that sign in on the staff page with a username and a password (students use the class code). */
export const STAFF_ROLES = ["TEACHER", "ADMIN", "SYSTEM"] as const;

/** One line of the hand-out list that the team gives to the staff at the cutover. */
export type HandoutRow = { school: string; name: string; role: string; username: string; temporaryPassword: string };

/** A staff account that the script can give a temporary password. */
export type StaffAccount = { username: string; role: string; pendingSince: Date | null };

/**
 * Chooses the accounts that get a temporary password. SYSTEM can change the data of every school,
 * so a SYSTEM account gets one only when the operator names it.
 * @param staff The TEACHER, ADMIN, and SYSTEM accounts of the target.
 * @param options.system The usernames of the SYSTEM accounts that get a password.
 * @param options.reissue True to include accounts with a temporary password that is not changed yet.
 * @returns The chosen accounts, and the SYSTEM accounts left without a password.
 * @throws When a name in options.system is not a SYSTEM account of the target.
 */
export function selectForIssue<T extends StaffAccount>(
  staff: T[],
  options: { system: string[]; reissue: boolean },
): { selected: T[]; unnamedSystem: T[] } {
  const systemNames = new Set(options.system);
  const unknown = [...systemNames].filter((name) => !staff.some((user) => user.role === "SYSTEM" && user.username === name));
  if (unknown.length) throw new Error(`Not a SYSTEM account in the target: ${unknown.join(", ")}`);
  const unnamedSystem = staff.filter((user) => user.role === "SYSTEM" && !systemNames.has(user.username));
  const selected = staff.filter(
    (user) => (user.role !== "SYSTEM" || systemNames.has(user.username)) && (options.reissue || !user.pendingSince),
  );
  return { selected, unnamedSystem };
}

/**
 * Makes a random temporary password in three groups of four, such as `k7mq-x3ra-p9vd` (about 59 bits).
 * @param pick Returns a random integer from 0 to max - 1; tests give a fixed sequence.
 * @returns The temporary password.
 */
export function generateTemporaryPassword(pick: (max: number) => number = randomInt): string {
  const group = () => Array.from({ length: 4 }, () => TEMPORARY_PASSWORD_ALPHABET[pick(TEMPORARY_PASSWORD_ALPHABET.length)]).join("");
  return [group(), group(), group()].join("-");
}

/**
 * Tells if a path is the directory or a path in it, so the script can refuse a hand-out file in the repository.
 * @param file The path to check.
 * @param directory The directory.
 * @returns True when the path is in the directory.
 */
export function isInsideDirectory(file: string, directory: string): boolean {
  const relative = path.relative(path.resolve(directory), path.resolve(file));
  return relative === "" || (relative.split(path.sep)[0] !== ".." && !path.isAbsolute(relative));
}

/**
 * Writes the hand-out list as CSV. A cell that a spreadsheet would read as a formula gets a leading quote mark.
 * @param rows The issued passwords.
 * @returns The CSV text with a header line.
 */
export function toHandoutCsv(rows: HandoutRow[]): string {
  const cell = (value: string) => {
    const text = /^[=+\-@\t\r]/u.test(value) ? `'${value}` : value;
    return /[",\n\r]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const lines = [["school", "name", "role", "username", "temporary password"]];
  for (const row of rows) lines.push([row.school, row.name, row.role, row.username, row.temporaryPassword]);
  return `${lines.map((line) => line.map(cell).join(",")).join("\n")}\n`;
}
