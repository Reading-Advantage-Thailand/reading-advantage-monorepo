/**
 * Matches one user of each role in the legacy clone and the new clone (spec FR-5).
 *
 * Usage (from the repository root; the URLs name the two CLONES, never the shared database):
 *   LEGACY_DATABASE_URL=... NEW_DATABASE_URL=... npx tsx scripts/primary-parity/accounts.ts \
 *     [--out <accounts.json>] [--handout <csv>] [--system <id>] [--admin <id>] [--teacher <id>] [--student <id>] [--force]
 *
 * The script writes kit passwords into the legacy clone, writes `accounts.json` with mode 600, and prints
 * the command that gives the new staff users temporary passwords. It never prints a password or a class code.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import postgres from "postgres";
import { AccountsFile, type AccountsFileData } from "./accounts-file.js";
import { assertGuards } from "./guards.js";
import { hashLegacyPassword } from "./legacy-credential.js";

/** Default private folder of the kit (mode 700, outside every repository). */
export const PRIVATE_DIR = join(homedir(), "Desktop", "primary-parity-acceptance");

/** One set of matched users, found in the legacy clone. */
export interface Candidate {
  teacher: string;
  admin: string;
  student: string;
  classroom: string;
}

/**
 * Makes a random kit password. It is for a local clone only.
 * @returns A password such as `kit-3fK9...`.
 */
export function makeKitPassword(): string {
  return `kit-${randomBytes(9).toString("base64url")}`;
}

/**
 * Makes a random class code of six upper-case letters and digits.
 * @returns The class code.
 */
export function makeClassCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Picks the first candidate whose four users exist in the new clone with the same role.
 * @param candidates Sets of users from the legacy clone.
 * @param roles Role of each user id in the new clone.
 * @returns The first set that exists in both clones, or undefined.
 */
export function pickCandidate(candidates: Candidate[], roles: Map<string, string>): Candidate | undefined {
  return candidates.find(
    (c) =>
      roles.get(c.teacher) === "TEACHER" && roles.get(c.admin) === "ADMIN" && roles.get(c.student) === "STUDENT",
  );
}

type Sql = ReturnType<typeof postgres>;

const queryOf = (sql: Sql) => async (text: string) => (await sql.unsafe(text)) as unknown as { table_name: string }[];

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      out: { type: "string" },
      handout: { type: "string" },
      system: { type: "string" },
      admin: { type: "string" },
      teacher: { type: "string" },
      student: { type: "string" },
      force: { type: "boolean" },
    },
  });
  const legacyUrl = process.env.LEGACY_DATABASE_URL;
  const newUrl = process.env.NEW_DATABASE_URL;
  if (!legacyUrl || !newUrl) throw new Error("Set LEGACY_DATABASE_URL and NEW_DATABASE_URL to the two clones.");
  const out = values.out ?? join(PRIVATE_DIR, "accounts.json");
  const handout = values.handout ?? join(PRIVATE_DIR, "handout.csv");
  if (existsSync(out) && !values.force) throw new Error("accounts.json exists; use --force to replace it (new passwords are lost).");

  const legacy = postgres(legacyUrl, { max: 1 });
  const next = postgres(newUrl, { max: 1 });
  try {
    await assertGuards({
      legacyUrl,
      newUrl,
      legacyQuery: queryOf(legacy),
      newQuery: queryOf(next),
      baseUrls: [],
      outputFiles: [out, handout],
    });

    const systemRows = values.system
      ? await next`select id, username from users where id = ${values.system} and role = 'SYSTEM'`
      : await next`select id, username from users where role = 'SYSTEM' order by username limit 1`;
    const system = systemRows[0];
    if (!system) throw new Error("no SYSTEM user in the new clone");

    let candidate: Candidate | undefined;
    if (values.teacher && values.admin && values.student) {
      const cls = await legacy`
        select cs."classroomId" as classroom from classroom_students cs
        join classroom_teachers ct on ct."classroomId" = cs."classroomId"
        where cs."studentId" = ${values.student} and ct."userId" = ${values.teacher} limit 1`;
      if (!cls[0]) throw new Error("the student is not in a class of the teacher (legacy clone)");
      candidate = { teacher: values.teacher, admin: values.admin, student: values.student, classroom: cls[0].classroom as string };
    } else {
      const rows = await legacy`
        select t.id as teacher, a.id as admin, s.id as student, c.id as classroom
        from classroom_teachers ct
        join users t on t.id = ct."userId" and lower(t.role) = 'teacher'
        join classrooms c on c.id = ct."classroomId"
        join classroom_students cs on cs."classroomId" = c.id
        join users s on s.id = cs."studentId" and lower(s.role) = 'student'
        join users a on a.school_id = t.school_id and lower(a.role) = 'admin'
        order by t.id, s.id limit 300`;
      const ids = [...new Set(rows.flatMap((r) => [r.teacher, r.admin, r.student] as string[]))];
      const roleRows = ids.length ? await next`select id, role from users where id in ${next(ids)}` : [];
      candidate = pickCandidate(rows as unknown as Candidate[], new Map(roleRows.map((r) => [r.id as string, r.role as string])));
    }
    if (!candidate) throw new Error("no teacher, admin, and student set exists in both clones");

    const ids = { SYSTEM: system.id as string, ADMIN: candidate.admin, TEACHER: candidate.teacher, STUDENT: candidate.student };
    const legacyUsers = await legacy`select id, email, name from users where id in ${legacy(Object.values(ids))}`;
    const newUsers = await next`select id, username from users where id in ${next(Object.values(ids))}`;
    const legacyOf = new Map(legacyUsers.map((u) => [u.id as string, u]));
    const usernameOf = new Map(newUsers.map((u) => [u.id as string, u.username as string]));

    const accounts: AccountsFileData["accounts"] = {};
    for (const role of ["SYSTEM", "ADMIN", "TEACHER"] as const) {
      const lu = legacyOf.get(ids[role]);
      if (!lu) throw new Error(`the ${role} user is missing in the legacy clone`);
      const password = makeKitPassword();
      const hash = await hashLegacyPassword(password);
      const updated = await legacy`update accounts set password = ${hash}, updated_at = now()
        where user_id = ${lu.id} and provider_id = 'credential'`;
      if (updated.count === 0) {
        await legacy`insert into accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
          values (${randomUUID()}, ${lu.id}, ${lu.id}, 'credential', ${hash}, now(), now())`;
      }
      accounts[role] = { userId: ids[role], legacy: { kind: "password", email: lu.email as string, password }, new: { username: usernameOf.get(ids[role]) ?? "" } };
    }

    const cls = (await legacy`select "password_students" as code, "codeExpiresAt" as expires from classrooms where id = ${candidate.classroom}`)[0];
    let classCode = (cls?.code as string | null) ?? "";
    const expired = cls?.expires ? new Date(cls.expires as string) < new Date() : false;
    if (!classCode || expired) {
      classCode = makeClassCode();
      await legacy`update classrooms set "password_students" = ${classCode}, "codeExpiresAt" = null where id = ${candidate.classroom}`;
    }
    const studentName = legacyOf.get(ids.STUDENT)?.name as string | undefined;
    if (!studentName) throw new Error("the STUDENT user has no name in the legacy clone");
    const mapped = await next`select new_id from primary_legacy_id_map where legacy_id = ${candidate.classroom} and table_name in ('classrooms', 'classroom') limit 1`;
    accounts.STUDENT = {
      userId: ids.STUDENT,
      legacy: { kind: "classCode", classCode, studentName },
      new: { username: usernameOf.get(ids.STUDENT) ?? "", classroomId: mapped[0]?.new_id as string | undefined },
    };

    const file = AccountsFile.parse({
      legacyDatabase: new URL(legacyUrl).pathname.slice(1),
      newDatabase: new URL(newUrl).pathname.slice(1),
      accounts,
    });
    mkdirSync(dirname(out), { recursive: true, mode: 0o700 });
    writeFileSync(out, JSON.stringify(file, null, 2), { mode: 0o600 });
    chmodSync(out, 0o600);

    console.log(`Wrote ${out} (mode 600) for roles: ${Object.keys(accounts).join(", ")}.`);
    console.log("Next, give the new staff users temporary passwords (run from apps/primary-advantage):");
    console.log(
      `  DATABASE_URL="$NEW_DATABASE_URL" npx tsx scripts/issue-temporary-passwords.ts --apply --system ${accounts.SYSTEM?.new.username} --out ${handout}`,
    );
    console.log("Then run capture.ts with --handout so that the forced password change runs once.");
  } finally {
    await legacy.end();
    await next.end();
  }
}

if (typeof require !== "undefined" && require.main === module) {
  main().catch((err) => {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  });
}
