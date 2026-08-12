import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(testDirectory, "../../../");
const repositoryRoot = resolve(testDirectory, "../../../../../");
const lifecycleDocumentation = readFileSync(resolve(packageRoot, "docs/game-lifecycle.md"), "utf8");
const developerKitDocumentation = readFileSync(resolve(packageRoot, "docs/developer-kit.md"), "utf8");
const authoringQcSource = readFileSync(
  resolve(repositoryRoot, "apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.tsx"),
  "utf8",
);

/** Extracts fenced code examples from a Markdown document for boundary checks. */
function extractCodeBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/```(?:[a-z]+)?\n([\s\S]*?)```/gu)].map((match) => match[1] ?? "");
}

describe("APK guided tutorial documentation artifacts", () => {
  it("documents the shared tutorial lifecycle and its ownership boundary", () => {
    expect(lifecycleDocumentation).toContain("| `tutorial` | `tutorial-skip` | `countdown` or `playing` |");
    expect(lifecycleDocumentation).toContain("tutorial --tutorial-complete--> countdown --countdown-complete--> playing");
    expect(lifecycleDocumentation).toMatch(/APK owns tutorial sequencing, pause\/resume, ordered advance, replay, skip,\s+and\s+progress/i);
    expect(lifecycleDocumentation).toMatch(/host owns navigation,\s+persistence,\s+and authoritative XP/i);
  });

  it("documents the intern declaration path with resolved strings and semantic IDs", () => {
    expect(developerKitDocumentation).toContain("## Guided gameplay tutorial");
    expect(developerKitDocumentation).toContain("gameTutorialDefinitionSchema");
    expect(developerKitDocumentation).toContain("validateGameTutorialDefinition");
    expect(developerKitDocumentation).toContain('id: "mechanic:answer-choice"');
    expect(developerKitDocumentation).toContain('id: "action:show-answer-choice"');
    expect(developerKitDocumentation).toMatch(/resolved Thai or English strings/i);
    expect(developerKitDocumentation).toMatch(/same seed\s+produces\s+the same demonstration/i);
  });

  it("documents a runtime-only action driver without copied UI or host authority", () => {
    const actionDriverExample = extractCodeBlocks(developerKitDocumentation).find((block) =>
      block.includes("GameTutorialActionDriver"),
    );

    expect(actionDriverExample).toBeDefined();
    expect(actionDriverExample).toContain("mechanic.demonstrateTutorialAction");
    expect(actionDriverExample).toContain("step.actionId");
    expect(actionDriverExample).toContain("seed");
    expect(actionDriverExample).not.toMatch(/document\.|window\.|querySelector|getBoundingClientRect|client[XxYy]/u);
    expect(actionDriverExample).not.toMatch(/GameResults|persist|leaderboard|authoritativeXp|router|navigate|location/u);
  });

  it("records tutorial safety and the separate QC inspection path", () => {
    expect(developerKitDocumentation).toMatch(/tutorial mode emits no\s+`GameResults`/i);
    expect(developerKitDocumentation).toMatch(/no production completion, persistence, XP, or leaderboard effects/i);
    expect(developerKitDocumentation).toContain("createGameTutorialQcFixture");
    expect(developerKitDocumentation).toMatch(/guided tutorial QC preview/i);
    expect(developerKitDocumentation).toContain("/qc");
  });

  it("registers the independent compact/wide tutorial preview with deterministic fixtures", () => {
    expect(authoringQcSource).toContain("createGameTutorialQcFixture");
    expect(authoringQcSource).toContain("GameTutorialScreen");
    expect(authoringQcSource).toContain('aria-label="Guided tutorial QC preview"');
    expect(authoringQcSource).toContain('inputModes: ["keyboard", "pointer", "touch"]');
    expect(authoringQcSource).toContain("tutorialProfile");
    expect(authoringQcSource).toContain("tutorialReducedMotion");
    expect(authoringQcSource).toContain("zero production completions");
  });
});
