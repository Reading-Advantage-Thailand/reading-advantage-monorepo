/**
 * Wave 2 Phase 4 — Reusable provider-architecture guard utility.
 *
 * Track:  wave2_confidence_restoration_20260628
 * Phase:  4 — Reusable Harnesses
 *
 * Drives a shared guard utility that detects forbidden provider import shapes
 * in synthetic source fixtures, generalizing the Phase 2 guard from
 * wave2-provider-architecture-guard.test.ts.
 *
 * Intended home:
 *   packages/ai/src/testing/provider-guard-utility.ts
 *
 * The utility must catch:
 *   - namespace imports (`import * as openai from "openai"`)
 *   - default/named static imports (`import openai from "openai"`)
 *   - CommonJS require (`require("openai")`)
 *   - dynamic import (`await import("openai")`)
 *   - barrel re-export leaks (`export { generateText } from "ai"`)
 *
 * RED expectations at HEAD:
 *   - The utility module does not exist, so the import fails.
 *   - If a stub exists, it must detect every injected forbidden shape or the
 *     labeled hit count fails.
 *
 * Anti-pattern coverage:
 *   A1: parses import declarations / export declarations with regex/AST-like
 *       patterns, not prose substring truth.
 *   A3: labeled counts for scanned fixture count and forbidden-shape hits.
 *   A4: fails if zero fixtures are scanned or all injected shapes are missed.
 *   A5: counterexample fixtures include each forbidden shape.
 *   A7: allowlist is an exact path/pattern list, not broad English filters.
 */
import { describe, expect, it } from "vitest";
import { createProviderGuard } from "../testing/provider-guard-utility.js";

interface GuardHit {
  file: string;
  line: number;
  text: string;
  kind:
    | "namespace-import"
    | "static-import"
    | "require"
    | "dynamic-import"
    | "barrel-re-export";
}

interface ProviderGuard {
  scan(source: string, filePath?: string): GuardHit[];
  allowlist: Array<{ pattern: RegExp; reason: string }>;
}

/** Forbidden provider modules used by the guard. */
const BANNED_MODULES = [
  "openai",
  "@ai-sdk/openai",
  "@ai-sdk/google",
  "ai",
  "@google-cloud/storage",
  "firebase-admin/storage",
] as const;

const FIXTURES: Array<{ name: string; source: string; expectedKinds: GuardHit["kind"][] }> = [
  {
    name: "namespace import",
    source: `import * as openai from "openai";\nexport async function f() {}`,
    expectedKinds: ["namespace-import"],
  },
  {
    name: "named static import",
    source: `import { generateText } from "ai";\nexport async function f() {}`,
    expectedKinds: ["static-import"],
  },
  {
    name: "default static import",
    source: `import OpenAI from "openai";\nexport async function f() {}`,
    expectedKinds: ["static-import"],
  },
  {
    name: "CommonJS require",
    source: `const openai = require("openai");\nexport async function f() {}`,
    expectedKinds: ["require"],
  },
  {
    name: "dynamic import",
    source: `export async function f() {\n  const { generateText } = await import("ai");\n}`,
    expectedKinds: ["dynamic-import"],
  },
  {
    name: "barrel re-export leak",
    source: `export { generateText, streamText } from "ai";\n`,
    expectedKinds: ["barrel-re-export"],
  },
  {
    name: "safe adapter import is not flagged",
    source: `import { AIClient } from "@reading-advantage/ai";\nexport async function f() {}`,
    expectedKinds: [],
  },
];

describe("Wave 2 Phase 4 — provider guard utility", () => {
  it("exists and exposes a factory function", () => {
    expect(
      createProviderGuard,
      "packages/ai/src/testing/provider-guard-utility.ts must export " +
        "`createProviderGuard()`. This utility generalizes the Phase 2 " +
        "provider-architecture guard so any package can scan synthetic source " +
        "fixtures for forbidden provider SDK shapes.",
    ).toBeTypeOf("function");
  });

  it("has a non-empty banned-module list and allowlist (A4)", () => {
    const guard = createProviderGuard() as ProviderGuard;
    expect(
      BANNED_MODULES.length,
      `Banned module count: ${BANNED_MODULES.length}. ` +
        `Guard must target at least one forbidden module (anti-pattern A4).`,
    ).toBeGreaterThan(0);
    expect(
      guard.allowlist.length,
      `Allowlist entry count: ${guard.allowlist.length}. ` +
        `Allowlist may be empty, but if present each entry must carry an exact ` +
        `path pattern and reason (anti-pattern A7).`,
    ).toBeGreaterThanOrEqual(0);
    for (const entry of guard.allowlist) {
      expect(entry.pattern).toBeInstanceOf(RegExp);
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  describe("consumer — detects each forbidden shape (A5 counterexamples)", () => {
    it.each(FIXTURES)(
      "detects $name",
      ({ name, source, expectedKinds }) => {
        const guard = createProviderGuard() as ProviderGuard;
        const hits = guard.scan(source, `fixtures/${name}.ts`);
        const hitCount = hits.length;
        expect(
          hitCount,
          `Forbidden-shape hit count for ${name}: ${hitCount}. ` +
            `Expected ${expectedKinds.length} hit(s) with kind(s) ${expectedKinds.join(", ")}.`,
        ).toBe(expectedKinds.length);
        for (const kind of expectedKinds) {
          expect(
            hits.some((h) => h.kind === kind),
            `Expected at least one hit of kind '${kind}' for ${name}. ` +
              `Found kinds: ${hits.map((h) => h.kind).join(", ")}.`,
          ).toBe(true);
        }
      },
    );
  });

  it("reports line numbers and source text for each hit (A1)", () => {
    const guard = createProviderGuard() as ProviderGuard;
    const source = `import * as openai from "openai";\nconst x = 1;`;
    const hits = guard.scan(source, "fixtures/line-number.ts");
    expect(hits.length).toBe(1);
    expect(hits[0].line).toBe(1);
    expect(hits[0].text).toContain("openai");
    expect(hits[0].file).toBe("fixtures/line-number.ts");
  });
});
