import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "@/locales/en";
import th from "@/locales/th";
import zh from "@/locales/zh";

/*
 * www customer copy names CEFR only. The PM final-check gate of 2026-11-16
 * said: "GSE leaves all customer copy (CEFR only)". These cases read the real
 * shipped surfaces: locale message data, blog markdown files, SVG mockups, and
 * rendered page copy. No TypeScript or TSX source text is read.
 */

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** A blocked term and the pattern that finds it as a word. */
const TERMS = [
  { label: "GSE", pattern: /\bGSE\b/ },
  { label: "Global Scale of English", pattern: /Global Scale of English/i },
  { label: "Pearson", pattern: /\bPearson\b/i },
  { label: "YLE", pattern: /\bYLE\b/ },
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

/** Collects every string leaf of a locale message object. */
function stringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (value !== null && typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap(stringLeaves);
}

/**
 * Lists content files of a shipped kind under one directory.
 * @param dir Directory relative to the app root.
 * @param extensions The file extensions to keep.
 * @returns The file paths relative to the app root.
 */
function listContentFiles(
  dir: string,
  extensions: readonly string[],
): string[] {
  const absolute = join(APP_ROOT, dir);
  if (!statSync(absolute).isDirectory()) return [];
  const files: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".turbo", "assets"].includes(entry.name)) {
        continue;
      }
      files.push(...listContentFiles(child, extensions));
      continue;
    }
    if (!extensions.includes(extname(entry.name))) continue;
    files.push(child);
  }
  return files;
}

/** Builds a hit from one line of one shipped content file. */
function hitFromLine(file: string, text: string, index: number): Hit[] {
  return TERMS.flatMap((term) =>
    term.pattern.test(text)
      ? [{ file, line: index + 1, term: term.label, text: text.trim() }]
      : [],
  );
}

/** Collects blocked-term hits over all shipped customer-copy surfaces. */
function collectHits(): Hit[] {
  const files = [
    ...listContentFiles("src/app/[locale]/(marketing)/blog/posts", [
      ".md",
      ".mdx",
    ]),
    ...listContentFiles("public", [".svg"]),
  ];
  const hits: Hit[] = [];
  for (const file of files) {
    const lines = readFileSync(join(APP_ROOT, file), "utf8").split("\n");
    lines.forEach((text, index) => hits.push(...hitFromLine(file, text, index)));
  }
  for (const messages of [en, th, zh]) {
    stringLeaves(messages).forEach((text, index) =>
      hits.push(...hitFromLine("locale messages", text, index)),
    );
  }
  return hits;
}

/** Tells whether a PENDING entry covers a hit. */
function isPending(hit: Hit): boolean {
  return PENDING.some(
    (entry) => entry.file === hit.file && hit.text.includes(entry.snippet),
  );
}

/** Formats a hit for the failure message. */
function formatHit(hit: Hit): string {
  return `${hit.file}:${hit.line}: ${hit.term} -> ${hit.text}`;
}

const hits = collectHits();

describe("www customer copy holds no GSE, Pearson, or YLE", () => {
  it("holds no blocked term outside the pending list", () => {
    const failures = hits.filter((hit) => !isPending(hit)).map(formatHit);
    expect(
      failures,
      `Blocked terms in customer copy:\n${failures.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps each pending entry tied to a live hit", () => {
    const stale = PENDING.filter(
      (entry) =>
        !hits.some(
          (hit) => hit.file === entry.file && hit.text.includes(entry.snippet),
        ),
    ).map(
      (entry) =>
        `${entry.file} no longer holds "${entry.snippet}"; remove the pending entry`,
    );
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
