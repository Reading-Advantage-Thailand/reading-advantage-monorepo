// @vitest-environment node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildCurriculumAutomatedReview,
  CURRICULUM_SOURCE_PATHS,
} from "./curriculum-release";
import { buildStaticSalesCurriculumRows } from "./static-seed";
import { curriculumGraphDigest } from "./verify-sales-curriculum";

// Adversarial cases for the S2 re-pin to advantage-pr 7eff8c10 (track
// sales_training_2027_20261015). The attack surface is a claim guard that
// passes after a new line lands while an old claim survives elsewhere. The
// cases mutate a copy of the real graph and call the real production guard,
// or they compare the graph with the real bytes at the pin. The content rows
// in curriculum-content-2027.test.ts are exact literals; these cases use
// normalized families and independent oracles so a changed dash or case does
// not hide an old claim.

const PIN = "7eff8c106c7265b41d584c4ea997d65ea30dadfb";
const PIN_REPO = join(homedir(), "Desktop", "advantage-pr");
const rows = buildStaticSalesCurriculumRows();
type Rows = typeof rows;

const MANAGED_LINE =
  "Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready.";

/** Product-list and tier lines that the claim guard must enforce (curriculum-release.ts). */
const GUARDED_CLAIMS = [
  "- **Live:** Primary Advantage, Tutor Advantage, and CodeCamp Advantage (adult bootcamp).",
  "- **Reading Advantage:** not offered to schools now; its books are now in Tutor Advantage classes.",
  "- **Science, Math, and Zhongwen Advantage (Q-PR-24):** each is its own app, built from the Primary Advantage base app. Show them at the visit. No date.",
  "- **K–6 offer, no date:** Storytime Advantage for Anuban 2 to P2 is part of the K–6 offer shown at the visits.",
  "- **Planned, no date:** STEM Advantage.",
  "Do not give a date for any of these lines.",
  "| **App-Only** | Digital platform access | ~1,000 THB/student/year |",
  "| **Blended Learning** | App + physical workbooks + 2-day teacher training + quarterly fidelity reports | ~1,500 THB/student/year |",
  `| **Managed Service** | If the school asks, say: "${MANAGED_LINE}" Never pre-sell it. | No price |`,
];

/** Rebuilds a value with a function applied to every string; copies plain data only. */
function mapStrings<T>(value: T, fn: (text: string) => string): T {
  if (typeof value === "string") return fn(value) as T;
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, fn)) as T;
  if (value instanceof Date) return value;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, mapStrings(item, fn)]),
    ) as T;
  }
  return value;
}

/** Collects every string value of a value, with no assumption about its shape. */
function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

/** Copies the graph and appends one extra paragraph to its last theory lesson. */
function withExtraParagraph(extra: string): Rows {
  const clone = mapStrings(rows, (text) => text);
  const target = [...clone.lessons].reverse().find((row) => row.type === "theory");
  if (!target) throw new Error("no theory lesson in the graph");
  target.content = `${target.content}\n\n${extra}`;
  return clone;
}

/** Folds case, dashes, and white space so a variant spelling of a claim still matches. */
function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ");
}

const graphText = allStrings(rows).join("\n");
const foldedGraph = fold(graphText);

describe("S2 adversarial - the production claim guard against a surviving old claim", () => {
  it("passes on the real graph (the mutation cases start from a green base)", () => {
    expect(() => buildCurriculumAutomatedReview(rows)).not.toThrow();
  });

  // Attack case 2: weaken canonicalProductListClaims or canonicalTierClaims by
  // deleting an entry. If the entry is gone from the list, removing its text
  // from the graph no longer fails the guard.
  it.each(GUARDED_CLAIMS)("enforces the guarded claim: %s", (claim) => {
    expect(graphText.includes(claim), "the claim is not in the real graph").toBe(true);
    const mutated = mapStrings(rows, (text) => text.split(claim).join(""));
    expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID required-claim/,
    );
  });

  it("rejects a Managed Service tier cell that swaps the approved line for the old condition", () => {
    const oldCell =
      '| **Managed Service** | Not sold today. It launches in 2027 only if 1–2 more schools sign. Never pre-sell it. | No price |';
    const mutated = mapStrings(rows, (text) =>
      text.split(GUARDED_CLAIMS[8]!).join(oldCell),
    );
    expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
    );
  });

  // Attack case 1: the new line is in the product lesson, and the old
  // condition survives in another lesson. The production guard must reject it.
  it.each([
    "**Managed Service** — Not sold today. It launches in 2027 only if 1–2 more schools sign. Never pre-sell it. — No price",
    "Managed Service: not sold today. It launches in 2027 only if 1-2 more schools sign.",
    "If a school asks about Managed Service, say that it launches in 2027 only if 1–2 more schools sign.",
  ])("rejects the retired Managed Service condition left in another lesson: %s", (probe) => {
    const mutated = withExtraParagraph(probe);
    expect(graphText.includes(probe), "the probe is already in the real graph").toBe(false);
    expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
    );
  });

  it("rejects a dated Managed Service launch with no condition", () => {
    const mutated = withExtraParagraph("Managed Service launches in 2027.");
    expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
    );
  });

  it("rejects a planned program given a year", () => {
    const mutated = withExtraParagraph("Science Advantage launches in 2027.");
    expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
    );
  });

  // A7: a hit with a filter word. The negation filter of the guard keeps a
  // live claim when the sentence also holds "do not". This is a known weakness
  // of the blunt filter, outside the S2 diff. `it.fails` records it: the case
  // passes while the weakness exists and fails when Green fixes the filter.
  it.fails("keeps a live claim for a planned program when the line also holds a filter word", () => {
    const mutated = withExtraParagraph(
      "Science Advantage is live and available now, so do not wait to tell the director.",
    );
    expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
    );
  });
});

describe("S2 adversarial - old claim families, with case, dash, and white space folded", () => {
  it.each([
    ["the Managed Service launch condition", /launch(?:es|ed|ing)? in 2027|1\s*-\s*2 more schools|one or two more schools/],
    ["Managed Service as not sold today", /managed service[^.\n]{0,40}not sold today|not sold today[^.\n]{0,60}managed service/],
    ["the old on-sale date", /2026-11-22|nov(?:ember)? 22\b/],
    ["the coming programs wording", /coming programs/],
    ["the open pilot terms", /paid or free|pilot is (?:paid|free)/],
    ["the old cutover plan", /weekend of oct|oct 17\/18|only after the cutover passes/],
    ["a team-size pitch", /1-school|5-person|five-person|small team|team of (?:five|5)\b/],
  ])("the graph holds no trace of %s", (_label, pattern) => {
    const hit = pattern.exec(foldedGraph);
    const context = hit
      ? foldedGraph.slice(Math.max(0, hit.index - 80), hit.index + hit[0].length + 80)
      : undefined;
    expect(context, "an old claim family survives in the graph").toBeUndefined();
  });

  it("states every scale fact only as an answer to a direct question or as the approved answer", () => {
    const offenders = graphText
      .split(/\n/)
      .filter((line) => /under 500|one active school|1 active school/i.test(line))
      .filter((line) =>
        !/direct question/i.test(line) &&
        !line.includes("Today we have one active school in Thailand, in Kalasin, on Primary Advantage.") &&
        !line.includes("we have one active school today. Our complete curriculum is being brought to market."),
      );
    expect(offenders).toEqual([]);
  });

  it("writes every Managed Service line with the one approved sentence", () => {
    const starts = graphText.match(/Today we offer App-Only and Blended Learning\./g) ?? [];
    const full = graphText.split(MANAGED_LINE).length - 1;
    expect(starts.length).toBeGreaterThanOrEqual(5);
    expect(full).toBe(starts.length);
  });

  it("holds no date that the pinned sources do not carry", () => {
    const sources = CURRICULUM_SOURCE_PATHS.map((path) => pinnedText(path)).join("\n");
    const dates = new Set(graphText.match(/\b20\d\d-\d\d-\d\d\b/g) ?? []);
    const missing = [...dates].filter((date) => !sources.includes(date));
    expect(missing).toEqual([]);
  });
});

/** Reads one pinned document as text from the advantage-pr repository (read only). */
function pinnedText(path: string): string {
  return pinnedBytes(path).toString("utf8");
}

/** Reads one pinned document as raw bytes from the advantage-pr repository (read only). */
function pinnedBytes(path: string): Buffer {
  return execFileSync("git", ["-C", PIN_REPO, "show", `${PIN}:${path}`], {
    maxBuffer: 4 * 1024 * 1024,
  });
}

/** True when the pin is readable in the local advantage-pr clone. */
function pinReadable(): boolean {
  try {
    execFileSync("git", ["-C", PIN_REPO, "cat-file", "-e", `${PIN}^{commit}`], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

const candidatePath = new URL("../curriculum/release-candidate.json", import.meta.url);
const candidate = JSON.parse(readFileSync(candidatePath, "utf8")) as {
  graphSha256: string;
  source: { commit: string; documents: Array<{ path: string; sha256: string }> };
  approval: { status: string };
};

describe("S2 adversarial - the release candidate binds the seed and the pin", () => {
  it("names the 7eff8c10 pin and the document list in guard order", () => {
    expect(candidate.source.commit).toBe(PIN);
    expect(candidate.source.documents.map((document) => document.path)).toEqual([
      ...CURRICULUM_SOURCE_PATHS,
    ]);
  });

  it("holds the graph digest of the seed as it stands (a stale candidate fails here)", () => {
    expect(candidate.graphSha256).toBe(curriculumGraphDigest(rows));
  });

  it("holds the same 21 hash fields and stays unapproved", () => {
    const hashKeys = (JSON.stringify(candidate).match(/"(?:sha256|graphSha256)"/g) ?? []).length;
    expect(hashKeys).toBe(21);
    expect(candidate.approval.status).toBe("awaiting_human_review");
  });

  it.skipIf(!pinReadable())(
    "holds the sha256 of the real bytes at the pin for each of the 20 documents",
    () => {
      for (const document of candidate.source.documents) {
        const actual = createHash("sha256").update(pinnedBytes(document.path)).digest("hex");
        expect(actual, document.path).toBe(document.sha256);
      }
    },
  );
});
