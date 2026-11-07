#!/usr/bin/env tsx
import { randomInt } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { hashPassword, verifyPassword } from "@reading-advantage/auth/password";
import {
  ACCOUNT_CREATED_ACTION,
  createStorytimeRuntimeStore,
  type StorytimeStore,
} from "@reading-advantage/backend/storytime-access";

/**
 * The account script of the Storytime release (design section 3, AC-4.8).
 *
 * The script reads a CSV of accounts from a folder outside the repository, hashes every password
 * with Argon2id, writes the hashes into the Storytime database, and writes a print-ready card
 * list into the same outside folder. The CSV and the card list never go into the repository, and
 * the script refuses a folder that lies inside it.
 *
 * The database URL comes from an environment variable, so no URL ever sits in the arguments or in
 * the log. The log holds no password, no hash, and no name of a family.
 */

/** The roles a Storytime account can hold. */
const ROLES = ["family", "class", "teacher"] as const;

/** The role of one Storytime account. */
export type AccountRole = (typeof ROLES)[number];

/** The characters a password may hold. The alphabet has no look-alike character and no formula
 * sign, so a card list stays safe in a sheet. */
const PASSWORD_ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** The length of a generated password. */
const PASSWORD_LENGTH = 10;

/** The name of the environment variable that holds the database URL. */
export const DEFAULT_DATABASE_URL_ENV = "STORYTIME_DATABASE_URL";

/** The name of the CSV inside the outside folder. */
const DEFAULT_CSV_NAME = "accounts.csv";

/** The name of the card list inside the outside folder. */
const DEFAULT_CARDS_NAME = "sign-in-cards.csv";

/** One row of the account CSV. */
export interface AccountRow {
  /** The username of the account. */
  username: string;
  /** The name of the person or the class. It goes on the card only. */
  name: string;
  /** The class or group of the account. It names the username when the CSV holds no username. */
  className: string;
  /** The role of the account. */
  role: AccountRole;
}

/** The arguments of one run. */
export interface AccountOptions {
  /** The outside folder with the CSV and the card list. */
  folder: string;
  /** The name of the CSV inside the folder. */
  csvName: string;
  /** The name of the card list inside the folder. */
  cardsName: string;
  /** The name of the environment variable that holds the database URL. */
  databaseUrlEnv: string;
  /** The reason of the audit backfill, or `null` when the run creates accounts. */
  backfillAuditReason: string | null;
}

/**
 * Reads the arguments of one run.
 * @param argv The arguments, without the program name.
 * @returns The options, or `null` when the arguments ask for the usage.
 * @throws When an argument has no value or names no option.
 */
export function parseOptions(argv: string[]): AccountOptions | null {
  const options: AccountOptions = {
    folder: "",
    csvName: DEFAULT_CSV_NAME,
    cardsName: DEFAULT_CARDS_NAME,
    databaseUrlEnv: DEFAULT_DATABASE_URL_ENV,
    backfillAuditReason: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === "--help") return null;
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`the option ${flag} needs a value`);
    }
    index += 1;
    if (flag === "--folder") options.folder = value;
    else if (flag === "--csv") options.csvName = value;
    else if (flag === "--cards") options.cardsName = value;
    else if (flag === "--database-url-env") options.databaseUrlEnv = value;
    else if (flag === "--backfill-audit") options.backfillAuditReason = value;
    else throw new Error(`unknown option ${flag}`);
  }
  if (options.folder === "" && options.backfillAuditReason === null) {
    throw new Error("the option --folder needs a value");
  }
  return options;
}

/**
 * Draws one password.
 *
 * The password holds ten characters of an alphabet of 57, so it carries about 58 bits. The draw
 * uses the crypto module, so the password never comes from `Math.random`.
 * @returns The new password.
 */
export function generatePassword(): string {
  let password = "";
  for (let index = 0; index < PASSWORD_LENGTH; index += 1) {
    password += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return password;
}

/**
 * Reads the real path of a folder that may not exist yet.
 * @param folder The folder.
 * @returns The real path of the folder.
 */
function realFolder(folder: string): string {
  if (existsSync(folder)) return realpathSync(folder);
  const parent = dirname(folder);
  if (!existsSync(parent)) return resolve(folder);
  return resolve(realpathSync(parent), basename(folder));
}

/**
 * Reports whether a folder lies inside the repository.
 * @param folder The folder.
 * @returns `true` when the folder lies inside the repository.
 */
export function insideRepository(folder: string): boolean {
  const repository = resolve(import.meta.dirname, "../../..");
  const real = realFolder(folder);
  return real === repository || real.startsWith(`${repository}/`);
}

/**
 * Splits one CSV text into its rows and its fields.
 * @param text The CSV text.
 * @returns The rows of the text.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Turns a value into a safe username part.
 * @param value The value.
 * @returns The slug of the value.
 */
function slugOf(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Reads the rows of the account CSV.
 * @param text The CSV text.
 * @returns The rows of the CSV.
 * @throws When a row names no role, names a role outside the three roles, or repeats a username.
 */
export function readRows(text: string): AccountRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error("the account CSV holds no header");
  const header = rows[0].map((name) => name.trim().toLowerCase());
  const usernameIndex = header.indexOf("username");
  const nameIndex = header.indexOf("name");
  const classIndex = header.indexOf("class");
  const roleIndex = header.indexOf("role");
  if (roleIndex < 0) throw new Error("the account CSV holds no role column");

  const accounts: AccountRow[] = [];
  const seen = new Set<string>();
  const classCounts = new Map<string, number>();
  for (const row of rows.slice(1)) {
    if (row.length === 1 && row[0].trim() === "") continue;
    const role = (row[roleIndex] ?? "").trim().toLowerCase();
    if (!(ROLES as readonly string[]).includes(role)) {
      throw new Error(`the role ${role || "(empty)"} is not a Storytime role`);
    }
    const className = classIndex >= 0 ? (row[classIndex] ?? "").trim() : "";
    let username = usernameIndex >= 0 ? (row[usernameIndex] ?? "").trim().toLowerCase() : "";
    if (username === "") {
      const slug = slugOf(className);
      if (slug === "") throw new Error("the row holds no username and no class");
      const count = (classCounts.get(slug) ?? 0) + 1;
      classCounts.set(slug, count);
      username = `${slug}-${String(count).padStart(2, "0")}`;
    }
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(username)) {
      throw new Error(`the username ${username} holds a character that no account may hold`);
    }
    if (seen.has(username)) {
      throw new Error(`the username ${username} stands twice in the CSV`);
    }
    seen.add(username);
    accounts.push({
      username,
      name: nameIndex >= 0 ? (row[nameIndex] ?? "").trim() : "",
      className,
      role: role as AccountRole,
    });
  }
  return accounts;
}

/**
 * Writes the card list of the accounts.
 * @param folder The outside folder.
 * @param name The name of the card list.
 * @param cards The cards of the accounts.
 */
function writeCards(folder: string, name: string, cards: Array<AccountRow & { password: string }>): void {
  const header = "username,name,class,role,password";
  const lines = cards.map((card) =>
    [card.username, card.name, card.className, card.role, card.password]
      .map((value) => (value.includes(",") || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value))
      .join(","),
  );
  writeFileSync(resolve(folder, name), `${[header, ...lines].join("\n")}\n`, { mode: 0o600 });
}

/**
 * Appends the audit event of one account creation.
 *
 * The event names the account and its username, and it holds no password and no hash.
 * @param store The store of the run.
 * @param accountId The id of the new account.
 * @param username The username of the new account.
 * @param reason The reason of the event.
 */
async function appendAccountCreated(
  store: StorytimeStore,
  accountId: string,
  username: string,
  reason: string,
): Promise<void> {
  await store.insertAuditEvent({
    action: ACCOUNT_CREATED_ACTION,
    accountId,
    username,
    reason,
    now: new Date(),
  });
}

/**
 * Appends the missing audit events of the accounts.
 *
 * The run reads every account and the ids that already hold an `account_created` event, and it
 * appends one event for each account that holds none. It changes no account, no hash, and no
 * session, so a second run appends nothing.
 * @param store The store of the run.
 * @param reason The reason of the backfill.
 * @returns The exit code of the run.
 */
async function backfillAudit(store: StorytimeStore, reason: string): Promise<number> {
  const read = await store.listAccountsForAudit();
  const audited = new Set(read.auditedAccountIds);
  let backfilled = 0;
  let present = 0;
  for (const account of read.accounts) {
    if (audited.has(account.id)) {
      present += 1;
      continue;
    }
    await appendAccountCreated(store, account.id, account.username, `backfill: ${reason}`);
    backfilled += 1;
  }
  console.log(`audit_backfilled=${backfilled} audit_present=${present}`);
  return 0;
}

/**
 * Runs the account script.
 *
 * The script writes the card list only for the accounts it creates. An account that already
 * exists is skipped, and its hash stays unchanged.
 * @param argv The arguments, without the program name.
 * @param env The environment of the run.
 * @param makeStore The factory that opens the Storytime store for a database URL.
 * @returns The exit code of the run.
 */
export async function main(
  argv: string[],
  env: Record<string, string | undefined>,
  makeStore: (databaseUrl: string) => StorytimeStore,
): Promise<number> {
  let options: AccountOptions | null;
  try {
    options = parseOptions(argv);
  } catch (error) {
    console.error(`make-accounts: ${(error as Error).message}`);
    return 1;
  }
  if (options === null) {
    console.log("usage: make-accounts.ts --folder <outside folder> [--csv <name>] [--cards <name>] [--database-url-env <name>]");
    console.log("usage: make-accounts.ts --backfill-audit <reason> [--database-url-env <name>]");
    return 0;
  }

  const databaseUrl = env[options.databaseUrlEnv];
  if (!databaseUrl) {
    console.error(`make-accounts: the environment holds no ${options.databaseUrlEnv}`);
    return 1;
  }

  if (options.backfillAuditReason !== null) {
    return backfillAudit(makeStore(databaseUrl), options.backfillAuditReason);
  }

  const folder = resolve(options.folder);
  if (insideRepository(folder)) {
    console.log("output_inside_repo=1");
    return 1;
  }

  const csvPath = resolve(folder, options.csvName);
  if (!existsSync(csvPath)) {
    console.error(`make-accounts: the file ${options.csvName} is absent`);
    return 1;
  }

  let rows: AccountRow[];
  try {
    rows = readRows(readFileSync(csvPath, "utf8"));
  } catch (error) {
    console.error(`make-accounts: ${(error as Error).message}`);
    return 1;
  }

  mkdirSync(folder, { recursive: true, mode: 0o700 });
  const store = makeStore(databaseUrl);
  const cards: Array<AccountRow & { password: string }> = [];
  let skipped = 0;
  let created = 0;
  for (const row of rows) {
    const existing = await store.findAccountByUsername(row.username);
    if (existing) {
      skipped += 1;
      continue;
    }
    const password = generatePassword();
    const passwordHash = await hashPassword(password);
    const account = await store.createAccount({
      username: row.username,
      passwordHash,
      role: row.role,
      now: new Date(),
    });
    await appendAccountCreated(store, account.id, account.username, "created");
    cards.push({ ...row, password });
    created += 1;
  }

  let verified = 0;
  let failed = 0;
  for (const card of cards) {
    const account = await store.findAccountByUsername(card.username);
    if (!account) {
      failed += 1;
      continue;
    }
    if (await verifyPassword(card.password, account.passwordHash)) verified += 1;
    else failed += 1;
  }

  if (cards.length > 0) writeCards(folder, options.cardsName, cards);
  console.log(`accounts_skipped=${skipped}`);
  console.log(`accounts_created=${created} verified=${verified} failed=${failed}`);
  return failed === 0 ? 0 : 1;
}

/**
 * Runs the account script from the command line.
 * @returns The exit code of the run.
 */
export async function runCli(): Promise<number> {
  return main(process.argv.slice(2), process.env, (url) => createStorytimeRuntimeStore(url));
}

if (process.argv[1]?.endsWith("make-accounts.ts")) {
  process.exitCode = await runCli();
}
