// @vitest-environment node
/**
 * Phase 3 adversarial round: hostile week data in the loader
 * (test strategy P3.12, the adversarial row).
 *
 * Each case mutates a deep clone of the shipped published week: `..` in a
 * media file name, a media path beyond the 200-character limit, duplicate
 * books, an approved loops part without words, a sentence page of 0, and a
 * sentence page beyond the book. The contract must reject every case with a
 * reason, and `loadVisibleWeek` must block it. A ready control proves the
 * harness can pass, so a broken fixture cannot make the hostile cases pass
 * vacuously (A4).
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import week1 from "../content/l2/w01.json";
import { loadVisibleWeek, loadWeek } from "../lib/content";

const app = resolve(import.meta.dirname, "..");
const previousContentDir = process.env.STORYTIME_CONTENT_DIR;
let scratch: string;

/** One deep clone of the shipped published week, typed for mutation. */
function clone(): Record<string, any> {
  return structuredClone(week1) as unknown as Record<string, any>;
}

/** The ready form of a clone: every page picture has a file and the media parts are approved. */
function ready(copy: Record<string, any>): Record<string, any> {
  for (const book of copy.books as Array<{ kind: string; pages: Array<{ image?: Record<string, unknown> }> }>) {
    for (const page of book.pages) {
      if (page.image) page.image.file = `review/${book.kind}-page.webp`;
    }
  }
  copy.approval = {
    images: { status: "approved" },
    audio: { status: "approved" },
    song: { status: "approved" },
  };
  return copy;
}

/** Writes one week clone to the scratch content folder as the shipped w01. */
function writeWeek(copy: Record<string, any>): void {
  const level = resolve(scratch, "l2");
  mkdirSync(level, { recursive: true });
  writeFileSync(resolve(level, "w01.json"), `${JSON.stringify(copy, null, 2)}\n`);
}

/**
 * Writes a hostile clone and reads both loader results.
 * @param copy The mutated week.
 * @returns The `loadWeek` result and the `loadVisibleWeek` result.
 */
async function load(copy: Record<string, any>) {
  writeWeek(copy);
  const loaded = await loadWeek(2, 1);
  const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const visible = await loadVisibleWeek(2, 1);
  warning.mockRestore();
  return { loaded, visible, warning };
}

/** The issue text of an invalid load, or a string that cannot match an expectation. */
function issuesOf(loaded: Awaited<ReturnType<typeof loadWeek>>): string {
  return loaded.kind === "invalid" ? loaded.issues : `kind=${loaded.kind}`;
}

beforeEach(() => {
  scratch = mkdtempSync(resolve(tmpdir(), "storytime-p3adv-week-"));
  process.env.STORYTIME_CONTENT_DIR = scratch;
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

afterAll(() => {
  if (previousContentDir === undefined) delete process.env.STORYTIME_CONTENT_DIR;
  else process.env.STORYTIME_CONTENT_DIR = previousContentDir;
});

describe("Phase 3 adversarial week data in the loader", () => {
  it("keeps two ready controls: the shipped week parses and the ready clone renders", async () => {
    writeWeek(clone());
    expect((await loadWeek(2, 1)).kind, "the shipped w01 must parse").toBe("ok");

    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    writeWeek(ready(clone()));
    const visible = await loadVisibleWeek(2, 1);
    warning.mockRestore();
    expect(visible, "the ready control must pass the visibility gate").not.toBeNull();
  });

  it("rejects a published week with a parent segment in a media file name", async () => {
    const copy = clone();
    (copy.books as Array<{ audio: { file?: string } }>)[0]!.audio.file = "../../etc/passwd";
    const { loaded, visible } = await load(copy);
    expect(loaded.kind, "the traversal file name must fail the contract").toBe("invalid");
    expect(issuesOf(loaded)).toContain("no parent segment");
    expect(visible, "a rejected week must never reach a child").toBeNull();
  });

  it("rejects a media path beyond the 200-character limit", async () => {
    const copy = clone();
    (copy.books as Array<{ audio: { file?: string } }>)[0]!.audio.file = `${"a".repeat(201)}.mp3`;
    const { loaded, visible } = await load(copy);
    expect(loaded.kind, "the very long path must fail the contract").toBe("invalid");
    expect(issuesOf(loaded)).toContain("at most 200 characters");
    expect(visible, "a rejected week must never reach a child").toBeNull();
  });

  it("rejects a published week with duplicate books", async () => {
    const copy = clone();
    const books = copy.books as Array<{ kind: string }>;
    books[1]!.kind = books[0]!.kind;
    const { loaded, visible } = await load(copy);
    expect(loaded.kind, "duplicate books must fail the published-week rule").toBe("invalid");
    expect(issuesOf(loaded)).toContain("needs one");
    expect(visible, "a rejected week must never reach a child").toBeNull();
  });

  it("rejects an approved loops part without words", async () => {
    const copy = clone();
    copy.approval = { ...(copy.approval as Record<string, unknown>), loops: { status: "approved", date: "2026-11-04" } };
    const { loaded, visible } = await load(copy);
    expect(loaded.kind, "an approved loops part without words must fail").toBe("invalid");
    expect(issuesOf(loaded)).toContain("loops");
    expect(visible, "a rejected week must never reach a child").toBeNull();
  });

  it("rejects a sentence page of 0", async () => {
    const copy = clone();
    const sentences = (copy.books as Array<{ audio: { sentences: Array<{ page?: number }> } }>)[0]!
      .audio.sentences;
    expect(sentences.length, "the shipped book must hold timed sentences").toBeGreaterThan(0);
    sentences[0]!.page = 0;
    const { loaded, visible } = await load(copy);
    expect(loaded.kind, "a page of 0 must fail the contract").toBe("invalid");
    expect(issuesOf(loaded)).toContain("page");
    expect(visible, "a rejected week must never reach a child").toBeNull();
  });

  it("rejects a sentence page beyond the book", async () => {
    const copy = clone();
    const book = (copy.books as Array<{ audio: { sentences: Array<{ page?: number }> }; pages: unknown[] }>)[0]!;
    expect(book.pages.length, "the shipped book must hold pages").toBeGreaterThan(0);
    book.audio.sentences[0]!.page = book.pages.length + 5;
    const { loaded, visible } = await load(copy);
    expect(loaded.kind, "a page beyond the book must fail the contract").toBe("invalid");
    expect(issuesOf(loaded)).toContain("beyond");
    expect(visible, "a rejected week must never reach a child").toBeNull();
  });
});
