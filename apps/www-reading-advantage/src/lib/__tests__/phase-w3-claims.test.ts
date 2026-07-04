/**
 * Wave 3 Phase 1 — Website Claims Correction Red Tests
 *
 * Track:  wave3_product_alignment_20260628
 * Phase:  1 — Website Claims Correction
 *
 * Source-text audits over `apps/www-reading-advantage/src/` enforcing the Tier 1
 * floor from `phase-0-decisions.md`. Each of the nine groups below has a negative
 * assertion (banned literal/claim absent) and a positive control (truthful
 * replacement exists) so a deletion-only fix fails (anti-pattern A4).
 *
 * These tests are intentionally RED at baseline SHA `110460665ed4cc977b958bb27a043f99b3aa0d5b`
 * and become GREEN once the website copy is corrected by Jr-Green.
 */
import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { createProductClaimHelper } from "../../testing/product-claim-helper.js";

const BASE = process.cwd();
const SRC_DIR = join(BASE, "src");

const NONEXISTENT_APPS = [
  "math-advantage",
  "stem-advantage",
  "storytime-advantage",
  "tutor-advantage",
  "zhongwen-advantage",
];

interface SourceFile {
  path: string;
  text: string;
}

async function readSrcFile(relPath: string): Promise<string> {
  return readFile(join(SRC_DIR, relPath), "utf-8");
}

async function fileExists(relPath: string): Promise<boolean> {
  try {
    await readSrcFile(relPath);
    return true;
  } catch {
    return false;
  }
}

async function collectSourceFiles(): Promise<SourceFile[]> {
  const entries = await readdir(SRC_DIR, { recursive: true, withFileTypes: true });
  const files: SourceFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx|js|jsx|md|json)$/.test(entry.name)) continue;
    const absPath = join(entry.parentPath, entry.name);
    const relPath = relative(SRC_DIR, absPath);
    // Exclude our own test files and other test artifacts from source scans so
    // banned-literal checks do not self-reference (anti-pattern A7/A9).
    if (relPath.includes("__tests__")) continue;
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    const text = await readFile(absPath, "utf-8");
    files.push({ path: relPath, text });
  }
  return files;
}

function countMatches(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

async function listProductLocaleFiles(): Promise<string[]> {
  const entries = await readdir(join(SRC_DIR, "locales/pages/products"), {
    withFileTypes: true,
  });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".ts"))
    .map((e) => `locales/pages/products/${e.name}`);
}

/**
 * Extract the human-readable value/label pairs from a `resultsSection.stats` array.
 * Returns an empty array when the section is missing or empty.
 */
function extractResultsStats(text: string): string[] {
  const match = text.match(/resultsSection:\s*\{[\s\S]*?stats:\s*\[([\s\S]*?)\]/i);
  if (!match) return [];
  const block = match[1];
  const pairs: string[] = [];
  const valueMatches = block.matchAll(/value:\s*["']([^"']+)["']/gi);
  const labelMatches = Array.from(block.matchAll(/label:\s*["']([^"']+)["']/gi));
  const values = Array.from(valueMatches).map((m) => m[1]);
  const labels = labelMatches.map((m) => m[1]);
  for (let i = 0; i < Math.max(values.length, labels.length); i++) {
    pairs.push(`${values[i] ?? ""}|${labels[i] ?? ""}`);
  }
  return pairs;
}

async function buildConsentIndex(): Promise<Map<string, { hasConsent: boolean; anonymized: boolean }>> {
  const index = new Map<string, { hasConsent: boolean; anonymized: boolean }>();
  const consentFiles = await readdir(BASE, { withFileTypes: true }).then((entries) =>
    entries.filter((e) => e.isFile() && /^consent-[^/]+\.(md|pdf)$/i.test(e.name)).map((e) => e.name),
  );
  for (const file of consentFiles) {
    const subject = file.replace(/^consent-/, "").replace(/\.(md|pdf)$/i, "");
    index.set(subject, { hasConsent: true, anonymized: true });
  }
  return index;
}

// ---------------------------------------------------------------------------
// 1A — Product count
// ---------------------------------------------------------------------------
describe("1A — Product count", () => {
  it("has no 'nine products' / 'all 9 products' / 'one engine, nine' claims", async () => {
    const files = await collectSourceFiles();
    const banned = /nine products|all 9 products|one engine, nine/gi;
    let hits = 0;
    for (const { path: _path, text } of files) {
      hits += countMatches(text, banned);
    }
    expect(
      hits,
      `Banned product-count literal count: ${hits}. Phase 1 must remove all ` +
        `"nine products" / "all 9 products" / "one engine, nine" claims.`,
    ).toBe(0);
  });

  it("positive control: a truthful count string is present", async () => {
    const home = await readSrcFile("locales/pages/home.ts");
    const mastery = await readSrcFile("locales/pages/mastery-advantage.ts");
    const page = await readSrcFile("app/[locale]/(marketing)/(home)/page.tsx");
    const combined = home + mastery + page;
    const truthful = /four products|4 products|one engine, four/gi;
    expect(
      truthful.test(combined),
      "Expected a truthful count string ('four products', '4 products', or " +
        "'One engine, four') to replace the removed 'nine products' claim.",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 1B — Stale launch dates
// ---------------------------------------------------------------------------
describe("1B — Stale launch dates", () => {
  it("has no stale launch dates on product locale pages", async () => {
    const helper = createProductClaimHelper({ now: new Date("2026-07-04") });
    const locales = await listProductLocaleFiles();
    // Explicit past-due datelines from the frozen claims matrix (CC-04..CC-12).
    const explicitStaleRe =
      /(coming|launching|new for)\s+.*\b2025\b|starting\s+may\s+2026|coming\s+in\s+2026/gi;
    // Launch-context keywords (English, Thai, Chinese) so the helper's 18-month
    // detector only fires on dated launch claims, not research citations.
    const launchContextRe =
      /\b(coming|launching|new for|เปิดตัว|推出|coming soon|launch|roadmap|planned)\b/gi;
    let staleCount = 0;
    const violations: string[] = [];
    for (const relPath of locales) {
      const text = await readSrcFile(relPath);
      const lines = text.split("\n");
      lines.forEach((line, idx) => {
        const explicitHit = explicitStaleRe.test(line);
        explicitStaleRe.lastIndex = 0;
        const helperKinds = helper.classify({ text: line, page: relPath });
        const helperHit =
          helperKinds.includes("stale-launch-date") && launchContextRe.test(line);
        launchContextRe.lastIndex = 0;
        if (explicitHit || helperHit) {
          staleCount++;
          violations.push(`${relPath}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
    expect(
      staleCount,
      `Stale launch date count: ${staleCount}. Violations:\n${violations.join("\n")}`,
    ).toBe(0);
  });

  it("has no stale launch dates in product page.tsx metadata", async () => {
    const pageTsxFiles = [
      "app/[locale]/(marketing)/products/reading-advantage/page.tsx",
      "app/[locale]/(marketing)/products/primary-advantage/page.tsx",
      "app/[locale]/(marketing)/products/science-advantage/page.tsx",
      "app/[locale]/(marketing)/products/codecamp-advantage/page.tsx",
      "app/[locale]/(marketing)/products/math-advantage/page.tsx",
      "app/[locale]/(marketing)/products/stem-advantage/page.tsx",
      "app/[locale]/(marketing)/products/storytime-advantage/page.tsx",
      "app/[locale]/(marketing)/products/tutor-advantage/page.tsx",
      "app/[locale]/(marketing)/products/zhongwen-advantage/page.tsx",
    ];
    const staleRe =
      /(coming|launching|new for)\s+.*\b202[56]\b|starting\s+may\s+2026|coming\s+in\s+2026/gi;
    let staleCount = 0;
    const violations: string[] = [];
    for (const relPath of pageTsxFiles) {
      if (!(await fileExists(relPath))) continue;
      const text = await readSrcFile(relPath);
      const lines = text.split("\n");
      lines.forEach((line, idx) => {
        const hit = staleRe.test(line);
        staleRe.lastIndex = 0;
        if (hit) {
          staleCount++;
          violations.push(`${relPath}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
    expect(
      staleCount,
      `Stale launch date count in page.tsx metadata: ${staleCount}. Violations:\n${violations.join("\n")}`,
    ).toBe(0);
  });

  it("positive control: product locale files still exist", async () => {
    const locales = await listProductLocaleFiles();
    expect(locales.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 1C — Nonexistent-app pages
// ---------------------------------------------------------------------------
describe("1C — Nonexistent-app pages", () => {
  it("nonexistent-app pages are roadmap-labeled without a concrete launch date", async () => {
    const staleDateRe = /(coming|launching|new for)\s+.*\b202[56]\b|starting\s+may\s+2026|coming\s+in\s+2026/gi;
    const roadmapRe = /\b(roadmap|planned|on our roadmap|coming soon)\b/gi;
    for (const app of NONEXISTENT_APPS) {
      const pagePath = `app/[locale]/(marketing)/products/${app}/page.tsx`;
      const localePath = `locales/pages/products/${app}.ts`;
      const pageExists = await fileExists(pagePath);
      if (!pageExists) continue;
      const pageText = await readSrcFile(pagePath);
      const localeText = (await fileExists(localePath)) ? await readSrcFile(localePath) : "";
      const combined = pageText + localeText;
      const hasRoadmap = roadmapRe.test(combined);
      const hasStaleDate = staleDateRe.test(combined);
      expect(
        hasRoadmap && !hasStaleDate,
        `${app}: expected a roadmap/planned label with no concrete stale launch date. ` +
          `hasRoadmap=${hasRoadmap}, hasStaleDate=${hasStaleDate}`,
      ).toBe(true);
    }
  });

  it("positive control: default is to keep the pages (not delete)", async () => {
    for (const app of NONEXISTENT_APPS) {
      const pagePath = `app/[locale]/(marketing)/products/${app}/page.tsx`;
      const exists = await fileExists(pagePath);
      expect(exists, `${app}/page.tsx should be kept by default`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 1D — AI model claims
// ---------------------------------------------------------------------------
describe("1D — AI model claims", () => {
  it("has no 'GPT-5' / 'GPT-4' / 'Google Gemini & GPT-5' specific-model claims", async () => {
    const files = await collectSourceFiles();
    const banned = /GPT-5|GPT-4|Google Gemini & GPT-5/g;
    let hits = 0;
    const violations: string[] = [];
    for (const { path, text } of files) {
      const fileHits = countMatches(text, banned);
      if (fileHits > 0) {
        hits += fileHits;
        violations.push(`${path}: ${fileHits}`);
      }
    }
    expect(
      hits,
      `Specific-model claim count: ${hits}. Violations:\n${violations.join("\n")}`,
    ).toBe(0);
  });

  it("positive control: provider-neutral AI copy is present", async () => {
    const primary = await readSrcFile("locales/pages/products/primary-advantage.ts");
    const home = await readSrcFile("locales/pages/home.ts");
    const neutral = /AI-powered writing feedback|AI-assisted learning|AI-powered feedback|model adapter/gi;
    expect(
      neutral.test(primary) || neutral.test(home),
      "Expected provider-neutral AI copy (e.g. 'AI-powered writing feedback' or " +
        "'AI-assisted learning') to replace removed model names.",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 1E — Placeholder case studies
// ---------------------------------------------------------------------------
describe("1E — Placeholder case studies", () => {
  it("case-studies locale has no placeholder-as-real tokens", async () => {
    const text = await readSrcFile("locales/pages/case-studies.ts");
    const banned = /School A \(Coming Soon\)|School B \(Coming Soon\)|Real Results from Real Schools/g;
    const hits = countMatches(text, banned);
    expect(
      hits,
      `Placeholder-as-real token count: ${hits}. 'School A/B (Coming Soon)' and ` +
        `'Real Results from Real Schools' must be removed or relabeled.`,
    ).toBe(0);
  });

  it("helper audit reports zero placeholder case studies", async () => {
    const text = await readSrcFile("locales/pages/case-studies.ts");
    const helper = createProductClaimHelper();
    const claims = text.split("\n").map((line) => ({
      text: line,
      page: "case-studies",
    }));
    const report = helper.audit(claims);
    expect(
      report.placeholderCaseStudyCount,
      `Placeholder case-study count: ${report.placeholderCaseStudyCount}.`,
    ).toBe(0);
  });

  it("positive control: case-studies page exists with illustrative framing", async () => {
    const text = await readSrcFile("locales/pages/case-studies.ts");
    const illustrative = /illustrative examples|illustrative scenarios|examples from schools/gi;
    expect(
      illustrative.test(text),
      "Expected case-studies page to keep an 'Illustrative examples' or similar " +
        "framing after placeholder schools are removed.",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 1F — Duplicated efficacy stats
// ---------------------------------------------------------------------------
describe("1F — Duplicated efficacy stats", () => {
  it("primary advantage does not copy reading advantage's specific efficacy claim", async () => {
    const primary = await readSrcFile("locales/pages/products/primary-advantage.ts");
    const primaryStats = extractResultsStats(primary).join(" || ");
    const copiedReadingClaim =
      /\+9\.5\s*pts?|reading score gain.*aka|aka.*2019/i.test(primaryStats);
    expect(
      copiedReadingClaim,
      `Primary results stats appear to duplicate Reading's specific claim: ${primaryStats}`,
    ).toBe(false);
  });

  it("positive control: at least one product page still presents results stats", async () => {
    const reading = await readSrcFile("locales/pages/products/reading-advantage.ts");
    const primary = await readSrcFile("locales/pages/products/primary-advantage.ts");
    const readingStats = extractResultsStats(reading);
    const primaryStats = extractResultsStats(primary);
    expect(
      readingStats.length + primaryStats.length,
      "Expected at least one product page to keep a resultsSection with stats.",
    ).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 1G — Unverifiable stats and absolute claims
// ---------------------------------------------------------------------------
describe("1G — Unverifiable stats and absolute claims", () => {
  it("has no uncited/unverifiable efficacy stats or absolute claims in source", async () => {
    const files = await collectSourceFiles();
    // Whole-source bans from the frozen claims matrix (CC-23, CC-26, CC-28).
    const wholeSourceBans = [
      { name: "2,172+", re: /2,172\+/g },
      { name: "ZERO RISK", re: /ZERO RISK/g },
      { name: "Aka 2019", re: /Aka[ ,]+2019/g },
    ];
    // Scoped bans — these claims are only disallowed where the matrix places them.
    const mathFiles = files.filter(
      (f) =>
        f.path.includes("products/math-advantage") ||
        f.path.includes("products/primary-advantage"),
    );
    const scopedBans = [
      { name: "95%", re: /95%/g, scopeFiles: mathFiles },
      { name: "3×", re: /3×/g, scopeFiles: mathFiles },
      { name: "24/7", re: /24\/7/g, scopeFiles: mathFiles },
    ];
    const violations: string[] = [];
    for (const { path, text } of files) {
      for (const { name, re } of wholeSourceBans) {
        const hits = countMatches(text, re);
        if (hits > 0) violations.push(`${path}: ${hits} × ${name}`);
      }
    }
    for (const { name, re, scopeFiles } of scopedBans) {
      for (const { path, text } of scopeFiles) {
        const hits = countMatches(text, re);
        if (hits > 0) violations.push(`${path}: ${hits} × ${name}`);
      }
    }
    expect(
      violations.length,
      `Unverifiable stat/absolute claim occurrences:\n${violations.join("\n")}`,
    ).toBe(0);
  });

  it("positive control: managed-service page still discusses risk in non-absolute terms", async () => {
    const text = await readSrcFile("locales/pages/managed-service.ts");
    expect(
      /ZERO RISK/g.test(text),
      "Expected 'ZERO RISK' to be removed from managed-service copy.",
    ).toBe(false);
    expect(
      /low.risk|risk|onboarding/gi.test(text),
      "Expected managed-service page to keep a non-absolute risk/onboarding qualifier.",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 1H — Partner/school consent
// ---------------------------------------------------------------------------
describe("1H — Partner/school consent", () => {
  it("every published case study has consent and anonymization proof", async () => {
    const text = await readSrcFile("locales/pages/case-studies.ts");
    const helper = createProductClaimHelper();
    const claims = text.split("\n").map((line) => ({
      text: line,
      page: "case-studies",
    }));
    const consentIndex = await buildConsentIndex();
    const report = helper.audit(claims, consentIndex);
    expect(
      report.missingConsentCount,
      `Missing consent/anonymization count: ${report.missingConsentCount}. ` +
        `Every published-case-study claim must be paired with a consent artifact ` +
        `and an anonymization decision (anti-pattern A2).`,
    ).toBe(0);
  });

  it("positive control: case-studies page still harvests at least one claim", async () => {
    const text = await readSrcFile("locales/pages/case-studies.ts");
    const helper = createProductClaimHelper();
    const claims = text.split("\n").map((line) => ({
      text: line,
      page: "case-studies",
    }));
    const report = helper.audit(claims);
    expect(
      report.claimCount,
      `Audited claim count: ${report.claimCount}. A deleted page would pass ` +
        `vacuously; at least one claim must remain.`,
    ).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 1I — Stale timestamps
// ---------------------------------------------------------------------------
describe("1I — Stale timestamps", () => {
  it("has no stale timestamps on comparison/pricing tables", async () => {
    const helper = createProductClaimHelper({ now: new Date("2026-07-04") });
    const files = [
      "locales/components/pricing-table.ts",
      "locales/components/comparison-table.ts",
    ];
    let staleCount = 0;
    const violations: string[] = [];
    for (const relPath of files) {
      const text = await readSrcFile(relPath);
      const lines = text.split("\n");
      lines.forEach((line, idx) => {
        if (!/last\s+updated|lastupdated|อัปเดตล่าสุด|最后更新/gi.test(line)) return;
        const kinds = helper.classify({ text: line, page: relPath });
        if (kinds.includes("stale-launch-date")) {
          staleCount++;
          violations.push(`${relPath}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
    expect(
      staleCount,
      `Stale timestamp count: ${staleCount}. Violations:\n${violations.join("\n")}`,
    ).toBe(0);
  });

  it("positive control: comparison/pricing tables still carry a last-updated line", async () => {
    const pricing = await readSrcFile("locales/components/pricing-table.ts");
    const comparison = await readSrcFile("locales/components/comparison-table.ts");
    expect(
      /last\s+updated/gi.test(pricing + comparison),
      "Expected pricing/comparison tables to keep a 'Last updated' line.",
    ).toBe(true);
  });
});
