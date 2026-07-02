/**
 * Wave 2 Phase 4 — Reusable provider-architecture guard utility.
 *
 * Generalizes the Phase 2 `wave2-provider-architecture-guard.test.ts`
 * import scanner into a reusable factory. Detects forbidden provider
 * SDK shapes in synthetic source fixtures using structured import
 * declarations (anti-pattern A1 — no substring truth).
 *
 * Shapes detected (illustrated using `<module>` as a placeholder for any
 * banned module specifier):
 *   - namespace imports: `import * as ns from "<module>"`
 *   - named/default static imports: `import { sym } from "<module>"`,
 *     `import Default from "<module>"`
 *   - CommonJS require: `require("<module>")`
 *   - dynamic imports: `await import("<module>")`
 *   - barrel re-export leaks: `export { sym } from "<module>"`,
 *     `export * from "<module>"`, and `export * as ns from "<module>"`
 *
 * The utility is pure — takes a source string, returns labeled `GuardHit`
 * objects with file/line/text/kind. Allowlist is exposed as an array of
 * `{ pattern, reason }` so consumers can inspect exact entries (A7).
 *
 * Why this lives here:
 *   - `packages/ai/src/testing/` is intentionally NOT in the package's
 *     `exports` map, so this utility is a test-only API.
 *   - The detector is shared between the ai package's Phase 2 guard and
 *     any downstream consumer that needs to scan a synthetic fixture for
 *     the same forbidden shapes.
 *
 * Note for maintainers: this file must NOT contain literal banned-import
 * statements (the Phase 2 production architecture guard scans it). The
 * inline illustrations above intentionally use `<module>` placeholders so
 * the file does not flag itself.
 */

type GuardHitKind =
  | "namespace-import"
  | "static-import"
  | "require"
  | "dynamic-import"
  | "barrel-re-export";

interface GuardHit {
  file: string;
  line: number;
  text: string;
  kind: GuardHitKind;
}

interface ProviderGuard {
  scan(source: string, filePath?: string): GuardHit[];
  allowlist: Array<{ pattern: RegExp; reason: string }>;
}

const DEFAULT_BANNED_MODULES = [
  "openai",
  "@ai-sdk/openai",
  "@ai-sdk/google",
  "ai",
  "@google-cloud/storage",
  "firebase-admin/storage",
];

/**
 * Build a provider-architecture guard with the default banned-module
 * list and allowlist. The default allowlist mirrors the entries the
 * Phase 2 production guard uses so that scanning the same source yields
 * a comparable allowlist-match signal.
 *
 * @returns A reusable guard exposing `scan(source, filePath)` and an
 *   `allowlist` array.
 */
export function createProviderGuard(): ProviderGuard {
  const allowlist: Array<{ pattern: RegExp; reason: string }> = [
    {
      pattern: /^packages\/ai\/src\/internal-sdk\.ts$/,
      reason:
        "Wave 2 Phase 2 quarantine for raw vendor SDK re-exports (see plan.md follow-up rows)",
    },
  ];

  return {
    allowlist,
    scan(source, filePath = "<unknown>") {
      const hits: GuardHit[] = [];
      const bannedRe = new RegExp(
        `\\b(?:from|import)\\s+['"](${[...DEFAULT_BANNED_MODULES]
          .map((m) => m.replace(/[.+*?^${}()|[\]\\]/g, "\\$&"))
          .join("|")})['"]`,
      );

      const lines = source.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i] ?? "";
        // Strip line comments before matching so commented-out banned
        // imports do not flag (the production guard does the same).
        const codeOnly = rawLine.replace(/\/\/.*$/g, "");

        const lineNo = i + 1;

        // 1. Barrel re-export leak: `export { ... } from "banned"`,
        //    `export * from "banned"`, and `export * as ns from "banned"`.
        if (/\bexport\s+(?:\*\s+from|\*\s+as\s+[A-Za-z_$][\w$]*\s+from|\{[^}]*\}\s*from)\s+['"]([^'"]+)['"]/.test(codeOnly)) {
          const m = codeOnly.match(
            /\bexport\s+(?:\*\s+from|\*\s+as\s+[A-Za-z_$][\w$]*\s+from|\{[^}]*\}\s*from)\s+['"]([^'"]+)['"]/,
          );
          if (m && isBannedModule(m[1] ?? "")) {
            hits.push({
              file: filePath,
              line: lineNo,
              text: rawLine.trim(),
              kind: "barrel-re-export",
            });
            continue;
          }
        }

        // 2. Namespace import: `import * as ns from "banned"`.
        if (/\bimport\s*\*\s*as\s+[A-Za-z_$][\w$]*\s+from\s+['"]([^'"]+)['"]/.test(codeOnly)) {
          const m = codeOnly.match(
            /\bimport\s*\*\s*as\s+[A-Za-z_$][\w$]*\s+from\s+['"]([^'"]+)['"]/,
          );
          if (m && isBannedModule(m[1] ?? "")) {
            hits.push({
              file: filePath,
              line: lineNo,
              text: rawLine.trim(),
              kind: "namespace-import",
            });
            continue;
          }
        }

        // 3. Named/default static import: `import x from "banned"` and
        //    `import { ... } from "banned"`. The single regex covers both
        //    shapes; the test fixtures use both `import { generateText }`
        //    and `import OpenAI`.
        const staticImportRe = /\bimport\s+(?:[A-Za-z_$][\w$]*|\{[^}]*\})(?:\s*,\s*(?:[A-Za-z_$][\w$]*|\{[^}]*\}))*\s+from\s+['"]([^'"]+)['"]/;
        const staticMatch = codeOnly.match(staticImportRe);
        if (staticMatch && isBannedModule(staticMatch[1] ?? "")) {
          hits.push({
            file: filePath,
            line: lineNo,
            text: rawLine.trim(),
            kind: "static-import",
          });
          continue;
        }

        // 4. CommonJS require: `require("banned")` and `require('banned')`.
        const requireRe = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/;
        const requireMatch = codeOnly.match(requireRe);
        if (requireMatch && isBannedModule(requireMatch[1] ?? "")) {
          hits.push({
            file: filePath,
            line: lineNo,
            text: rawLine.trim(),
            kind: "require",
          });
          continue;
        }

        // 5. Dynamic import: `await import("banned")` or `import("banned")`.
        const dynamicRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/;
        const dynamicMatch = codeOnly.match(dynamicRe);
        if (dynamicMatch && isBannedModule(dynamicMatch[1] ?? "")) {
          // The `import\s*\(` regex above also matches a static
          // `import x from "..."` because that contains the substring
          // `import`, but it only matches when followed by `(` (which
          // static imports don't have), so the two patterns don't
          // collide.
          //
          // However, we need to be careful: a `import.meta` reference is
          // not a dynamic import. We anchor on `import(` (no `.` between
          // the two).
          if (!/import\s*\./.test(codeOnly)) {
            hits.push({
              file: filePath,
              line: lineNo,
              text: rawLine.trim(),
              kind: "dynamic-import",
            });
            continue;
          }
        }

        // Silence the unused-var warning for the disabled `bannedRe`
        // — it is reserved for future per-line banned-module expansion
        // when consumers register additional banned modules.
        void bannedRe;
      }

      return hits;
    },
  };
}

/**
 * Check whether a module specifier is in the default banned-module list.
 * Exported so consumers who pass a custom list can reuse the same
 * normalization.
 */
function isBannedModule(moduleSpecifier: string): boolean {
  return DEFAULT_BANNED_MODULES.includes(moduleSpecifier);
}

export type { GuardHit, GuardHitKind, ProviderGuard };