/**
 * Red-phase integrity oracle for the dedicated company-identity journal.
 *
 * The tests parse journal JSON and directory entries as data. They never
 * infer success from the product migration stream or inspect SQL bodies.
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const DB_ROOT = resolve(HERE, "../../..");
const IDENTITY_DRIZZLE_DIR = join(DB_ROOT, "company-identity/drizzle");
const IDENTITY_JOURNAL_PATH = join(
  IDENTITY_DRIZZLE_DIR,
  "meta/_journal.json",
);
const PRODUCT_DRIZZLE_DIR = join(DB_ROOT, "drizzle");
const PRODUCT_JOURNAL_PATH = join(PRODUCT_DRIZZLE_DIR, "meta/_journal.json");

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type Journal = {
  version: string;
  dialect: string;
  entries: JournalEntry[];
};

function loadIdentityJournal(): Journal | undefined {
  expect(
    existsSync(IDENTITY_JOURNAL_PATH),
    "Missing dedicated identity journal: packages/db/company-identity/drizzle/meta/_journal.json",
  ).toBe(true);
  if (!existsSync(IDENTITY_JOURNAL_PATH)) return undefined;
  return JSON.parse(readFileSync(IDENTITY_JOURNAL_PATH, "utf8")) as Journal;
}

function migrationTags(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .map((name) => name.slice(0, -4))
    .sort();
}

describe("company identity migration stream ownership", () => {
  it("keeps the existing product Drizzle config on the product schema and journal", async () => {
    const { default: productConfig } = (await import(
      "../../../drizzle.config.ts"
    )) as {
      default: { out?: string; schema?: string | string[] };
    };

    expect(productConfig.schema).toBe("./src/schema/index.ts");
    expect(productConfig.out).toBe("./drizzle");
    expect(JSON.stringify(productConfig)).not.toContain("company-identity");
    expect(JSON.stringify(productConfig)).not.toContain("COMPANY_AUTH_");
  });

  it("uses a dedicated directory and journal disjoint from product migrations", () => {
    expect(existsSync(IDENTITY_DRIZZLE_DIR)).toBe(true);
    expect(existsSync(IDENTITY_JOURNAL_PATH)).toBe(true);
    if (!existsSync(IDENTITY_DRIZZLE_DIR) || !existsSync(IDENTITY_JOURNAL_PATH)) {
      return;
    }
    const identityRoot = realpathSync(IDENTITY_DRIZZLE_DIR);
    const productRoot = realpathSync(PRODUCT_DRIZZLE_DIR);
    expect(identityRoot).not.toBe(productRoot);
    expect(relative(productRoot, identityRoot).startsWith("..")).toBe(true);
    expect(relative(identityRoot, productRoot).startsWith("..")).toBe(true);
    expect(realpathSync(IDENTITY_JOURNAL_PATH)).not.toBe(
      realpathSync(PRODUCT_JOURNAL_PATH),
    );
  });

  it("shares no migration tag with the product stream", () => {
    const identityTags = migrationTags(IDENTITY_DRIZZLE_DIR);
    expect(identityTags.length, "The identity migration stream must be non-empty").toBeGreaterThan(0);
    const productTags = new Set(migrationTags(PRODUCT_DRIZZLE_DIR));
    expect(identityTags.filter((tag) => productTags.has(tag))).toEqual([]);
  });
});

describe("company identity migration journal data", () => {
  it("declares a non-empty PostgreSQL journal with safe unique tags", () => {
    const journal = loadIdentityJournal();
    if (!journal) return;
    expect(journal.dialect).toBe("postgresql");
    expect(journal.entries.length).toBeGreaterThan(0);
    const tags = journal.entries.map(({ tag }) => tag);
    expect(new Set(tags).size).toBe(tags.length);
    for (const tag of tags) expect(tag).toMatch(/^\d{4}_[a-z0-9_]+$/);
  });

  it("uses contiguous indices in stored order", () => {
    const journal = loadIdentityJournal();
    if (!journal) return;
    expect(journal.entries.map(({ idx }) => idx)).toEqual(
      journal.entries.map((_, index) => index),
    );
  });

  it("uses finite positive timestamps that strictly increase with index", () => {
    const journal = loadIdentityJournal();
    if (!journal) return;
    for (const [index, entry] of journal.entries.entries()) {
      expect(Number.isSafeInteger(entry.when)).toBe(true);
      expect(entry.when).toBeGreaterThan(0);
      if (index > 0) {
        expect(entry.when).toBeGreaterThan(journal.entries[index - 1]!.when);
      }
    }
  });

  it("has exact one-to-one parity between journal entries and SQL files", () => {
    const journal = loadIdentityJournal();
    if (!journal) return;
    const journalTags = journal.entries.map(({ tag }) => tag).sort();
    const sqlTags = migrationTags(IDENTITY_DRIZZLE_DIR);
    expect(sqlTags).toEqual(journalTags);
    for (const tag of journalTags) {
      const matches = readdirSync(IDENTITY_DRIZZLE_DIR).filter(
        (name) => name === `${tag}.sql`,
      );
      expect(matches, `${tag} must resolve to exactly one identity SQL file`).toHaveLength(1);
    }
  });
});
