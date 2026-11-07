// @vitest-environment node
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, type FakeStore } from "./helpers/fake-store";
import { generatePassword, main, parseCsv, readRows } from "../scripts/make-accounts";

/**
 * The tests of the account script (AC-4.8, test strategy P2b.7, task 2b.5).
 *
 * The script reads a CSV of accounts from a folder outside the repository, writes the hashes into
 * the Storytime database, and writes a print-ready card list into the same outside folder. The
 * test writes only to a temp folder outside the repository, and it compares `git status` before
 * and after, so the shared tree stays as it was.
 */

const app = resolve(import.meta.dirname, "..");
const repository = resolve(app, "../..");

/** The database URL that the fake store ignores. */
const DATABASE_URL = "postgres://storytime:secret@localhost:5432/storytime";

/** The CSV of the accounts of one run. */
const CSV = "name,class,role\n\"Suda, P.\",staff,family\nNok,staff,family\nTeacher One,tutor,teacher\n";

/** The temp folders of the runs. */
const folders: string[] = [];

/** The log lines of the last run. */
let logLines: string[] = [];

/**
 * Creates a temp folder outside the repository.
 * @returns The path of the folder.
 */
function tempFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "storytime-accounts-"));
  folders.push(folder);
  return folder;
}

/**
 * Reads the git status of the repository.
 * @returns The status lines.
 */
function gitStatus(): string {
  return execFileSync("git", ["status", "--porcelain"], { cwd: repository, encoding: "utf8" });
}

/**
 * Builds a one-row account CSV with quoted cells.
 * @param name The name cell.
 * @param className The class cell.
 * @returns The CSV text.
 */
function csvText(name: string, className: string): string {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return `name,class,role\n${cell(name)},${cell(className)},family\n`;
}

/**
 * Runs the script with the fake store.
 * @param args The arguments of the run.
 * @param store The store of the run.
 * @param env The environment of the run.
 * @returns The exit code of the run.
 */
async function run(
  args: string[],
  store: FakeStore,
  env: Record<string, string | undefined> = { STORYTIME_DATABASE_URL: DATABASE_URL },
): Promise<number> {
  const lines: string[] = [];
  const log = vi.spyOn(console, "log").mockImplementation((...values: unknown[]) => {
    lines.push(values.map((value) => String(value)).join(" "));
  });
  const error = vi.spyOn(console, "error").mockImplementation((...values: unknown[]) => {
    lines.push(values.map((value) => String(value)).join(" "));
  });
  try {
    const code = await main(args, env, () => store as never);
    logLines = lines;
    return code;
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
}

beforeEach(() => {
  logLines = [];
});

afterEach(() => {
  while (folders.length > 0) {
    const folder = folders.pop();
    if (folder) rmSync(folder, { recursive: true, force: true });
  }
});

/**
 * The backfill read that task 2b.5 expects on the fake store. Green adds it to the fake store and
 * the store contract. It lists every account and the ids that already hold an `account_created`
 * event.
 */
interface AuditReadStore extends FakeStore {
  listAccountsForAudit(): Promise<{
    accounts: Array<{ id: string; username: string }>;
    auditedAccountIds: string[];
  }>;
}

describe("the account script (AC-4.8)", () => {
  it("writes the card list outside the repository and keeps the tree clean", async () => {
    const folder = tempFolder();
    writeFileSync(join(folder, "accounts.csv"), CSV);
    const before = gitStatus();
    const store = createFakeStore();
    const code = await run(["--folder", folder], store);

    expect(code, "the run exits 0").toBe(0);
    expect(logLines.join("\n"), "the run counts the accounts").toContain("accounts_created=3 verified=3 failed=0");
    expect(store.accounts, "three accounts").toHaveLength(3);
    expect(store.accounts.map((account) => account.username)).toEqual([
      "staff-01",
      "staff-02",
      "tutor-01",
    ]);
    for (const account of store.accounts) {
      expect(account.passwordHash, "the hash is an Argon2id hash").toMatch(
        /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/,
      );
    }

    const cardsPath = join(folder, "sign-in-cards.csv");
    expect(existsSync(cardsPath), "the card list exists").toBe(true);
    expect(lstatSync(cardsPath).mode & 0o777, "the card list is mode 0600").toBe(0o600);
    expect(lstatSync(folder).mode & 0o777, "the folder is mode 0700").toBe(0o700);
    const cards = readFileSync(cardsPath, "utf8");
    expect(cards, "the card list holds the usernames").toContain("staff-01");
    expect(cards.split("\n").filter((line) => line.length > 0), "the card list holds three cards").toHaveLength(4);

    expect(gitStatus(), "the tree of the repository stays the same").toBe(before);
  });

  it("refuses a folder inside the repository and a link that resolves into it", async () => {
    const inside = join(app, "accounts-outside-test");
    const store = createFakeStore();
    const code = await run(["--folder", inside], store);
    expect(code, "the run exits non-zero").not.toBe(0);
    expect(logLines.join("\n"), "the run names the reason").toContain("output_inside_repo=1");
    expect(existsSync(inside), "the script writes no folder in the repository").toBe(false);
    expect(store.accounts, "the script writes no account").toHaveLength(0);

    const folder = tempFolder();
    const link = join(folder, "link");
    symlinkSync(app, link);
    const linked = await run(["--folder", link], createFakeStore());
    expect(linked, "the run exits non-zero").not.toBe(0);
    expect(logLines.join("\n"), "the run names the reason").toContain("output_inside_repo=1");
  });

  it("draws a password of ten characters with no look-alike and no formula sign", async () => {
    const random = vi.spyOn(Math, "random");
    const seen = new Set<string>();
    for (let index = 0; index < 1000; index += 1) {
      const password = generatePassword();
      expect(password.length, "the password holds ten characters").toBe(10);
      expect(password, "the password holds no look-alike").not.toMatch(/[0O1lI]/);
      expect(password, "the password holds no formula sign").not.toMatch(/[=+\-@]/);
      seen.add(password);
    }
    random.mockRestore();
    expect(seen.size, "1000 draws have no repeat").toBe(1000);
    expect(10 * Math.log2(57), "the password carries at least 49 bits").toBeGreaterThanOrEqual(49);
  });

  it("refuses a role outside the three roles and a username that stands twice", async () => {
    const folder = tempFolder();
    writeFileSync(join(folder, "accounts.csv"), "name,class,role\nNok,staff,admin\n");
    const store = createFakeStore();
    const code = await run(["--folder", folder], store);
    expect(code, "the run exits non-zero").not.toBe(0);
    expect(store.accounts, "the script writes no account").toHaveLength(0);

    writeFileSync(
      join(folder, "accounts.csv"),
      "name,username,class,role\nNok,staff-01,staff,family\nNok Two,staff-01,staff,family\n",
    );
    const twice = createFakeStore();
    const second = await run(["--folder", folder], twice);
    expect(second, "the run exits non-zero").not.toBe(0);
    expect(twice.accounts, "the script writes no account").toHaveLength(0);
  });

  it("skips an account that exists and changes nothing on a second run", async () => {
    const folder = tempFolder();
    writeFileSync(join(folder, "accounts.csv"), CSV);
    const store = createFakeStore();
    expect(await run(["--folder", folder], store), "the first run exits 0").toBe(0);
    const hash = store.accounts[0].passwordHash;

    const second = await run(["--folder", folder], store);
    expect(second, "the second run exits 0").toBe(0);
    expect(logLines.join("\n"), "the second run skips every account").toContain("accounts_skipped=3");
    expect(logLines.join("\n"), "the second run creates no account").toContain("accounts_created=0");
    expect(store.accounts, "the accounts stay three").toHaveLength(3);
    expect(store.accounts[0].passwordHash, "the hash of the account stays the same").toBe(hash);
  });

  it("keeps the password, the hash, the URL, and the names out of the log and the arguments", async () => {
    const folder = tempFolder();
    writeFileSync(join(folder, "accounts.csv"), CSV);
    const store = createFakeStore();
    const argv = ["--folder", folder, "--database-url-env", "STORYTIME_DATABASE_URL"];
    const code = await run(argv, store);
    expect(code, "the run exits 0").toBe(0);

    const cards = readFileSync(join(folder, "sign-in-cards.csv"), "utf8");
    const password = cards.split("\n")[1].split(",").pop() ?? "";
    const text = `${logLines.join("\n")}\n${argv.join(" ")}`;
    let secretHits = 0;
    for (const secret of [password, DATABASE_URL, store.accounts[0].passwordHash, "Suda, P.", "Teacher One"]) {
      if (secret && text.includes(secret)) secretHits += 1;
    }
    console.log(`secret_hits=${secretHits}`);
    expect(secretHits, "secret_hits").toBe(0);
    expect(`${text} ${password}`.includes(password), "the scan finds a planted string").toBe(true);
  });

  it("reads the CSV of the accounts and names the columns", () => {
    const rows = readRows(CSV);
    expect(rows, "the CSV holds three rows").toHaveLength(3);
    expect(rows[0].username, "the username comes from the class and the row").toBe("staff-01");
    expect(rows[0].name, "the name keeps its comma").toBe("Suda, P.");
    expect(rows[2].role, "the role comes from the CSV").toBe("teacher");
    expect(parseCsv("a,b\nc,d"), "the CSV parser reads the rows").toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("appends one account_created audit event for each new account, none for a skipped one, and no secret", async () => {
    const folder = tempFolder();
    writeFileSync(join(folder, "accounts.csv"), CSV);
    const store = createFakeStore();

    const first = await run(["--folder", folder], store);
    expect(first, "the first run exits 0").toBe(0);
    const firstLog = logLines.join("\n");

    const created = store.auditEvents.filter((event) => event.action === "account_created");
    console.log(`audit_created_events=${created.length} accounts=${store.accounts.length}`);
    expect(created, "one event per created account").toHaveLength(3);
    for (const account of store.accounts) {
      const events = created.filter((event) => event.accountId === account.id);
      expect(events, `${account.username} has one account_created event`).toHaveLength(1);
      expect(events[0].username, `${account.username} names the username`).toBe(account.username);
    }

    const second = await run(["--folder", folder], store);
    expect(second, "the second run exits 0").toBe(0);
    const secondLog = logLines.join("\n");
    expect(
      store.auditEvents.filter((event) => event.action === "account_created"),
      "a skipped account appends no event",
    ).toHaveLength(created.length);

    const cards = readFileSync(join(folder, "sign-in-cards.csv"), "utf8");
    const passwords = cards
      .split("\n")
      .slice(1)
      .filter((line) => line.length > 0)
      .map((line) => line.split(",").pop() ?? "");
    const secrets = [...passwords, ...store.accounts.map((account) => account.passwordHash)];
    const text = `${firstLog}\n${secondLog}\n${JSON.stringify(store.auditEvents)}`;
    let secretHits = 0;
    for (const secret of secrets) if (secret && text.includes(secret)) secretHits += 1;
    console.log(`audit_secret_hits=${secretHits}`);
    expect(secretHits, "audit_secret_hits").toBe(0);
    expect(`${text} ${passwords[0]}`.includes(passwords[0]), "the scan finds a planted string").toBe(true);
  });

  it("backfills one account_created event for each account that has none, and is idempotent", async () => {
    const PASSWORD_HASH = "$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$c2FsdA";
    const store = createFakeStore({
      accounts: [
        { username: "staff-01", passwordHash: PASSWORD_HASH, role: "family" },
        { username: "staff-02", passwordHash: PASSWORD_HASH, role: "family" },
      ],
    }) as AuditReadStore;
    store.auditEvents.push({
      id: 1,
      action: "account_created",
      accountId: store.accounts[0].id,
      username: store.accounts[0].username,
      now: new Date("2026-11-07T10:00:00.000Z"),
    });
    const hash = store.accounts[1].passwordHash;
    const accountCount = store.accounts.length;
    const sessionCount = store.sessions.length;
    const reason = "created 2026-11-07 17:12 before the audit fix";

    const first = await run(["--backfill-audit", reason], store);
    expect(first, "the backfill exits 0").toBe(0);
    const created = store.auditEvents.filter((event) => event.action === "account_created");
    console.log(`audit_present_after=${created.length}`);
    expect(created, "one event per account after the backfill").toHaveLength(2);
    const backfilled = created.filter((event) => event.reason === `backfill: ${reason}`);
    expect(backfilled, "one backfilled event").toHaveLength(1);
    expect(backfilled[0].accountId, "the backfill names the missing account").toBe(store.accounts[1].id);
    expect(backfilled[0].username, "the backfill names the username").toBe("staff-02");
    expect(logLines.join("\n"), "the run prints both counts").toContain("audit_backfilled=1 audit_present=1");

    expect(store.accounts, "the backfill changes no account").toHaveLength(accountCount);
    expect(store.accounts[1].passwordHash, "the backfill changes no hash").toBe(hash);
    expect(store.sessions, "the backfill changes no session").toHaveLength(sessionCount);

    const second = await run(["--backfill-audit", reason], store);
    expect(second, "the second backfill exits 0").toBe(0);
    expect(
      store.auditEvents.filter((event) => event.action === "account_created"),
      "the second backfill appends no event",
    ).toHaveLength(2);
    expect(logLines.join("\n"), "the second run backfills 0 and reports 2 present").toContain(
      "audit_backfilled=0 audit_present=2",
    );
  });

  // Review B finding F43 and P2b.9 row 13: a spreadsheet evaluates a cell that starts with
  // `=`, `+`, `-`, or `@` (and a leading tab or carriage return reaches the same cell). The
  // script must fail closed before the first insert and write no card file.
  const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"] as const;
  for (const field of ["name", "class"] as const) {
    for (const prefix of FORMULA_PREFIXES) {
      it(`fails closed on a ${field} cell that starts with ${JSON.stringify(prefix)}`, async () => {
        const folder = tempFolder();
        const name = field === "name" ? `${prefix}Nok` : "Nok";
        const className = field === "class" ? `${prefix}staff` : "staff";
        writeFileSync(join(folder, "accounts.csv"), csvText(name, className));
        const before = gitStatus();
        const store = createFakeStore();
        const code = await run(["--folder", folder], store);
        console.log(`accounts_inserted=${store.accounts.length}`);
        expect(code, "the run exits non-zero").not.toBe(0);
        expect(store.accounts, "accounts_inserted").toHaveLength(0);
        expect(
          existsSync(join(folder, "sign-in-cards.csv")),
          "the script writes no card file",
        ).toBe(false);
        expect(gitStatus(), "the repository holds no new file").toBe(before);
      });
    }
  }

  // Review B finding F42 and P2b.9 row 13: both files stay outside the repository. A `--cards`
  // value that leaves the folder through `..`, an absolute value, and a value that resolves into
  // the repository must fail closed before the first insert.
  it("refuses a --cards value that leaves the folder through ..", async () => {
    const folder = tempFolder();
    writeFileSync(join(folder, "accounts.csv"), CSV);
    const escapeName = `${basename(folder)}-x.csv`;
    const escaped = resolve(folder, "..", escapeName);
    const store = createFakeStore();
    let code = 0;
    try {
      code = await run(["--folder", folder, "--cards", `../${escapeName}`], store);
    } finally {
      rmSync(escaped, { force: true });
    }
    console.log(`accounts_inserted=${store.accounts.length}`);
    expect(code, "the run exits non-zero").not.toBe(0);
    expect(store.accounts, "accounts_inserted").toHaveLength(0);
    expect(existsSync(escaped), "no card file leaves the folder").toBe(false);
  });

  it("refuses an absolute --cards value", async () => {
    const folder = tempFolder();
    writeFileSync(join(folder, "accounts.csv"), CSV);
    const absolute = join(folder, `${basename(folder)}-absolute.csv`);
    const store = createFakeStore();
    let code = 0;
    try {
      code = await run(["--folder", folder, "--cards", absolute], store);
    } finally {
      rmSync(absolute, { force: true });
    }
    console.log(`accounts_inserted=${store.accounts.length}`);
    expect(code, "the run exits non-zero").not.toBe(0);
    expect(store.accounts, "accounts_inserted").toHaveLength(0);
    expect(existsSync(absolute), "no absolute card file").toBe(false);
  });

  it("refuses a --cards value that resolves into the repository", async () => {
    const folder = tempFolder();
    writeFileSync(join(folder, "accounts.csv"), CSV);
    const inside = join(repository, `storytime-cards-escape-${basename(folder)}.csv`);
    const store = createFakeStore();
    let code = 0;
    try {
      code = await run(["--folder", folder, "--cards", relative(folder, inside)], store);
    } finally {
      rmSync(inside, { force: true });
    }
    console.log(`accounts_inserted=${store.accounts.length}`);
    expect(code, "the run exits non-zero").not.toBe(0);
    expect(store.accounts, "accounts_inserted").toHaveLength(0);
    expect(existsSync(inside), "no card file in the repository").toBe(false);
  });

  it("refuses a folder path that holds a .. segment", async () => {
    const parent = tempFolder();
    const runFolder = join(parent, "run");
    mkdirSync(runFolder);
    mkdirSync(join(parent, "other"));
    writeFileSync(join(runFolder, "accounts.csv"), CSV);
    const dotted = `${parent}/other/../run`;
    expect(dotted.split("/"), "the argument keeps the raw .. segment").toContain("..");
    const store = createFakeStore();
    const code = await run(["--folder", dotted], store);
    console.log(`accounts_inserted=${store.accounts.length}`);
    expect(code, "the run exits non-zero").not.toBe(0);
    expect(store.accounts, "accounts_inserted").toHaveLength(0);
    expect(
      existsSync(join(runFolder, "sign-in-cards.csv")),
      "the script writes no card file",
    ).toBe(false);
  });
});
