import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { GameCorpusSchema } from "../audit-schema";
import corpusJson from "../game-corpus.json";

const root = resolve(import.meta.dirname, "../../../..");
const catalogSource = readFileSync(
  resolve(root, "apps/advantage-games/src/lib/gameCards.ts"),
  "utf8",
);

const catalogIds = [...catalogSource.matchAll(/^    id: '([^']+)',/gm)].map(
  (match) => match[1],
);

describe("APK canonical game corpus", () => {
  const corpus = GameCorpusSchema.parse(corpusJson);

  it("maps every live catalog identity exactly once", () => {
    const corpusIds = corpus.games.map((game) => game.slug);
    expect(new Set(corpusIds).size).toBe(corpusIds.length);
    expect(catalogIds).toHaveLength(27);
    expect(corpusIds).toEqual(expect.arrayContaining(catalogIds));
  });

  it("preserves deleted historical requirement evidence", () => {
    expect(
      corpus.games.find((game) => game.slug === "abyssal-well")?.catalogState,
    ).toBe("stale");
    expect(
      corpus.games.find((game) => game.slug === "babel-architect")
        ?.catalogState,
    ).toBe("stale");
  });

  it("maps every game to a scene and resolvable evidence", () => {
    const sceneIds = new Set(corpus.scenes.map((scene) => scene.id));
    const evidenceIds = new Set(corpus.evidence.map((evidence) => evidence.id));

    for (const game of corpus.games) {
      expect(
        game.sceneIds.every((id) => sceneIds.has(id)),
        game.slug,
      ).toBe(true);
      expect(
        game.evidenceIds.every((id) => evidenceIds.has(id)),
        game.slug,
      ).toBe(true);
    }
  });

  it("records imported copies as evidence instead of duplicate games", () => {
    const readingCopies = corpus.evidence.filter(
      (evidence) =>
        evidence.kind === "source" &&
        evidence.path.startsWith("apps/reading-advantage/") &&
        evidence.note?.includes("imported copy"),
    );
    expect(readingCopies.length).toBeGreaterThan(0);
    expect(
      corpus.games.filter((game) => game.slug.includes("reading-copy")),
    ).toEqual([]);
  });

  it("enumerates concrete implementation or Measure evidence for every game", () => {
    for (const game of corpus.games) {
      expect(
        game.implementationPaths.length +
          game.importedCopyPaths.length +
          game.measureEvidencePaths.length,
        game.slug,
      ).toBeGreaterThan(0);
    }
  });
});
