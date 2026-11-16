/**
 * The approved "How to join" copy (Phase 3, task 3.0; PM order 2026-11-16).
 *
 * The source is `~/Desktop/handoff/storytime-join-page-copy-2026-11-16/app-join-page-copy.md`,
 * version 0.3, sha256 `981cc4551a624e9a40e0acd952f8d9ac5cf2af3c88af13a82f3bdfd584ffb467`, source
 * commit 93662024. The test parses table (a) of that file, so the words are compared byte for byte
 * and are not typed a second time. The hand-off folder sits outside the repository, as the phase 5
 * hand-off tests do.
 *
 * At the base `lib/join-copy.ts` holds `status: "draft"` and `version: "0.1"`, so the status, the
 * version, and the draft-marker rows fail. The text rows already match v0.3: the English and the
 * Thai did not change since v0.1. They hold that match.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: async (arg?: { locale?: string }) => (key: string) =>
    `${arg?.locale ?? "th"}:${key}`,
}));

const APP = resolve(import.meta.dirname, "..");
const COPY_FILE = resolve(APP, "lib/join-copy.ts");
const JOIN_PAGE = resolve(APP, "app/[locale]/join/page.tsx");
const HANDOFF = resolve(
  homedir(),
  "Desktop/handoff/storytime-join-page-copy-2026-11-16/app-join-page-copy.md",
);
const HANDOFF_SHA256 = "981cc4551a624e9a40e0acd952f8d9ac5cf2af3c88af13a82f3bdfd584ffb467";

/** The keys of the copy, in the order of table (a). */
const KEYS = ["title", "heading", "whoItIsFor", "howToGetSignIn", "contact", "signInLink"] as const;
type Key = (typeof KEYS)[number];
type Copy = Record<Key, string>;

/** The block label of each key, as table (a) writes it. */
const BLOCK_KEYS: Record<string, Key> = {
  "Page title (browser tab)": "title",
  Heading: "heading",
  "Who it is for": "whoItIsFor",
  "How a family gets its sign-in": "howToGetSignIn",
  Contact: "contact",
  "Link to the sign-in page": "signInLink",
};

/** One row of table (a). */
interface Row {
  /** The block label of the row. */
  block: string;
  /** The English cell of the row. */
  en: string;
  /** The Thai cell of the row. */
  th: string;
}

/** The shape of the copy module that the test reads. */
interface CopyModule {
  /** The copy object of the page. */
  JOIN_COPY: Record<string, unknown> & { status: string; version: string; en: Copy; th: Copy };
  /** Gives the copy of one locale. */
  joinCopy: (locale: string) => Copy;
}

/**
 * Splits table (a) of the hand-off into its rows.
 * @param markdown The text of the hand-off file.
 * @returns The six rows of table (a), with the header and the separator line left out.
 */
function tableRows(markdown: string): Row[] {
  const start = markdown.indexOf("## (a) The blocks and the copy");
  const end = markdown.indexOf("## (b)");
  expect(start, "the hand-off holds section (a)").toBeGreaterThanOrEqual(0);
  expect(end, "the hand-off holds section (b) after (a)").toBeGreaterThan(start);
  const rows: Row[] = [];
  for (const line of markdown.slice(start, end).split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (cells[0] === "Block" || cells[0].startsWith("---")) continue;
    rows.push({ block: cells[0], en: cells[1], th: cells[2] });
  }
  return rows;
}

/** Reads the rows of the hand-off, or fails when the file is missing. */
function rows(): Row[] {
  expect(existsSync(HANDOFF), `Missing ${HANDOFF}`).toBe(true);
  if (!existsSync(HANDOFF)) return [];
  const found = tableRows(readFileSync(HANDOFF, "utf8"));
  console.log(`handoff_rows=${found.length}`);
  return found;
}

/** Loads the copy module. */
async function copyModule(): Promise<CopyModule> {
  expect(existsSync(COPY_FILE), "Missing apps/storytime/lib/join-copy.ts").toBe(true);
  return (await import("../lib/join-copy.js")) as CopyModule;
}

/** Renders the join page for one locale. */
async function renderJoin(locale: string): Promise<string> {
  expect(existsSync(JOIN_PAGE), "Missing apps/storytime/app/[locale]/join/page.tsx").toBe(true);
  const mod = (await import("../app/[locale]/join/page.js")) as {
    default: (props: never) => Promise<unknown>;
  };
  const element = await mod.default({ params: Promise.resolve({ locale }) } as never);
  return renderToStaticMarkup(element as ReactElement);
}

describe("approved how-to-join copy (red)", () => {
  it("reads the reviewed hand-off v0.3 with the six blocks", () => {
    const found = rows();
    const bytes = readFileSync(HANDOFF);
    const sha = createHash("sha256").update(bytes).digest("hex");
    expect(sha, "the hand-off identity").toBe(HANDOFF_SHA256);
    expect(bytes.toString("utf8"), "the hand-off version line").toContain("**Version:** 0.3");
    expect(found, "the six blocks of table (a)").toHaveLength(6);
    for (const row of found) {
      expect(row.en.length, `${row.block} holds English`).toBeGreaterThan(0);
      expect(row.th.length, `${row.block} holds Thai`).toBeGreaterThan(0);
      expect(BLOCK_KEYS[row.block], `${row.block} is a known block`).toBeTruthy();
    }
  });

  it("holds the English of table (a) byte for byte", async () => {
    const found = rows();
    const { JOIN_COPY } = await copyModule();
    for (const row of found) {
      const key = BLOCK_KEYS[row.block];
      if (!key) continue;
      expect(JOIN_COPY.en[key], `en ${row.block}`).toBe(row.en);
    }
  });

  it("holds the Thai of table (a) byte for byte", async () => {
    const found = rows();
    const { JOIN_COPY } = await copyModule();
    for (const row of found) {
      const key = BLOCK_KEYS[row.block];
      if (!key) continue;
      expect(JOIN_COPY.th[key], `th ${row.block}`).toBe(row.th);
    }
  });

  it("keeps the block order of table (a)", async () => {
    const order = rows().map((row) => BLOCK_KEYS[row.block]);
    expect(order, "the hand-off order").toEqual([...KEYS]);
    const { JOIN_COPY } = await copyModule();
    expect(Object.keys(JOIN_COPY.en), "the English order").toEqual(order);
    expect(Object.keys(JOIN_COPY.th), "the Thai order").toEqual(order);
  });

  it("marks the copy approved", async () => {
    const { JOIN_COPY } = await copyModule();
    expect(JOIN_COPY.status, "the copy status").toBe("approved");
  });

  it("names hand-off 0.3 and drops 0.1", async () => {
    const { JOIN_COPY } = await copyModule();
    expect(JOIN_COPY.version, "the version names 0.3").toMatch(/0\.3/);
    expect(JOIN_COPY.version, "the version drops 0.1").not.toMatch(/0\.1/);
  });

  it("holds no zh copy, and a zh locale shows the English", async () => {
    const { JOIN_COPY, joinCopy } = await copyModule();
    expect(Object.keys(JOIN_COPY), "no zh key").not.toContain("zh");
    expect(joinCopy("zh"), "the zh locale shows the English").toEqual(JOIN_COPY.en);
    expect(joinCopy("en"), "the en locale shows the English").toEqual(JOIN_COPY.en);
    expect(joinCopy("th"), "the th locale shows the Thai").toEqual(JOIN_COPY.th);
  });

  it("shows no draft marker when the status is approved", async () => {
    const { JOIN_COPY } = await copyModule();
    for (const locale of ["th", "en"] as const) {
      const html = await renderJoin(locale);
      const heading = locale === "th" ? JOIN_COPY.th.heading : JOIN_COPY.en.heading;
      expect(html, `${locale} renders the heading`).toContain(heading);
      expect(html, `${locale} shows no draft marker`).not.toContain("data-draft");
      expect(html, `${locale} writes no draft marker text`).not.toContain("joinDraftMarker");
    }
  });
});
