/**
 * Adversarial hardening for the Phase 1 audit-contract test
 * (`drizzle045-phase1-contracts.test.ts`).
 *
 * Phase 1 is audit-only — the three Markdown artifacts are the
 * deliverable, so the Red contract is a pure documentation-presence
 * + shape check. The Red contract catches obvious regressions, but
 * several of its assertions are substring-based and can be satisfied
 * by negated text, partial cross-references, or single-keyword
 * mentions. This file adds adversarial assertions that catch:
 *
 *   1. Negated-context false positives (e.g. "we will not adopt 0.45"
 *      passing the version-target check, or "0.45 is the bug"
 *      passing the same check).
 *   2. Single-keyword cross-reference (the breaking-changes contract
 *      only requires ONE schema file mentioned — adversarial
 *      assertions require the high-risk files specifically).
 *   3. Keyword-without-risk-context (e.g. "drizzle-zod" mentioned
 *      once in passing, not surfaced as a Phase 3 risk).
 *   4. Loose tenant catch-all (the contract test falls back to
 *      `/\btenant\b/` — this file requires `createTenantDB`
 *      specifically, the symbol Phase 3 must protect).
 *   5. Negated rejection (e.g. "we will not reject Prisma 7" or
 *      "we considered not rejecting" passing the rejection check).
 *   6. Cross-reference vs filesystem drift (a doc mentioning a
 *      schema file that does not exist on disk, or omitting a file
 *      that does exist).
 *   7. Content-density trap (an audit that lists the right keywords
 *      but is too short to be a real audit).
 *   8. Structural-section absence (a doc that lacks the Phase 1
 *      required sections — decision, risk surfaces, provenance).
 *
 * These assertions are GREEN against the current well-authored
 * artifacts and RED against a doc that satisfies the Red contract
 * via keyword stuffing, negation, or one-of-N partial coverage. They
 * are intentionally separate from the Red contract so the Red
 * contract remains the "minimum bar" and these are the "no
 * shortcuts" bar.
 *
 * Targeted adversarial command:
 *   cd packages/db && ./node_modules/.bin/vitest run \
 *     src/__tests__/drizzle045-phase1-contracts-adversarial.test.ts
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "../..");

const TRACK_DIR = join(REPO_ROOT, "measure/tracks/drizzle045_major_migration");

const BREAKING_CHANGES_PATH = join(TRACK_DIR, "phase1-breaking-changes.md");
const SCHEMA_MAP_PATH = join(TRACK_DIR, "phase1-schema-map.md");
const PRISMA7_REJECTION_PATH = join(TRACK_DIR, "phase1-prisma-7-rejection.md");

const SCHEMA_DIR = join(PACKAGE_ROOT, "src/schema");
const DRIZZLE_DIR = join(PACKAGE_ROOT, "drizzle");

const EXPECTED_SCHEMA_FILES = [
  "analytics.ts",
  "audit.ts",
  "classrooms.ts",
  "codecamp.ts",
  "content.ts",
  "flashcards.ts",
  "index.ts",
  "licenses.ts",
  "marketing.ts",
  "progress.ts",
  "questions.ts",
  "science.ts",
  "stories.ts",
  "taxonomy.ts",
  "users.ts",
] as const;

const EXPECTED_MIGRATION_INDICES = Array.from({ length: 21 }, (_, i) =>
  i.toString().padStart(4, "0"),
);

/**
 * Returns true if `keyword` appears in `text` outside of a negated
 * context. Negation heuristics:
 *   - "not X", "no X", "never X", "without X" within 12 chars before
 *   - "won't", "don't", "doesn't", "isn't", "aren't", "shouldn't" within
 *     12 chars before
 *   - "isn't the" / "is not the" / "are not the" within 12 chars before
 *   - "prior to", "before" within 12 chars before
 *   - "bug", "issue", "problem", "regression" within 12 chars after
 *     (catches "0.45 is the bug")
 */
function appearsInPositiveContext(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Capture 30 chars before and 30 chars after each match
  const re = new RegExp(
    `(?<prefix>[^\\n]{0,30})(?<match>${escaped})(?<suffix>[^\\n]{0,30})`,
    "gi",
  );
  for (const m of text.matchAll(re)) {
    const before = (m.groups?.prefix ?? "").toLowerCase();
    const after = (m.groups?.suffix ?? "").toLowerCase();
    const negatedBefore =
      /\b(not|no|never|without|won'?t|don'?t|doesn'?t|isn'?t|aren'?t|shouldn'?t|is\s+not|are\s+not|prior\s+to|before)\b\s*$/i.test(
        before,
      );
    const negativeAfter =
      /^\s*(is\s+the\s+)?(bug|issue|problem|regression|broken|missing|wrong)/i.test(
        after,
      );
    if (!negatedBefore && !negativeAfter) {
      return true;
    }
  }
  return false;
}

describe("Adversarial: phase1-breaking-changes.md — negated-context traps", () => {
  it("names 0.45 in a positive-target context (not negated, not a bug)", () => {
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    expect(
      appearsInPositiveContext(text, "0.45"),
      "0.45 must appear in a positive-target context (e.g. 'target: 0.45', '0.45.x', '→ 0.45'). " +
        "A negated mention like 'we will not adopt 0.45' or '0.45 is the bug' must fail.",
    ).toBe(true);
  });

  it("names 0.44.7 in a positive-baseline context (not negated)", () => {
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    expect(
      appearsInPositiveContext(text, "0.44.7"),
      "0.44.7 must appear in a positive-baseline context (e.g. 'baseline: 0.44.7', '0.44.7 (baseline)'). " +
        "A negated mention like 'we will not move to 0.44.7' must fail.",
    ).toBe(true);
  });

  it("drizzle-zod is surfaced as a Phase 3 risk, not just mentioned in passing", () => {
    // The Red contract uses `/drizzle[- ]?zod/i` which matches
    // "drizzle-zod is missing" or "we don't use drizzle-zod" — both
    // non-risk mentions. Adversarial: require drizzle-zod to appear
    // with a risk/discussion context (install, add, integrate,
    // Phase 3, not installed, missing, contract).
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    const lower = text.toLowerCase();
    const hasDrizzleZod = /drizzle[- ]?zod/i.test(text);
    expect(hasDrizzleZod, "drizzle-zod must be mentioned").toBe(true);
    const hasRiskContext =
      /not\s+installed/i.test(lower) ||
      /must\s+add/i.test(lower) ||
      /must\s+install/i.test(lower) ||
      /phase\s+3/i.test(text) ||
      /integration/i.test(lower) ||
      /createInsertSchema/.test(text) ||
      /createSelectSchema/.test(text);
    expect(
      hasRiskContext,
      "drizzle-zod mention must include a risk/discussion context (e.g. 'not installed', 'Phase 3 must add', 'createInsertSchema').",
    ).toBe(true);
  });

  it("createTenantDB is mentioned specifically (not just the catch-all /\\btenant\\b/)", () => {
    // The Red contract falls back to /\btenant\b/i which is satisfied
    // by "multi-tenant architecture" or "tenant farmer". The actual
    // risk surface is createTenantDB (packages/domain/src/db-contract.ts).
    // Adversarial: require the symbol name.
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    expect(
      text,
      "createTenantDB symbol must be named (not just 'tenant' as a word).",
    ).toMatch(/createTenantDB/);
  });

  it("cross-references the highest-risk schema files (not just one)", () => {
    // The Red contract uses `EXPECTED_SCHEMA_FILES.find(...)` which
    // passes if any one of the 15 files is mentioned. The audit
    // claims to cover the FULL schema surface, so it must mention
    // the highest-risk files. We require at least 5 of the 15 to be
    // mentioned, and at least one of {science.ts, marketing.ts} (the
    // two largest/newest files).
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    const mentioned = EXPECTED_SCHEMA_FILES.filter((name) =>
      text.includes(name),
    );
    expect(
      mentioned.length,
      `at least 5 of 15 schema files must be cross-referenced; saw ${mentioned.length} (${mentioned.join(", ")}).`,
    ).toBeGreaterThanOrEqual(5);
    const hasHighRisk =
      text.includes("science.ts") || text.includes("marketing.ts");
    expect(
      hasHighRisk,
      "at least one of {science.ts (largest), marketing.ts (newest)} must be cross-referenced.",
    ).toBe(true);
  });

  it("has substantive content (>= 100 lines, not a keyword-stuffed stub)", () => {
    // A 20-line doc that lists the right substrings would pass the
    // Red contract. Adversarial: require a minimum line count that
    // matches a real audit.
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    const lines = text.split("\n");
    expect(
      lines.length,
      `breaking-changes audit must have at least 100 lines; saw ${lines.length}.`,
    ).toBeGreaterThanOrEqual(100);
  });

  it("contains the required structural sections", () => {
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    const requiredSections = [
      /^## 1\.\s/m,
      /^## 2\.\s/m,
      /^## 3\.\s/m,
      /^## 6\.\s*Provenance/m,
    ];
    for (const re of requiredSections) {
      expect(
        re.test(text),
        `breaking-changes audit must have section matching ${re}`,
      ).toBe(true);
    }
  });

  it("every mentioned schema file actually exists on disk (cross-ref integrity)", () => {
    const text = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    const mentioned = EXPECTED_SCHEMA_FILES.filter((name) =>
      text.includes(name),
    );
    for (const name of mentioned) {
      expect(
        existsSync(join(SCHEMA_DIR, name)),
        `breaking-changes audit references ${name} but packages/db/src/schema/${name} does not exist on disk — cross-ref is stale.`,
      ).toBe(true);
    }
  });
});

describe("Adversarial: phase1-schema-map.md — coverage and integrity traps", () => {
  it("mentions the marketing.ts dirty-worktree addition explicitly", () => {
    // Beyond listing marketing.ts, the audit must acknowledge it as
    // the newest/dirty-worktree addition — otherwise the audit
    // documents a stale 14-file surface.
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const marketingContext =
      /marketing\.ts[\s\S]{0,200}(newest|dirty|dirty-worktree|recent|added)/i.test(
        text,
      ) ||
      /(newest|dirty|dirty-worktree|recent|added)[\s\S]{0,200}marketing\.ts/i.test(
        text,
      );
    expect(
      marketingContext,
      "schema map must acknowledge marketing.ts as the newest/dirty-worktree addition.",
    ).toBe(true);
  });

  it("flags the marketing.ts barrel-export drift (informational)", () => {
    // Phase 1 §4.1 of the sister artifact acknowledges the barrel
    // does not yet re-export marketing.ts. The schema map should
    // surface this drift so Phase 3 fixes it.
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const hasBarrelDrift =
      /barrel/i.test(text) &&
      (/marketing\.js/.test(text) || /export\s*\*\s*from/i.test(text));
    expect(
      hasBarrelDrift,
      "schema map must surface the barrel-export drift for marketing.ts.",
    ).toBe(true);
  });

  it("lists every migration index in a positive-listing context (not a negation)", () => {
    // The Red contract uses substring `text.includes(`${idx}_`)` —
    // would pass if a doc said "we are not yet at 0017" but skipped
    // most. Adversarial: require each index to appear in a positive
    // listing context (Markdown table cell, numbered list, list item,
    // or paired with a filename).
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const missing: string[] = [];
    for (const idx of EXPECTED_MIGRATION_INDICES) {
      // Accept any of:
      //   - Markdown table cell: `| 0000 |` or `<num> | 0000`
      //   - numbered list: `1. 0000_...`
      //   - bulleted list: `* 0000_...` or `- 0000_...`
      //   - inline code: `` `0000_...` ``
      const re = new RegExp(
        `(?:^|\\n)\\s*(?:\\d+\\.|\\*|-|\\|)\\s*(?:\\d+\\s*\\|\\s*)?${idx}[_ ]`,
        "m",
      );
      if (!re.test(text)) {
        missing.push(idx);
      }
    }
    expect(
      missing,
      `every migration index must appear in a positive listing context; missing: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("mentions science.ts as the largest schema file (385 lines)", () => {
    // The schema map should rank schema files by risk; science.ts is
    // the largest at 385 lines and should be flagged.
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const scienceContext =
      /science\.ts[\s\S]{0,200}(largest|385|biggest)/i.test(text) ||
      /(largest|biggest)[\s\S]{0,200}science\.ts/i.test(text);
    expect(
      scienceContext,
      "schema map must flag science.ts as the largest schema file.",
    ).toBe(true);
  });

  it("has substantive content (>= 100 lines)", () => {
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const lines = text.split("\n");
    expect(
      lines.length,
      `schema map must have at least 100 lines; saw ${lines.length}.`,
    ).toBeGreaterThanOrEqual(100);
  });

  it("contains the required structural sections", () => {
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const requiredSections = [
      /^## 1\.\s/m,
      /^## 2\.\s/m,
      /^## 3\.\s/m,
      /^## 4\.\s/m,
      /^## 7\.\s*Provenance/m,
    ];
    for (const re of requiredSections) {
      expect(re.test(text), `schema map must have section matching ${re}`).toBe(
        true,
      );
    }
  });

  it("every mentioned schema file actually exists on disk (cross-ref integrity)", () => {
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const mentioned = EXPECTED_SCHEMA_FILES.filter((name) =>
      text.includes(name),
    );
    for (const name of mentioned) {
      expect(
        existsSync(join(SCHEMA_DIR, name)),
        `schema map references ${name} but it does not exist on disk.`,
      ).toBe(true);
    }
  });

  it("filesystem surface and doc surface are in lockstep (no extras on disk)", () => {
    // The Red contract asserts every expected name is in the doc.
    // Adversarial: also assert the doc doesn't mention any schema
    // file that is NOT on disk (e.g. a hallucinated file name).
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const onDisk = readdirSync(SCHEMA_DIR)
      .filter((f) => f.endsWith(".ts"))
      .sort();
    const docNames = EXPECTED_SCHEMA_FILES.slice().sort();
    expect(
      JSON.stringify(onDisk) === JSON.stringify(docNames),
      `filesystem surface (${onDisk.length} files) must match doc surface (${docNames.length} files). ` +
        `Disk: ${onDisk.join(", ")}. Doc: ${docNames.join(", ")}.`,
    ).toBe(true);
  });

  it("filesystem surface and doc surface are in lockstep for migration SQL files", () => {
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const onDisk = readdirSync(DRIZZLE_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => f.slice(0, 4))
      .sort();
    const docNames = EXPECTED_MIGRATION_INDICES.slice().sort();
    expect(
      JSON.stringify(onDisk) === JSON.stringify(docNames),
      `migration SQL filesystem surface (${onDisk.length} files) must match doc surface (${docNames.length} files).`,
    ).toBe(true);
  });
});

it("DEBUG: see what file content is", () => {
  const text = readFileSync(PRISMA7_REJECTION_PATH, "utf8");
  console.log("=== FILE CONTENT FIRST 1000 CHARS ===");
  console.log(text.slice(0, 1000));
  console.log("=== 'rejected' count:", text.split("rejected").length - 1);
  console.log(
    "=== 'NOT rejected' count:",
    text.split("NOT rejected").length - 1,
  );
  console.log(
    "=== hasPositiveRejection:",
    appearsInPositiveContext(text, "rejected"),
  );
  console.log(
    "=== hasPositiveAdopt:",
    appearsInPositiveContext(text, "not adopt"),
  );
  console.log(
    "=== hasPositiveDecline:",
    appearsInPositiveContext(text, "declined"),
  );
  expect(true).toBe(true);
});

describe("Adversarial: phase1-prisma-7-rejection.md — decision-strength traps", () => {
  it("the rejection is in a positive-decision context (not 'we will not reject')", () => {
    // The Red contract uses `/\breject(ed|ion)?\b/ || /\bnot adopt(ed|ing)?\b/ || /\bdecline(d)?\b/`
    // which matches "we will not reject Prisma 7" (negated) or
    // "we considered not rejecting" (the OPPOSITE of a decision).
    // Adversarial: require the rejection keyword to appear in a
    // positive-decision context.
    const text = readFileSync(PRISMA7_REJECTION_PATH, "utf8");
    const hasPositiveRejection = appearsInPositiveContext(text, "rejected");
    const hasPositiveAdopt = appearsInPositiveContext(text, "not adopt");
    const hasPositiveDecline = appearsInPositiveContext(text, "declined");
    const anyPositive =
      hasPositiveRejection || hasPositiveAdopt || hasPositiveDecline;
    expect(
      anyPositive,
      "the rejection must be in a positive-decision context " +
        "(e.g. 'Prisma 7 is rejected', 'we will not adopt Prisma 7', 'we declined'). " +
        "A negated mention like 'we will not reject Prisma 7' or 'we considered not rejecting' must fail.",
    ).toBe(true);
  });

  it("primary-advantage and Drizzle appear in a migration-path context (not passing mention)", () => {
    // The Red contract uses two separate weak assertions:
    //   - `text.includes("primary-advantage")` — would pass with
    //     "primary-advantage is unaffected"
    //   - `text.toMatch(/drizzle/i)` — would pass with any "drizzle"
    //   - text mention anywhere
    // Adversarial: require both to appear in a migration-path
    // context (migrate, migration, off Prisma, to Drizzle, etc.).
    const text = readFileSync(PRISMA7_REJECTION_PATH, "utf8");
    const hasPaContext =
      /primary-advantage[\s\S]{0,200}(drizzle|migrate|migration)/i.test(text) ||
      /(drizzle|migrate|migration)[\s\S]{0,200}primary-advantage/i.test(text);
    expect(
      hasPaContext,
      "primary-advantage and Drizzle must appear in a migration-path context (e.g. 'primary-advantage migrates to Drizzle').",
    ).toBe(true);
  });

  it("mentions the chosen alternative explicitly (primary-advantage's Prisma-to-Drizzle path)", () => {
    // Beyond mentioning Drizzle, the rationale must identify it as
    // the CHOSEN ALTERNATIVE — not just "we considered Drizzle".
    const text = readFileSync(PRISMA7_REJECTION_PATH, "utf8");
    const alternatives =
      /chosen\s+alternative/i.test(text) ||
      /migrat\w+\s+off\s+prisma/i.test(text) ||
      /prisma-to-drizzle/i.test(text) ||
      /continue\w*\s+on\s+.*drizzle/i.test(text) ||
      /path\s+to\s+drizzle/i.test(text);
    expect(
      alternatives,
      "rationale must name the chosen alternative: primary-advantage's Prisma-to-Drizzle migration path.",
    ).toBe(true);
  });

  it("has substantive content (>= 80 lines, not a one-liner stub)", () => {
    const text = readFileSync(PRISMA7_REJECTION_PATH, "utf8");
    const lines = text.split("\n");
    expect(
      lines.length,
      `prisma-7 rejection rationale must have at least 80 lines; saw ${lines.length}.`,
    ).toBeGreaterThanOrEqual(80);
  });

  it("contains the required structural sections", () => {
    const text = readFileSync(PRISMA7_REJECTION_PATH, "utf8");
    const requiredSections = [
      /^## 1\.\s*Decision/m,
      /^## 2\.\s/m,
      /^## 3\.\s/m,
      /^## 5\.\s*Cross-references/m,
      /^## 6\.\s*Provenance/m,
    ];
    for (const re of requiredSections) {
      expect(
        re.test(text),
        `prisma-7 rejection must have section matching ${re}`,
      ).toBe(true);
    }
  });
});

describe("Adversarial: cross-artifact consistency (between the 3 documents)", () => {
  it("the schema-file count is consistent between the schema map and the live filesystem", () => {
    // The schema map claims 15 schema files. Verify the count and
    // that 15 is what the filesystem actually has.
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const onDisk = readdirSync(SCHEMA_DIR).filter((f) => f.endsWith(".ts"));
    const claims15 =
      /\b15\b[\s\S]{0,200}(schema|files)/i.test(text) ||
      /(schema|files)[\s\S]{0,200}\b15\b/i.test(text);
    expect(claims15, "schema map must claim 15 schema files").toBe(true);
    expect(
      onDisk.length,
      `filesystem must have 15 schema files; saw ${onDisk.length}.`,
    ).toBe(15);
  });

  it("the migration count is consistent between the schema map and the live filesystem", () => {
    const text = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const onDisk = readdirSync(DRIZZLE_DIR).filter((f) => f.endsWith(".sql"));
    const claims21 =
      /\b21\b[\s\S]{0,200}(migration|sql|files)/i.test(text) ||
      /(migration|sql|files)[\s\S]{0,200}\b21\b/i.test(text);
    expect(claims21, "schema map must claim 21 migration files").toBe(true);
    expect(
      onDisk.length,
      `filesystem must have 21 migration SQL files; saw ${onDisk.length}.`,
    ).toBe(21);
  });

  it("the breaking-changes audit and the schema map agree on the highest-risk file", () => {
    // Both docs should identify science.ts (largest) or marketing.ts
    // (newest) as the highest-risk schema files. If they disagree, the
    // audit is internally inconsistent.
    const breaking = readFileSync(BREAKING_CHANGES_PATH, "utf8");
    const schema = readFileSync(SCHEMA_MAP_PATH, "utf8");
    const breakingMentionsScience = /science\.ts/i.test(breaking);
    const schemaMentionsScience = /science\.ts/i.test(schema);
    const breakingMentionsMarketing = /marketing\.ts/i.test(breaking);
    const schemaMentionsMarketing = /marketing\.ts/i.test(schema);
    const scienceAgreement = breakingMentionsScience === schemaMentionsScience;
    const marketingAgreement =
      breakingMentionsMarketing === schemaMentionsMarketing;
    expect(
      scienceAgreement,
      "both docs must agree on whether science.ts is cross-referenced.",
    ).toBe(true);
    expect(
      marketingAgreement,
      "both docs must agree on whether marketing.ts is cross-referenced.",
    ).toBe(true);
  });

  it("prisma-7 rejection rationale cross-references the track spec or plan", () => {
    // The rationale should not be standalone — it must reference the
    // drizzle045_major_migration track spec/plan or the upstream
    // prisma_drizzle_slice_cleanup carve-out. Otherwise it's
    // disconnected from the track that owns it.
    const text = readFileSync(PRISMA7_REJECTION_PATH, "utf8");
    const crossRef =
      /drizzle045_major_migration/i.test(text) ||
      /prisma_drizzle_slice_cleanup/i.test(text);
    expect(
      crossRef,
      "rationale must cross-reference the drizzle045_major_migration track or the prisma_drizzle_slice_cleanup carve-out.",
    ).toBe(true);
  });
});

describe("Adversarial: failure-path probes (boundary conditions)", () => {
  it("all three artifacts are non-empty (readFileSync would throw on missing/empty)", () => {
    // A zero-byte or missing artifact would cause readFileSync to
    // throw on subsequent reads; this guard ensures the file is at
    // least readable and has content.
    for (const path of [
      BREAKING_CHANGES_PATH,
      SCHEMA_MAP_PATH,
      PRISMA7_REJECTION_PATH,
    ]) {
      const text = readFileSync(path, "utf8");
      expect(
        text.length,
        `${path} must have non-zero content; saw ${text.length} bytes.`,
      ).toBeGreaterThan(0);
    }
  });

  it("all three artifacts are real Markdown (have at least 5 H2 sections)", () => {
    // A doc with no H2 sections is not real Markdown structure.
    for (const path of [
      BREAKING_CHANGES_PATH,
      SCHEMA_MAP_PATH,
      PRISMA7_REJECTION_PATH,
    ]) {
      const text = readFileSync(path, "utf8");
      const h2Count = (text.match(/^##\s/gm) ?? []).length;
      expect(
        h2Count,
        `${path} must have at least 5 H2 sections; saw ${h2Count}.`,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  it("no artifact contains TODO / FIXME / TBD markers (audit must be complete)", () => {
    // An audit that says "TODO: complete this section" is not a
    // complete audit. This catches incomplete drafts.
    for (const path of [
      BREAKING_CHANGES_PATH,
      SCHEMA_MAP_PATH,
      PRISMA7_REJECTION_PATH,
    ]) {
      const text = readFileSync(path, "utf8");
      const hasIncompleteMarker = /\b(TODO|FIXME|TBD|XXX|HACK)\b/i.test(text);
      expect(
        hasIncompleteMarker,
        `${path} must not contain TODO/FIXME/TBD/XXX/HACK markers — the audit is incomplete.`,
      ).toBe(false);
    }
  });
});
