import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appDir = resolve(import.meta.dirname, "..");
const contentDir = resolve(appDir, "content/l2");
const weeks = readdirSync(contentDir)
  .filter((file) => /^w[0-9]{2}\.json$/.test(file))
  .map((file) => JSON.parse(readFileSync(resolve(contentDir, file), "utf8")) as {
    focus: { element?: { graphemes: string[] } };
  });
const expectedFiles = [
  "01-s", "02-t", "03-p", "04-n", "05-m", "06-d", "07-g", "08-c-k", "09-r", "10-h",
  "11-b", "12-f", "13-l", "14-j", "15-v", "16-w", "17-x-ks", "18-y", "19-z", "20-qu-kw",
  "21-ch", "22-sh", "23-th-voiced", "24-th-unvoiced", "25-ng", "26-a-short", "27-e-short",
  "28-i-short", "29-o-short", "30-u-short", "31-ai", "32-ee", "33-igh", "34-oa", "35-oo-long",
  "36-oo-short", "37-ar", "38-or", "39-ur", "40-ow", "41-oi", "42-ear", "43-air", "44-ure", "45-er",
].map((name) => `phonemes/daniel/${name}.mp3`);

/** Loads the bank as an assertion failure when Phase 3 has not added it yet. */
async function loadBank(): Promise<Array<{ grapheme: string; file: string }>> {
  try {
    const modulePath = "../lib/phoneme-bank";
    const module = await import(/* @vite-ignore */ modulePath);
    return module.PHONEME_BANK;
  } catch (error) {
    expect(error, "Storytime must provide the phoneme bank module").toBeUndefined();
    throw error;
  }
}

describe("Phase 3 phoneme bank", () => {
  it("contains 45 labeled G3 clip paths", async () => {
    const bank = await loadBank();
    expect(bank, "phoneme bank must not be empty").not.toHaveLength(0);
    const countLine = `phoneme_clips=${bank.length}`;
    const countMatch = countLine.match(/^phoneme_clips=([0-9]+)$/);
    expect(countMatch, "clip count must use its A3 label").not.toBeNull();
    expect(Number(countMatch?.[1]), countLine).toBe(45);
    expect(bank.map((entry) => entry.file).sort()).toEqual([...expectedFiles].sort());
    expect(bank.every((entry) => /^phonemes\/daniel\/[0-9]{2}-[a-z]+(-[a-z]+)*\.mp3$/.test(entry.file))).toBe(true);
  });

  it("maps each grapheme taught by shipped weeks to one bank clip", async () => {
    const bank = await loadBank();
    const taught = new Set(weeks.flatMap((week) => week.focus.element?.graphemes ?? []));
    expect(weeks, "the shipped week set must not be empty").not.toHaveLength(0);
    expect(taught.size, "the shipped grapheme set must not be empty").toBeGreaterThan(0);
    for (const grapheme of taught) {
      expect(bank.filter((entry) => entry.grapheme === grapheme), `${grapheme} must have one clip`).toHaveLength(1);
    }
  });
});
