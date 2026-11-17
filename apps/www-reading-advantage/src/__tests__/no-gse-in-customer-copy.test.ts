// @vitest-environment node
/**
 * www customer copy names CEFR only. No GSE, Global Scale of English, Pearson, or YLE.
 * The PM final-check gate of 2026-11-16 said: "GSE leaves all customer copy (CEFR only)".
 * The scan reads the locale strings, the blog posts under src/app, every other md/mdx
 * file under src, the TSX and TS string literals that render, and the public SVG mockups.
 * A PENDING hit does not fail the test. The PM decides each PENDING entry.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** A blocked term and the pattern that finds it as a word. */
const TERMS = [
  { label: "GSE", pattern: /\bGSE\b/ },
  { label: "Global Scale of English", pattern: /Global Scale of English/i },
  { label: "Pearson", pattern: /\bPearson\b/i },
  { label: "YLE", pattern: /\bYLE\b/ },
] as const;

/** The customer-copy paths and the file kinds that carry page text. */
const SCAN = [
  { dir: "src/locales", extensions: [".ts"] },
  { dir: "src/app", extensions: [".ts", ".tsx", ".md", ".mdx"] },
  { dir: "src/components", extensions: [".ts", ".tsx"] },
  { dir: "src", extensions: [".md", ".mdx"] },
  { dir: "public", extensions: [".svg"] },
] as const;

/** A hit the PM must decide. It does not fail the test. */
const PENDING = [
  {
    file: "src/app/[locale]/(marketing)/blog/posts/en/the-advantage-engine-kst-srs.md",
    snippet: "Global Scale of English (GSE)",
    reason:
      "The PM decision of 2026-11-16 sends the CEFR sentence for this blog post. This track edits no blog post.",
  },
  {
    file: "src/app/[locale]/(marketing)/blog/posts/th/the-advantage-engine-kst-srs.md",
    snippet: "Global Scale of English (GSE)",
    reason:
      "The Thai text of the same blog post needs the PM sentence before an edit. This track edits no blog post.",
  },
] as const;

/** One blocked-term hit in one customer-copy line. */
interface Hit {
  file: string;
  line: number;
  term: string;
  text: string;
}

/**
 * Lists the customer-copy files under one directory.
 * @param dir Directory relative to the app root.
 * @param extensions The file extensions to keep.
 * @returns The file paths relative to the app root.
 */
function listFiles(dir: string, extensions: readonly string[]): string[] {
  const absolute = join(APP_ROOT, dir);
  if (!statSync(absolute).isDirectory()) return [];
  const files: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".turbo", "__tests__", "__snapshots__"].includes(entry.name)) continue;
      files.push(...listFiles(child, extensions));
      continue;
    }
    if (/\.(test|spec)\./.test(entry.name)) continue;
    if (!extensions.includes(extname(entry.name))) continue;
    files.push(child);
  }
  return files;
}

/**
 * Collects every blocked-term hit in the customer-copy files.
 * @returns Each hit with its file, line, term, and line text.
 */
function collectHits(): Hit[] {
  const files = [...new Set(SCAN.flatMap((scan) => listFiles(scan.dir, scan.extensions)))].sort();
  const hits: Hit[] = [];
  for (const file of files) {
    const lines = readFileSync(join(APP_ROOT, file), "utf8").split("\n");
    lines.forEach((text, index) => {
      for (const term of TERMS) {
        if (term.pattern.test(text)) {
          hits.push({ file, line: index + 1, term: term.label, text: text.trim() });
        }
      }
    });
  }
  return hits;
}

/**
 * Tells whether a PENDING entry covers a hit.
 * @param hit The blocked-term hit.
 * @returns True when the file and the snippet both match.
 */
function isPending(hit: Hit): boolean {
  return PENDING.some((entry) => entry.file === hit.file && hit.text.includes(entry.snippet));
}

/**
 * Formats a hit for the failure message.
 * @param hit The blocked-term hit.
 * @returns The file, line, term, and text on one line.
 */
function formatHit(hit: Hit): string {
  return `${hit.file}:${hit.line}: ${hit.term} -> ${hit.text}`;
}

const hits = collectHits();

describe("www customer copy holds no GSE, Pearson, or YLE", () => {
  it("holds no blocked term outside the pending list", () => {
    const failures = hits.filter((hit) => !isPending(hit)).map(formatHit);
    expect(failures, `Blocked terms in customer copy:\n${failures.join("\n")}`).toEqual([]);
  });

  it("keeps each pending entry tied to a live hit", () => {
    const stale = PENDING.filter(
      (entry) => !hits.some((hit) => hit.file === entry.file && hit.text.includes(entry.snippet)),
    ).map((entry) => `${entry.file} no longer holds "${entry.snippet}"; remove the pending entry`);
    expect(stale, `Stale pending entries:\n${stale.join("\n")}`).toEqual([]);
  });

  it("gives every pending entry a reason", () => {
    for (const entry of PENDING) {
      expect(entry.reason.trim().length, `${entry.file} needs a reason`).toBeGreaterThan(20);
    }
  });

  it("prints the pending hits for the PM", () => {
    const pending = hits.filter(isPending).map(formatHit);
    expect(pending.length).toBeGreaterThanOrEqual(PENDING.length);
    if (pending.length > 0) console.info(`PENDING for the PM:\n${pending.join("\n")}`);
  });
});
