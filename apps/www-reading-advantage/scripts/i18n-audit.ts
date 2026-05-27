#!/usr/bin/env tsx
/**
 * i18n:audit — Find missing translations and hardcoded text in www-reading-advantage
 *
 * Two checks:
 *   1. Missing keys  – keys present in one locale but absent from another
 *   2. Hardcoded text – English strings in JSX that aren't wrapped in t() / i18n calls
 *
 * Usage:
 *   npm run i18n:audit                 # Run both checks
 *   npm run i18n:audit -- --keys       # Only missing-keys check
 *   npm run i18n:audit -- --hardcoded  # Only hardcoded-text check
 *   npm run i18n:audit -- --json       # Machine-readable JSON output
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, resolve } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LOCALES_DIR = "src/locales";
const APP_DIR = "src/app";
const SUPPORTED_LOCALES = ["en", "th", "zh"];
const REFERENCE_LOCALE = "en";

// Strings that are intentionally English (brand names, technical terms, etc.)
const ALLOWLIST_PATTERNS = [
  /^(Reading|Primary|Storytime|Math|Science|STEM|Zhongwen|Tutor|CodeCamp)\s+Advantage$/,
  /^(KST|SRS|FSRS|CEFR|AI|API|URL|SEO|CTA|FAQ|UI|UX)$/,
  /^\+?\d[\d\s\-()]+$/, // phone numbers
  /^[\w.+-]+@[\w-]+\.[\w.]+$/, // emails
  /^https?:\/\//, // URLs
  /^\d+([.,]\d+)*%?$/, // pure numbers / percentages
  /^[\s]*$/, // whitespace-only
  /^#[0-9a-fA-F]+$/, // hex colors
];

// Minimum English word length to flag (avoids flagging "OK", "AI", etc.)
const MIN_FLAG_LENGTH = 3;

// Words that look like English but are acceptable in any locale
const UNIVERSAL_WORDS = new Set([
  "OK",
  "AI",
  "API",
  "CSS",
  "HTML",
  "JS",
  "TS",
  "URL",
  "FAQ",
  "CTA",
  "SEO",
  "UI",
  "UX",
  "CEO",
  "CTO",
  "GPA",
  "KST",
  "SRS",
  "FSRS",
  "CEFR",
  "QR",
  "USB",
  "WiFi",
  "iOS",
  "Android",
  "NGSS",
  "HSK",
  "CI/CD",
]);

// Single code-like words that appear in styled code blocks but aren't translatable
const CODE_WORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "export",
  "default",
  "import",
  "from",
  "async",
  "await",
  "class",
  "interface",
  "type",
  "enum",
  "git",
  "npm",
  "npx",
  "yarn",
  "pnpm",
  "deploy",
  "commit",
  "push",
  "merge",
  "init",
  "install",
  "ProductionApp",
  "feedback",
  "Powered",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MissingKey {
  key: string;
  presentIn: string[];
  missingFrom: string[];
}

interface HardcodedString {
  file: string;
  line: number;
  column: number;
  text: string;
  context: string; // surrounding JSX element for context
}

interface AuditResult {
  missingKeys: MissingKey[];
  hardcodedStrings: HardcodedString[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    keysOnly: args.includes("--keys"),
    hardcodedOnly: args.includes("--hardcoded"),
    json: args.includes("--json"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

function printHelp() {
  console.log(`
i18n:audit — Find missing translations and hardcoded text

Usage:
  npm run i18n:audit [options]

Options:
  --keys         Only run the missing-keys check
  --hardcoded    Only run the hardcoded-text check
  --json         Output machine-readable JSON
  --help, -h     Show this help

Exit codes:
  0  No issues found
  1  Issues found (or error)
`);
}

/** Recursively load a locale's composed translation tree. */
async function loadLocale(locale: string): Promise<Record<string, unknown>> {
  const mod = await import(`../${LOCALES_DIR}/${locale}`);
  return (mod.default ?? mod) as Record<string, unknown>;
}

/** Flatten a nested object into dot-notation leaf keys. */
function flatten(
  obj: unknown,
  prefix = "",
): Record<string, string | boolean | number> {
  const result: Record<string, string | boolean | number> = {};
  if (typeof obj !== "object" || obj === null) return result;

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        const itemKey = `${fullKey}.${i}`;
        if (typeof item === "object" && item !== null) {
          Object.assign(result, flatten(item, itemKey));
        } else {
          result[itemKey] = item as string | boolean | number;
        }
      });
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flatten(value, fullKey));
    } else {
      result[fullKey] = value as string | boolean | number;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Check 1: Missing keys
// ---------------------------------------------------------------------------

async function checkMissingKeys(): Promise<MissingKey[]> {
  const localeData: Record<string, Record<string, string | boolean | number>> =
    {};

  for (const locale of SUPPORTED_LOCALES) {
    const tree = await loadLocale(locale);
    localeData[locale] = flatten(tree);
  }

  // Collect every key across all locales
  const allKeys = new Set<string>();
  for (const keys of Object.values(localeData)) {
    for (const k of Object.keys(keys)) allKeys.add(k);
  }

  const missing: MissingKey[] = [];

  for (const key of Array.from(allKeys).sort()) {
    const presentIn: string[] = [];
    const missingFrom: string[] = [];

    for (const locale of SUPPORTED_LOCALES) {
      if (key in localeData[locale]) {
        presentIn.push(locale);
      } else {
        missingFrom.push(locale);
      }
    }

    if (missingFrom.length > 0) {
      missing.push({ key, presentIn, missingFrom });
    }
  }

  return missing;
}

// ---------------------------------------------------------------------------
// Check 2: Hardcoded text in JSX
// ---------------------------------------------------------------------------

function isAllowlisted(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_FLAG_LENGTH) return true;
  if (UNIVERSAL_WORDS.has(trimmed)) return true;
  if (CODE_WORDS.has(trimmed)) return true;
  for (const pattern of ALLOWLIST_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

/** Heuristic: does this look like natural English text worth translating? */
function looksLikeEnglish(text: string): boolean {
  const trimmed = text.trim();
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  // At least 3 chars of real content
  if (trimmed.replace(/[^a-zA-Z]/g, "").length < 3) return false;
  return true;
}

/**
 * Scan a .tsx file for hardcoded English text in JSX.
 *
 * Uses multiple complementary patterns:
 *  1. Inline JSX text:  >Some Text</tag>
 *  2. Standalone text lines: text between a closing > and opening < on separate lines
 *  3. JSX attributes: label="Some Text"
 *  4. alt text on images: alt="Some descriptive text"
 */
function scanFile(filePath: string): HardcodedString[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const findings: HardcodedString[] = [];

  // Skip files that are purely layout/shell components with no content
  const isLayout =
    filePath.endsWith("layout.tsx") && !filePath.includes("(marketing)");
  if (isLayout) return findings;

  // Track code block depth to skip content inside <code> / <pre>
  let inCodeBlock = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Skip import/export/comment/script lines
    if (/^\s*(import |export |\/\/|\/\*|\*|<script)/.test(line)) continue;

    // Track code blocks (<code>, <pre>)
    if (/<(code|pre)[\s>]/.test(line)) inCodeBlock++;
    if (/<\/(code|pre)>/.test(line)) inCodeBlock = Math.max(0, inCodeBlock - 1);
    if (inCodeBlock > 0) continue;

    // Skip lines that are purely code (template literals, expressions)
    if (/^\s*[{`]/.test(trimmed) && !trimmed.startsWith("{t(")) continue;

    // Skip code-like content (shell commands, keywords, code blocks)
    if (/^\$ /.test(trimmed)) continue; // shell commands
    if (/^(const |let |var |function |return |export |import )/.test(trimmed)) continue;
    if (/^\[ .+ \]$/.test(trimmed)) continue; // [ TRACKS ] style labels in code blocks
    if (/^(true|false|null|undefined)$/.test(trimmed)) continue;

    // Skip lines inside t() calls or that use t() for their content
    const usesT = /\bt\(|getScopedI18n\(|useScopedI18n\(|getI18n\(|useI18n\(/.test(line);

    // --- Pattern 1: Inline JSX text  (>Text</ or >Text<) ---
    // Matches: <h2>Some Title</h2>, <span>Label</span>, >Text</
    const inlineMatches = line.matchAll(
      />([A-Za-z][A-Za-z\s,'()\-:&/!?]+?)<\//g,
    );
    for (const match of inlineMatches) {
      const text = match[1].trim();
      if (
        text &&
        !usesT &&
        !isAllowlisted(text) &&
        looksLikeEnglish(text) &&
        !text.startsWith("{") &&
        !text.startsWith("`")
      ) {
        findings.push({
          file: filePath,
          line: lineNum,
          column: match.index! + match[0].indexOf(match[1]),
          text,
          context: trimmed.substring(0, 120),
        });
      }
    }

    // --- Pattern 2: Standalone text lines (text between closing > and opening <) ---
    // Matches lines that are just plain text, like:
    //   PLATFORM
    //   Desktop
    //   "No Hidden Fees"
    if (
      !usesT &&
      !trimmed.startsWith("<") &&
      !trimmed.startsWith("{") &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("import") &&
      !trimmed.startsWith("export") &&
      trimmed.length > 0
    ) {
      // Check if the previous line ends with > and next line starts with <
      const prevLine = i > 0 ? lines[i - 1].trim() : "";
      const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : "";
      const prevEndsOpen = prevLine.endsWith(">") || prevLine.endsWith(">");
      const nextStartsClose = nextLine.startsWith("<");

      if (prevEndsOpen && nextStartsClose) {
        const text = trimmed.replace(/^["']|["']$/g, "").trim(); // strip surrounding quotes
        if (
          text &&
          !text.startsWith("{") &&
          !text.startsWith("//") &&
          !isAllowlisted(text) &&
          looksLikeEnglish(text)
        ) {
          findings.push({
            file: filePath,
            line: lineNum,
            column: 0,
            text,
            context: trimmed.substring(0, 120),
          });
        }
      }
    }

    // --- Pattern 3: JSX attribute text (label="...", title="...", alt="...") ---
    const attrMatches = line.matchAll(
      /\b(?:label|title|placeholder|description|aria-label|alt|children)=["']([A-Za-z][A-Za-z\s,'()\-:&/!?]+)["']/g,
    );
    for (const match of attrMatches) {
      const text = match[1].trim();
      if (
        text &&
        !usesT &&
        !isAllowlisted(text) &&
        looksLikeEnglish(text) &&
        !text.startsWith("{")
      ) {
        // Avoid duplicate with inline pattern
        const alreadyFound = findings.some(
          (f) => f.line === lineNum && f.text === text,
        );
        if (!alreadyFound) {
          findings.push({
            file: filePath,
            line: lineNum,
            column: match.index! + match[0].indexOf(match[1]),
            text,
            context: trimmed.substring(0, 120),
          });
        }
      }
    }

    // --- Pattern 4: Text after closing > on same line (multi-line JSX) ---
    // Matches: >Some text (where < is NOT on this line)
    // e.g., the line: <p className="...">
    //        next line: Some paragraph text
    if (!usesT && !trimmed.startsWith("<") && !trimmed.startsWith("{")) {
      // Check if this line has content but no opening/closing tags
      if (
        /^[A-Za-z][A-Za-z\s,'()\-:&/!?]+$/.test(trimmed) &&
        trimmed.length > 2
      ) {
        // Check if previous line had an opening JSX tag
        const prevLine = i > 0 ? lines[i - 1].trim() : "";
        if (prevLine.endsWith(">") && prevLine.includes("<")) {
          const text = trimmed;
          if (!isAllowlisted(text) && looksLikeEnglish(text)) {
            const alreadyFound = findings.some(
              (f) => f.line === lineNum && f.text === text,
            );
            if (!alreadyFound) {
              findings.push({
                file: filePath,
                line: lineNum,
                column: 0,
                text,
                context: trimmed.substring(0, 120),
              });
            }
          }
        }
      }
    }
  }

  return findings;
}

/** Recursively find all .tsx files under a directory. */
function findTsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      files.push(...findTsxFiles(full));
    } else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) {
      files.push(full);
    }
  }
  return files;
}

function checkHardcodedStrings(): HardcodedString[] {
  const appDir = resolve(APP_DIR);
  const files = findTsxFiles(appDir);
  const allFindings: HardcodedString[] = [];

  for (const file of files) {
    const findings = scanFile(file);
    // Make paths relative for display
    for (const f of findings) {
      f.file = relative(resolve("."), f.file);
    }
    allFindings.push(...findings);
  }

  return allFindings;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printReport(result: AuditResult) {
  const { missingKeys, hardcodedStrings } = result;
  let issueCount = 0;

  // --- Missing keys ---
  console.log("\n" + "=".repeat(60));
  console.log("  MISSING TRANSLATION KEYS");
  console.log("=".repeat(60));

  if (missingKeys.length === 0) {
    console.log("\n  ✅ All locales have matching key structures.\n");
  } else {
    issueCount += missingKeys.length;
    console.log(
      `\n  Found ${missingKeys.length} key(s) with missing translations:\n`,
    );

    // Group by missing-from locale for readability
    const byLocale: Record<string, MissingKey[]> = {};
    for (const mk of missingKeys) {
      for (const locale of mk.missingFrom) {
        if (!byLocale[locale]) byLocale[locale] = [];
        byLocale[locale].push(mk);
      }
    }

    for (const [locale, keys] of Object.entries(byLocale)) {
      console.log(`  📕 Missing from [${locale}] (${keys.length} keys):`);
      for (const k of keys) {
        console.log(`     • ${k.key}`);
      }
      console.log();
    }
  }

  // --- Hardcoded strings ---
  console.log("=".repeat(60));
  console.log("  HARDCODED ENGLISH TEXT IN JSX");
  console.log("=".repeat(60));

  if (hardcodedStrings.length === 0) {
    console.log("\n  ✅ No hardcoded English text found in page components.\n");
  } else {
    issueCount += hardcodedStrings.length;

    // Group by file
    const byFile: Record<string, HardcodedString[]> = {};
    for (const hs of hardcodedStrings) {
      if (!byFile[hs.file]) byFile[hs.file] = [];
      byFile[hs.file].push(hs);
    }

    console.log(
      `\n  Found ${hardcodedStrings.length} hardcoded string(s) in ${Object.keys(byFile).length} file(s):\n`,
    );

    for (const [file, strings] of Object.entries(byFile)) {
      console.log(`  📄 ${file}`);
      for (const s of strings) {
        console.log(`     L${s.line}:${s.column}  "${s.text}"`);
      }
      console.log();
    }
  }

  // --- Summary ---
  console.log("=".repeat(60));
  console.log("  SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Missing keys:      ${missingKeys.length}`);
  console.log(`  Hardcoded strings: ${hardcodedStrings.length}`);
  console.log(`  Total issues:      ${issueCount}`);
  console.log("=".repeat(60) + "\n");

  return issueCount;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const runKeys = !opts.hardcodedOnly;
  const runHardcoded = !opts.keysOnly;

  const result: AuditResult = {
    missingKeys: [],
    hardcodedStrings: [],
  };

  try {
    if (runKeys) {
      result.missingKeys = await checkMissingKeys();
    }
    if (runHardcoded) {
      result.hardcodedStrings = checkHardcodedStrings();
    }
  } catch (error) {
    console.error("Error during audit:", error);
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(
      result.missingKeys.length + result.hardcodedStrings.length > 0 ? 1 : 0,
    );
  }

  const issueCount = printReport(result);
  process.exit(issueCount > 0 ? 1 : 0);
}

main();
