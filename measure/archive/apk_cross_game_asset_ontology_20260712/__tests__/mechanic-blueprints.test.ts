import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import corpus from "../game-corpus.json";
import blueprints from "../mechanic-blueprints.json";

const trackDir = resolve(import.meta.dirname, "..");
const requiredHeadings = [
  "## Identity and fantasy",
  "## Learning loop",
  "## World and controls",
  "## Progression and terminal state",
  "## Phaser rebuild boundary",
  "## Deterministic Red-test evidence",
  "## Evidence",
];

describe("APK mechanic blueprints", () => {
  it("provides exactly one machine blueprint per canonical game", () => {
    expect(blueprints.map((item) => item.gameId).sort()).toEqual(
      corpus.games.map((game) => game.id).sort(),
    );
  });

  it("publishes a complete human blueprint for every game", () => {
    for (const game of corpus.games) {
      const path = resolve(trackDir, "mechanic-blueprints", `${game.slug}.md`);
      expect(existsSync(path), game.slug).toBe(true);
      const markdown = readFileSync(path, "utf8");
      for (const heading of requiredHeadings)
        expect(markdown, `${game.slug}: ${heading}`).toContain(heading);
    }
  });

  it("records retained, redesignable, and deterministic behavior", () => {
    const evidenceIds = new Set(corpus.evidence.map((item) => item.id));
    for (const blueprint of blueprints) {
      expect(blueprint.retain.length, blueprint.gameId).toBeGreaterThan(0);
      expect(blueprint.redesign.length, blueprint.gameId).toBeGreaterThan(0);
      expect(blueprint.transitions.length, blueprint.gameId).toBeGreaterThan(0);
      expect(
        blueprint.counterexamples.length,
        blueprint.gameId,
      ).toBeGreaterThan(0);
      expect(blueprint.evidenceIds.length, blueprint.gameId).toBeGreaterThan(0);
      expect(
        blueprint.evidenceIds.every((id) => evidenceIds.has(id)),
        blueprint.gameId,
      ).toBe(true);
    }
  });
});
