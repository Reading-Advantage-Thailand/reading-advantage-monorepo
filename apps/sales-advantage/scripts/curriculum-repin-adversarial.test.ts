// @vitest-environment node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  assertCurriculumReleaseReady,
  buildCurriculumAutomatedReview,
  CURRICULUM_SOURCE_PATHS,
} from "./curriculum-release";
import { buildStaticSalesCurriculumRows } from "./static-seed";
import { curriculumGraphDigest } from "./verify-sales-curriculum";

// Adversarial cases for the S2 re-pin to advantage-pr 609f962e (track
// sales_training_2027_20261015). The attack surface is a claim guard that
// passes after a new line lands while an old claim survives elsewhere. The
// cases mutate a copy of the real graph and call the real production guard,
// or they compare the graph with the real bytes at the pin. The content rows
// in curriculum-content-2027.test.ts are exact literals; these cases use
// normalized families and independent oracles so a changed dash or case does
// not hide an old claim.

const PIN = "609f962e6577e6a4c468dafb758d0cce81526b53";
const PIN_REPO = join(homedir(), "Desktop", "advantage-pr");
const rows = buildStaticSalesCurriculumRows();
type Rows = typeof rows;

const MANAGED_LINE =
  "Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready.";

/** Product-list and tier lines that the claim guard must enforce (curriculum-release.ts). */
const GUARDED_CLAIMS = [
  "- **Live:** Primary Advantage, Tutor Advantage, and CodeCamp Advantage (adult bootcamp).",
  "- **Reading Advantage:** not offered to schools now; its books are now in Tutor Advantage classes.",
  "- **Each its own app, built from the Primary Advantage base app, aimed at primary schools in the 2027 school year:** Science, Math, and Zhongwen Advantage. Show them at the visit. Give no other date.",
  "- **K–6 offer:** Storytime Advantage for Anuban 2 to P2 is part of the K–6 offer shown at the visits. It goes live in November 2026; give no exact day.",
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
    const mutated = withExtraParagraph("Science Advantage launches in 2028.");
    expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
    );
  });

  // Open item O3: the guard allows exactly the three public dates of the scope
  // doc Dates paragraph, and it keeps every other year and month banned.
  it.each([
    "Science Advantage is aimed at primary schools in the 2027 school year.",
    "Math Advantage is aimed at primary schools in the 2027 school year.",
    "Zhongwen Advantage is aimed at primary schools in the 2027 school year.",
    "Storytime Advantage goes live in November 2026; give no exact day.",
  ])("accepts a planned line with exactly one public date: %s", (probe) => {
    const mutated = withExtraParagraph(probe);
    expect(() => buildCurriculumAutomatedReview(mutated)).not.toThrow();
  });

  it.each([
    "Science Advantage is aimed at primary schools in the 2028 school year.",
    "Storytime Advantage goes live in November 2027.",
    "Storytime Advantage goes live in December 2026.",
  ])("rejects a planned line with another date: %s", (probe) => {
    const mutated = withExtraParagraph(probe);
    expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID product-status/,
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

// Round 2: the ban `retiredManagedServiceCondition` in curriculum-release.ts is
// a regex on one normalized statement. The cases below probe spellings that it
// must catch, the approved line that it must let pass, and spellings or
// near-matches that it misses or over-matches. `it.fails` records a known
// weakness: the case passes while the weakness exists and fails when the ban is
// fixed. None of these weaknesses lets the exact old line through.
describe("S2 adversarial round 2 - the ban on the retired Managed Service condition", () => {
  /** Builds a probe line that holds only the condition, with no launch word and no year. */
  const probeLine = (condition: string): string =>
    `A fuller service waits until ${condition} sign.`;

  it.each([
    "1 – 2 more schools",
    "1-2 more schools",
    "1 2 more schools",
    "one or two more schools",
    "ONE OR TWO MORE SCHOOLS",
    "1 – 2 more schools",
  ])("rejects the spelling: %s", (condition) => {
    const mutated = withExtraParagraph(probeLine(condition));
    expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID product-status/,
    );
  });

  it("lets the approved Managed Service sentence pass in a new lesson", () => {
    const mutated = withExtraParagraph(`If the school asks, say: "${MANAGED_LINE}"`);
    expect(() => buildCurriculumAutomatedReview(mutated)).not.toThrow();
  });

  it("lets two unrelated school counts pass", () => {
    const mutated = withExtraParagraph(
      "A pilot covers 1 grade level. Two schools in Kalasin asked for a visit.",
    );
    expect(() => buildCurriculumAutomatedReview(mutated)).not.toThrow();
  });

  // Variant spellings of the retired condition that the regex does not hold.
  for (const condition of [
    "1 to 2 more schools",
    "one to two more schools",
    "1 or 2 more schools",
    "1‑2 more schools",
    "1–2\nmore schools",
    "1–2 further schools",
  ]) {
    it.fails(`misses the spelling: ${JSON.stringify(condition)}`, () => {
      const mutated = withExtraParagraph(probeLine(condition));
      expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
        /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
      );
    });
  }

  // The regex has no word boundary, so a longer number holds the match too.
  for (const text of ["Twelve classes need 12 more schools to join.", "A list holds 112 more schools."]) {
    it.fails(`over-matches a number that ends in 12: ${JSON.stringify(text)}`, () => {
      const mutated = withExtraParagraph(text);
      expect(() => buildCurriculumAutomatedReview(mutated)).not.toThrow();
    });
  }
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
  return pinnedBytesAt(PIN, path);
}

/** Reads one document as raw bytes at one commit of the advantage-pr repository (read only). */
function pinnedBytesAt(commit: string, path: string): Buffer {
  return execFileSync("git", ["-C", PIN_REPO, "show", `${commit}:${path}`], {
    maxBuffer: 4 * 1024 * 1024,
  });
}

/** True when one commit is readable in the local advantage-pr clone; defaults to the pin. */
function pinReadable(commit: string = PIN): boolean {
  try {
    execFileSync("git", ["-C", PIN_REPO, "cat-file", "-e", `${commit}^{commit}`], {
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
  approval: { status: string } & Record<string, unknown>;
};

describe("S2 adversarial - the release candidate binds the seed and the pin", () => {
  it("names the 609f962e pin and the document list in guard order", () => {
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

// Round 3: the 609f962e re-pin. Open item O3 lets a planned line state only
// the three public dates of the scope doc Dates paragraph, and the scope doc
// §7 criterion 8 binds each date to its product: the May 2027 line (the new
// editions), the 2027 school year (Science, Math, and Zhongwen Advantage),
// and November 2026 (Storytime Advantage). The probes attack the guard with
// other spellings, other products, and other sentence positions.

/** The previous pin, whose wording the 609f962e re-pin retired. */
const PREVIOUS_PIN = "7eff8c106c7265b41d584c4ea997d65ea30dadfb";

/** The old 7eff8c10 date answer that the re-pin retired. */
const OLD_WORDING_7EFF8C10 = "Give no date (Q-PR-24)";

/** The new date guidance of the 609f962e seed. */
const NEW_DATE_GUIDANCE = "Name the 2027 school year; give no other date";

/** The monorepo root, for the approval-evidence gate of assertCurriculumReleaseReady. */
const WORKSPACE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

describe("S2 adversarial round 3 - the O3 date guard against date smuggling", () => {
  // Each probe holds a date the pinned sources do not allow for the named
  // product, in a spelling or a position that must not bypass the guard.
  it.each([
    // An abbreviated spelling of the Storytime date stays banned: the
    // whitelist holds only the exact public spellings.
    "Storytime Advantage goes live in Nov 2026.",
    // "2027-28" still holds the banned year token 2027 outside the whitelist.
    "Science Advantage is aimed at the 2027-28 school year.",
    // A live verb with a date form outside the whitelist fails.
    "Storytime Advantage launches in SY2027.",
    // A bare year with a live verb fails.
    "Science Advantage is live in 2027.",
    // A bare month with a live verb fails through the live-claim rule; "may"
    // is outside the month list of the guard.
    "Science Advantage launches in May.",
    // Mixed case and extra spaces do not bypass the normalized guard.
    "SCIENCE   Advantage   Launches  in   NOVEMBER   2027.",
    // The launch-verb form of the cross-product November 2026 claim fails
    // through the global launch-plus-year rule on the unstripped statement.
    "Science Advantage launches in November 2026.",
  ])("rejects a planned-line date the sources do not allow: %s", (probe) => {
    expect(graphText.includes(probe), "the probe is already in the real graph").toBe(false);
    expect(() => buildCurriculumAutomatedReview(withExtraParagraph(probe))).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID product-status/,
    );
  });

  it("accepts the exact Storytime public date with mixed case and extra spaces", () => {
    const probe = "Storytime   Advantage goes live in   November   2026.";
    expect(() => buildCurriculumAutomatedReview(withExtraParagraph(probe))).not.toThrow();
  });

  // Defect D1: the guard strips the three public dates from any planned line,
  // product-agnostic, so a planned line accepts the date of another product.
  // The pinned sources bind each date to its product (scope doc §7 criterion
  // 8), and STEM Advantage has no public date at all ("Planned, no date").
  // These cases stay failing for Green; the guard accepts every probe.
  it.each([
    "Storytime Advantage is aimed at primary schools in the 2027 school year.",
    "STEM Advantage is aimed at the 2027 school year.",
    "Storytime Advantage goes live in May 2027.",
    "Science Advantage goes live in november 2026.",
  ])("rejects a public date moved to another product: %s", (probe) => {
    expect(graphText.includes(probe), "the probe is already in the real graph").toBe(false);
    expect(() => buildCurriculumAutomatedReview(withExtraParagraph(probe))).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID product-status/,
    );
  });

  // Defect D2: the guard splits statements on sentence ends, so a second
  // sentence without the product name escapes the planned-line check and the
  // Advantage-wide launch-plus-year rule. These cases stay failing for Green;
  // the guard accepts every probe.
  it.each([
    "Storytime Advantage is part of the K-6 offer. It goes live in December 2026.",
    "Science Advantage is aimed at primary schools. It launches in 2028.",
  ])("rejects a wrong date in a second sentence of the same line: %s", (probe) => {
    expect(() => buildCurriculumAutomatedReview(withExtraParagraph(probe))).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
    );
  });

  // Known weaknesses of the year and month matchers, not blocking. `it.fails`
  // records them: each case passes while the weakness exists and fails when
  // the matcher is fixed.
  it.fails("rejects a bare month without a live verb (Review A F3)", () => {
    const mutated = withExtraParagraph("The Science Advantage app is planned for May.");
    expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
    );
  });

  it.fails("rejects a SY2027 date form without a live verb", () => {
    const mutated = withExtraParagraph("Storytime Advantage is planned for SY2027.");
    expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
    );
  });
});

describe("S2 adversarial round 3 - a seed line restored to the 7eff8c10 wording", () => {
  it.skipIf(!pinReadable(PREVIOUS_PIN) || !pinReadable())(
    "the old wording exists at 7eff8c10 and is gone from every source at 609f962e",
    () => {
      const oldDemoScripts = pinnedBytesAt(
        PREVIOUS_PIN,
        "09-sales-enablement/demo-scripts.md",
      ).toString("utf8");
      expect(oldDemoScripts).toContain(OLD_WORDING_7EFF8C10);
      for (const path of CURRICULUM_SOURCE_PATHS) {
        expect(pinnedText(path), path).not.toContain(OLD_WORDING_7EFF8C10);
      }
    },
  );

  it("a restored old wording fails the release binding through the graph digest", () => {
    expect(graphText.split(NEW_DATE_GUIDANCE).length - 1).toBeGreaterThanOrEqual(1);
    expect(graphText).not.toContain(OLD_WORDING_7EFF8C10);
    const restored = mapStrings(rows, (text) =>
      text.split(NEW_DATE_GUIDANCE).join(OLD_WORDING_7EFF8C10));
    // The claim guard is not the layer that catches a restore: the old wording
    // holds no banned claim, so the text checks still pass. The defense is the
    // candidate binding and the content rows of curriculum-content-2027.test.ts.
    expect(() => buildCurriculumAutomatedReview(restored)).not.toThrow();
    expect(curriculumGraphDigest(restored)).not.toBe(candidate.graphSha256);
    expect(curriculumGraphDigest(rows)).toBe(candidate.graphSha256);
  });
});

describe("S2 adversarial round 3 - the release candidate resists tampering", () => {
  it("the real candidate cannot pass the release gate while approval waits", async () => {
    await expect(
      assertCurriculumReleaseReady(candidate, rows, { workspaceRoot: WORKSPACE_ROOT }),
    ).rejects.toThrow("SALES_CURRICULUM_HUMAN_APPROVAL_REQUIRED");
  });

  // A source commit in any form but the exact 40-character lowercase pin
  // fails the manifest schema before any other check runs.
  it.each(["609f962e", PIN.toUpperCase(), `${PIN}0`])(
    "rejects a source commit that is not the exact pin: %s",
    async (commit) => {
      const tampered = mapStrings(candidate, (text) => text);
      tampered.source.commit = commit;
      await expect(
        assertCurriculumReleaseReady(tampered, rows, { workspaceRoot: WORKSPACE_ROOT }),
      ).rejects.toMatchObject({ name: "ZodError" });
    },
  );

  it("rejects an approval status outside the schema", async () => {
    const tampered = mapStrings(candidate, (text) => text);
    tampered.approval = { ...tampered.approval, status: "reviewed" };
    await expect(
      assertCurriculumReleaseReady(tampered, rows, { workspaceRoot: WORKSPACE_ROOT }),
    ).rejects.toMatchObject({ name: "ZodError" });
  });

  it.skipIf(!pinReadable())("a changed document sha256 breaks the pin binding", () => {
    const tampered = mapStrings(candidate, (text) => text);
    const target = tampered.source.documents[0]!;
    target.sha256 = (target.sha256.startsWith("a") ? "b" : "a") + target.sha256.slice(1);
    // The surgical change breaks exactly one document; the other 19 still
    // match the pinned bytes, so the mismatch cannot be vacuous.
    const mismatches = tampered.source.documents.filter(
      (document) =>
        createHash("sha256").update(pinnedBytes(document.path)).digest("hex") !==
        document.sha256,
    );
    expect(mismatches.map((document) => document.path)).toEqual([
      candidate.source.documents[0]!.path,
    ]);
  });

  it.skipIf(!pinReadable(PREVIOUS_PIN))(
    "the recorded document hashes do not validate against the old 7eff8c10 pin",
    () => {
      // A candidate with source.commit other than 609f962e fails: the recorded
      // hashes bind the documents of the new pin, and every document that
      // changed between the pins hashes differently at the old pin.
      const stale = candidate.source.documents.filter(
        (document) =>
          createHash("sha256").update(pinnedBytesAt(PREVIOUS_PIN, document.path)).digest("hex") !==
          document.sha256,
      );
      expect(stale.length).toBeGreaterThan(0);
      expect(stale.map((document) => document.path)).toContain(
        "09-sales-enablement/sales-training-scope-2027.md",
      );
    },
  );

  it("a self-declared approval without the reviewer trust anchor fails", async () => {
    const tampered = mapStrings(candidate, (text) => text);
    tampered.approval = {
      status: "approved",
      reviewer: "adversary",
      reviewedAt: "2026-11-15T00:00:00.000Z",
      evidenceRef: "measure/tracks/sales_advantage_golive_20260701/curriculum-approval.json",
      evidenceSha256: "0".repeat(64),
      checks: { pedagogy: true, sourceTraceability: true, honestClaims: true, roleplayRubrics: true },
    };
    await expect(
      assertCurriculumReleaseReady(tampered, rows, { workspaceRoot: WORKSPACE_ROOT }),
    ).rejects.toThrow("SALES_CURRICULUM_APPROVAL_TRUST_ANCHOR_REQUIRED");
  });

  it("the old golive approval cannot bless the re-pinned candidate", async () => {
    const evidenceRef =
      "measure/tracks/sales_advantage_golive_20260701/curriculum-approval.json";
    const evidenceSha256 = createHash("sha256")
      .update(readFileSync(join(WORKSPACE_ROOT, evidenceRef)))
      .digest("hex");
    const tampered = mapStrings(candidate, (text) => text);
    tampered.approval = {
      status: "approved",
      reviewer: "adversary",
      reviewedAt: "2026-11-15T00:00:00.000Z",
      evidenceRef,
      evidenceSha256,
      checks: { pedagogy: true, sourceTraceability: true, honestClaims: true, roleplayRubrics: true },
    };
    // The evidence is real and its hash matches, but it binds the old graph
    // and the old source commit, so the re-pinned candidate is rejected.
    await expect(
      assertCurriculumReleaseReady(tampered, rows, {
        workspaceRoot: WORKSPACE_ROOT,
        approvalSha256: evidenceSha256,
      }),
    ).rejects.toThrow("SALES_CURRICULUM_APPROVAL_EVIDENCE_MISMATCH");
  });
});

// Round 4 (r2): the Green r4 fix (e10d08a94) binds each public date to its
// product and lets a pronoun sentence carry the products of the planned-line
// sentence before it on the same line. The cases attack the seams of that
// fix: the carry stops at a line break, the pronoun list is short, the
// product set of a statement is a union, the May 2027 strip keys on a
// new-editions mention instead of a product, and a period inside a line
// orphans the date. Every probe holds a date the pinned sources do not allow
// for the named product (scope doc §7 criterion 8). Failing cases stay
// failing for Green; `it.fails` cases record weaknesses that are not blocking.
describe("S2 adversarial round 4 - the r4 date fix against carry, set, and split attacks", () => {
  // Controls: behavior the fix must keep. Rejects.
  it.each([
    // A carried pronoun with a date that fits none of the carried products.
    "Storytime Advantage and STEM Advantage are planned. They start in the 2027 school year.",
    // Normalization covers case; a wrong year on a lowercase full name fails.
    "science advantage launches in 2028.",
    // A launch verb with any year fails through the global rule, even when the
    // statement also mentions a new edition.
    "Science Advantage and Primary Advantage Quest 4 launch in May 2027.",
    // The Origins 3.2 form of the same attack fails today; the sentence split
    // breaks "3.2", so the May 2027 strip never fires and the year check
    // rejects it. The assertion must hold whatever mechanism Green keeps.
    "Primary Advantage Origins 3.2 and Storytime Advantage reach schools in May 2027.",
    // The carried pronoun list covers "this" and "these".
    "Storytime Advantage is planned. This goes live in December 2026.",
    "Science Advantage is planned. These launch in 2028.",
  ])("still rejects: %s", (probe) => {
    expect(graphText.includes(probe), "the probe is already in the real graph").toBe(false);
    expect(() => buildCurriculumAutomatedReview(withExtraParagraph(probe))).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID product-status/,
    );
  });

  // Controls: legitimate lines the fix must not over-block. Accepts.
  it.each([
    // The canonical S/M/Z form, reworded, keeps the 2027 school year.
    "Science, Math, and Zhongwen Advantage are aimed at primary schools in the 2027 school year.",
    // The real editions line (already in the graph) keeps May 2027.
    "Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027.",
    // A pronoun carry with the right date passes.
    "Storytime Advantage is part of the K-6 offer. It goes live in November 2026; give no exact day.",
  ])("still accepts: %s", (probe) => {
    expect(() => buildCurriculumAutomatedReview(withExtraParagraph(probe))).not.toThrow();
  });

  // F1 [Blocker]: the pronoun carry of the fix works only on the same source
  // line (`sameLineAsPrevious`). A line break or a list item ends it, and the
  // Markdown of the graph wraps and lists lines freely.
  it.each([
    "Storytime Advantage is part of the K-6 offer.\nIt goes live in December 2026.",
    "- Storytime Advantage is part of the K-6 offer.\n- It goes live in December 2026.",
  ])("F1 rejects a pronoun date carried across a line break: %s", (probe) => {
    expect(graphText.includes(probe), "the probe is already in the real graph").toBe(false);
    expect(() => buildCurriculumAutomatedReview(withExtraParagraph(probe))).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID product-status/,
    );
  });

  // F2 [Blocker]: the carry starts only on it|this|they|these|those. The
  // possessive and the quantity openers (Its, Their, Both, Each) carry the
  // same reference and escape it.
  it.each([
    "Storytime Advantage is planned. Its launch is December 2026.",
    "Storytime Advantage is planned. Their launch window is December 2026.",
    "Science Advantage and Math Advantage are planned. Both launch in 2028.",
    "Science Advantage is planned. Each launches in 2027.",
  ])("F2 rejects a pronoun date with a non-carried opener: %s", (probe) => {
    expect(() => buildCurriculumAutomatedReview(withExtraParagraph(probe))).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID product-status/,
    );
  });

  // F3 [Blocker]: the product set of a statement is a union. One product
  // licensed for a date licenses it for every planned product in the same
  // statement, named together or carried in by a pronoun.
  it.each([
    // STEM has no public date ("Planned, no date"), but the sentence names
    // Science, so the 2027 school year strip fires for the whole statement.
    "Science and STEM Advantage start in the 2027 school year.",
    // Science rides on the Storytime date in the same statement.
    "Storytime and Science Advantage go live in November 2026.",
    // The carry inherits the union of the previous sentence: the date fits
    // Storytime but not STEM, and the guard cannot tell them apart.
    "STEM Advantage and Storytime Advantage are planned. It goes live in November 2026.",
    "Storytime Advantage and STEM Advantage are planned together. They launch in November 2026.",
  ])("F3 rejects a date licensed by another product of the same statement: %s", (probe) => {
    expect(() => buildCurriculumAutomatedReview(withExtraParagraph(probe))).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID product-status/,
    );
  });

  // F4 [Blocker]: the May 2027 strip keys on a new-editions mention in the
  // statement (origins 3.2|quest 4|may 2027 line), not on a product. Any
  // planned product in the same statement inherits the editions date. The
  // "origins 3.2" alternative is also dead code: the sentence split breaks
  // "3.2" before the matcher runs (the E1 control above rejects through the
  // year check, not through the binding).
  it.each([
    "Storytime Advantage and Primary Advantage Quest 4 reach schools in May 2027.",
    "Science Advantage and Primary Advantage Quest 4 are aimed at May 2027.",
    "STEM Advantage and Primary Advantage Quest 4 are aimed at May 2027.",
    "The May 2027 line covers Storytime Advantage.",
  ])("F4 rejects May 2027 on a planned line that only mentions a new edition: %s", (probe) => {
    expect(() => buildCurriculumAutomatedReview(withExtraParagraph(probe))).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID product-status/,
    );
  });

  // F5 [Blocker]: a period inside the line ends the statement early and
  // orphans the date from the product. A decimal number or an abbreviation is
  // enough; the orphan fragment holds no product name and no "advantage", so
  // no rule sees it.
  it.each([
    "Storytime Advantage ships after version 3.2 in December 2026.",
    "Science Advantage ships after version 3.2 in 2028.",
    "Storytime Adv. goes live in December 2026.",
  ])("F5 rejects a date orphaned by a period inside the line: %s", (probe) => {
    expect(() => buildCurriculumAutomatedReview(withExtraParagraph(probe))).toThrow(
      /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
    );
  });

  // F6 [Nit]: the planned-line match needs the full "X Advantage" name, so a
  // short name escapes it. Lowercase full names are covered by normalization
  // (the reject control above). A fix needs a product-name policy, because
  // bare "science" and "math" are also generic words. `it.fails` records the
  // weakness: each case passes while it exists and fails when it is fixed.
  for (const probe of [
    "Storytime goes live in December 2026.",
    "Science launches in 2028.",
    "Science Adv. It launches in 2028.",
  ]) {
    it.fails(`F6 rejects a short-name product date: ${JSON.stringify(probe)}`, () => {
      const mutated = withExtraParagraph(probe);
      expect(() => buildCurriculumAutomatedReview(mutated)).toThrow(
        /SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID/,
      );
    });
  }
});
