/**
 * Issues temporary passwords to the staff of a migrated Primary database (cutover FR-5).
 *
 * Each TEACHER and ADMIN user, and each SYSTEM user named in --system, gets a random temporary
 * password in the credential account. SYSTEM can change the data of every school, so an unnamed
 * SYSTEM account gets no password.
 * The login then opens no session until the user sets a new password. The script writes the
 * hand-out list (school, name, role, username, temporary password) to a CSV file with mode 600 that
 * must be outside the repository (the repository is public). Without --apply it only lists the users.
 * Run it after the last ETL run: an ETL rerun puts the legacy hashes back, so the list stops working.
 *
 * Usage (from apps/primary-advantage; DATABASE_URL names the target database):
 *   npx tsx scripts/issue-temporary-passwords.ts
 *   npx tsx scripts/issue-temporary-passwords.ts --apply --system phikulphookathin,readingadvantage0 \
 *     --out ~/Desktop/primary-cutover-inputs/handout.csv
 * Options:
 *   --system   comma-separated usernames of the SYSTEM accounts that get a temporary password
 *   --reissue  also users that have a temporary password that is not changed yet
 */

import { randomUUID } from "node:crypto";
import { realpathSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { accounts, schools, sessions, users } from "@reading-advantage/db/schema";
import { hashPassword } from "@reading-advantage/auth";
import {
  generateTemporaryPassword,
  isInsideDirectory,
  selectForIssue,
  STAFF_ROLES,
  toHandoutCsv,
} from "../lib/cutover/temporary-passwords";

const REPO_ROOT = realpathSync(fileURLToPath(new URL("../../..", import.meta.url)));

async function main() {
  const { values } = parseArgs({
    options: { apply: { type: "boolean" }, out: { type: "string" }, reissue: { type: "boolean" }, system: { type: "string" } },
  });
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to the target database.");
  const target = new URL(process.env.DATABASE_URL);
  console.log(`Target: ${target.hostname}:${target.port}${target.pathname}`);

  const out = values.out ? path.resolve(values.out) : undefined;
  if (values.apply) {
    if (!out) throw new Error("--apply needs --out <file outside the repository>.");
    if (isInsideDirectory(path.join(realpathSync(path.dirname(out)), path.basename(out)), REPO_ROOT)) {
      throw new Error("The hand-out file must be outside the repository: the repository is public.");
    }
  }

  const staff = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      school: schools.name,
      pendingSince: accounts.temporaryPasswordIssuedAt,
    })
    .from(users)
    .leftJoin(schools, eq(schools.id, users.schoolId))
    .leftJoin(accounts, and(eq(accounts.userId, users.id), eq(accounts.providerId, "credential")))
    .where(inArray(users.role, [...STAFF_ROLES]))
    .orderBy(schools.name, users.role, users.username);
  const system = (values.system ?? "").split(",").map((name) => name.trim()).filter(Boolean);
  const { selected, unnamedSystem } = selectForIssue(staff, { system, reissue: Boolean(values.reissue) });
  const pending = values.reissue ? 0 : staff.filter((user) => user.pendingSince).length;

  for (const role of STAFF_ROLES) console.log(`${role}: ${selected.filter((user) => user.role === role).length}`);
  if (pending) console.log(`Not changed: ${pending} users have a pending temporary password (use --reissue).`);
  for (const user of unnamedSystem) console.log(`No password: SYSTEM ${user.username} (not named in --system)`);
  if (!values.apply) {
    for (const user of selected) console.log(`  ${user.role}\t${user.username}\t${user.school ?? "(no school)"}`);
    console.log("Dry run: no change. Add --apply --out <file> to issue the passwords.");
    return;
  }
  if (!selected.length) return console.log("No users to change.");

  const now = new Date();
  const issued = await Promise.all(
    selected.map(async (user) => {
      const temporaryPassword = generateTemporaryPassword();
      return { ...user, temporaryPassword, hash: await hashPassword(temporaryPassword) };
    }),
  );
  const rows = issued.map((user) => ({
    school: user.school ?? "",
    name: user.name ?? "",
    role: user.role,
    username: user.username,
    temporaryPassword: user.temporaryPassword,
  }));
  // "wx": never overwrite an earlier hand-out list. The file exists before the database change, so
  // a failed write changes nothing; a failed database change removes the file.
  writeFileSync(out!, toHandoutCsv(rows), { mode: 0o600, flag: "wx" });
  try {
    await db.transaction(async (tx) => {
      for (const user of issued) {
        await tx
          .insert(accounts)
          .values({
            id: randomUUID(),
            userId: user.id,
            providerId: "credential",
            password: user.hash,
            temporaryPasswordIssuedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [accounts.userId, accounts.providerId],
            set: { password: user.hash, temporaryPasswordIssuedAt: now, updatedAt: now },
          });
      }
      await tx.delete(sessions).where(inArray(sessions.userId, issued.map((user) => user.id)));
    });
  } catch (error) {
    rmSync(out!, { force: true });
    throw error;
  }
  console.log(`Issued ${issued.length} temporary passwords. Hand-out list: ${out}`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
