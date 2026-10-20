import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const meta = path.resolve(__dirname, "../../drizzle/meta");

/** First journal index whose snapshot must exist; 0003-0040 were never written (see MIGRATION_LEDGER.md). */
const FIRST_REQUIRED = 41;

const journal = JSON.parse(readFileSync(path.join(meta, "_journal.json"), "utf8")) as {
  entries: { idx: number; tag: string }[];
};

/**
 * Reads the snapshot file for a journal entry, or null when the file is missing.
 * @param tag Journal tag, such as `0072_primary_stories`.
 * @returns The id and prevId of the snapshot, or null.
 */
function snapshot(tag: string): { id: string; prevId: string } | null {
  const file = path.join(meta, `${tag.slice(0, 4)}_snapshot.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

describe("drizzle snapshot chain (M-1)", () => {
  it("has a snapshot for every journal entry from 0041", () => {
    const missing = journal.entries.filter((e) => e.idx >= FIRST_REQUIRED && !snapshot(e.tag)).map((e) => e.tag);
    expect(missing).toEqual([]);
  });

  it("links each snapshot prevId to the id of the snapshot before it", () => {
    const found = journal.entries.map((e) => ({ tag: e.tag, snap: snapshot(e.tag) })).filter((e) => e.snap);
    const broken: string[] = [];
    for (let i = 1; i < found.length; i++) {
      if (found[i].snap!.prevId !== found[i - 1].snap!.id) broken.push(found[i].tag);
    }
    expect(broken).toEqual([]);
  });
});
