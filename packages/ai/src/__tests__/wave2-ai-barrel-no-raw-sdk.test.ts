/**
 * Wave 2 Phase 2 Red-phase guard: the `@reading-advantage/ai` barrel must
 * not re-export raw vendor SDK symbols.
 *
 * Track:  `wave2_confidence_restoration_20260628`
 * Phase:  2 — Provider Adapter Enforcement
 *
 * The ai package already keeps direct `@ai-sdk/*` / `"ai"` imports out of
 * app source (`phase-arch-no-direct-sdk.test.ts` passes), but the adapter
 * barrel itself still leaks raw provider constructors and SDK functions.
 * Production consumers must import adapter-owned functions/classes only.
 *
 * RED expectation at HEAD:
 *   `packages/ai/src/index.ts` re-exports 7 raw vendor symbols:
 *     - createOpenAI from "@ai-sdk/openai"
 *     - createGoogleGenerativeAI from "@ai-sdk/google"
 *     - createVertex from "@ai-sdk/google-vertex"
 *     - generateObject, generateText, streamText, experimental_generateImage from "ai"
 *   Labeled failure: `Raw AI barrel export count: 7`.
 *
 * Green path:
 *   - Remove the raw re-exports from `packages/ai/src/index.ts`, OR
 *   - Quarantine them under an explicit test-only path (e.g.
 *     `packages/ai/src/test-only/raw-sdk.ts`) that production code cannot
 *     import. The test-only path must itself be excluded from the barrel.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const INDEX_PATH = join(__dirname, "../index.ts");

const RAW_AI_MODULES = ["ai", "openai", "@ai-sdk/openai", "@ai-sdk/google", "@ai-sdk/google-vertex"];

interface BarrelExport {
  readonly kind: "value" | "type";
  readonly names: string[];
  readonly module: string;
}

function parseExportFromDeclarations(source: string): BarrelExport[] {
  const out: BarrelExport[] = [];
  // Strip single-line and multi-line comments so they do not confuse parsing.
  const stripped = source
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  const exportRe = /export\s+/g;
  let match: RegExpExecArray | null;
  while ((match = exportRe.exec(stripped)) !== null) {
    const start = match.index;
    let pos = start + match[0].length;
    let kind: "value" | "type" = "value";
    if (stripped.slice(pos).startsWith("type ")) {
      kind = "type";
      pos += 5;
    }
    if (stripped[pos] !== "{") continue;
    // Find matching `}` by brace counting.
    let braceCount = 1;
    let braceEnd = pos + 1;
    while (braceCount > 0 && braceEnd < stripped.length) {
      if (stripped[braceEnd] === "{") braceCount++;
      else if (stripped[braceEnd] === "}") braceCount--;
      braceEnd++;
    }
    if (braceCount !== 0) continue;
    const block = stripped.slice(pos + 1, braceEnd - 1);

    // Move past `}` and whitespace to `from "..."`.
    const afterBlock = stripped.slice(braceEnd).trimStart();
    const fromMatch = /^from\s+['"]([^'"]+)['"]/.exec(afterBlock);
    if (!fromMatch) continue;
    const moduleName = fromMatch[1];

    const names = block
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => {
        // Handle `name as alias` and `type Name` inside the block.
        const parts = s.split(/\s+as\s+/);
        return parts[0].replace(/^type\s+/, "").trim();
      })
      .filter((s) => s.length > 0);

    out.push({ kind, names, module: moduleName });
  }
  return out;
}

function isRawVendorModule(moduleName: string): boolean {
  return RAW_AI_MODULES.includes(moduleName) || moduleName.startsWith("@ai-sdk/");
}

describe("Wave 2 Phase 2 — AI barrel must not leak raw vendor SDK symbols", () => {
  it("counts raw SDK re-exports from packages/ai/src/index.ts", () => {
    const source = readFileSync(INDEX_PATH, "utf8");
    const declarations = parseExportFromDeclarations(source);

    const rawExports = declarations
      .filter((d) => d.kind === "value" && isRawVendorModule(d.module))
      .flatMap((d) => d.names.map((name) => `${name} from "${d.module}"`));

    const rawExportCount = rawExports.length;

    expect(
      rawExports,
      `Raw AI barrel export count: ${rawExportCount}\n` +
        "The adapter barrel must not re-export vendor SDK symbols. " +
        "Move these to adapter-owned APIs or quarantine them in a test-only path.\n" +
        (rawExports.length ? rawExports.join("\n") + "\n" : ""),
    ).toEqual([]);
  });
});
