import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { RuntimeCartridge } from "@reading-advantage/advantage-play-kit";
import { describe, expect, it } from "vitest";

import {
  assertCartridgeBoundary,
  assertNonEmptyCartridgeScene,
} from "./legacy-traversal-phase3-test-helpers.js";

type Evidence = {
  readonly artifact: string;
  readonly json_pointer: string;
  readonly claim_id: string;
};

type FixtureTitle = {
  readonly title_id: string;
  readonly mechanics: {
    readonly evidence: Evidence;
    readonly input_evidence: Evidence;
  };
  readonly responsive: { readonly evidence: Evidence };
  readonly learning: { readonly evidence: Evidence };
};

type FixtureDocument = { readonly titles: readonly FixtureTitle[] };

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXTURE_PATH = resolve(
  REPO_ROOT,
  "measure/tracks/apk_legacy_traversal_cutover_20260727/phase3-red-fixtures.json",
);
const TITLE_IDS = [
  "dragon-rider",
  "spellweavers-run",
  "shadow-gate-dungeon",
  "labyrinth-goblin-king",
  "griffin-riders-escape",
] as const;
const RED_FILES = TITLE_IDS.flatMap((titleId) => [
  `legacy-traversal-${titleId}.mechanics.test.ts`,
  `legacy-traversal-${titleId}.responsive.test.ts`,
  `legacy-traversal-${titleId}.learning.test.ts`,
]);

function resolveJsonPointer(value: unknown, pointer: string): unknown {
  if (pointer === "") return value;
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((current, segment) => {
      if (Array.isArray(current)) return current[Number(segment)];
      if (typeof current === "object" && current !== null) {
        return (current as Record<string, unknown>)[segment];
      }
      return undefined;
    }, value);
}

function loadFixtureDocument(): FixtureDocument {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as FixtureDocument;
}

describe("legacy traversal Phase 3 adversarial contracts", () => {
  it("rejects no-op scene configurations after a manifest-only declaration", () => {
    const fakeManifestCartridge: RuntimeCartridge = {
      manifest: {
        id: "dragon-rider",
        title: "Fake Dragon Rider",
        description: "Fake capability declaration",
        runtimeApiVersion: "1.0.0",
        inputMode: "vocabulary",
        requiredAssetBindings: ["fake.binding"],
        capabilities: ["arcade-physics", "camera", "timers", "tweens"],
      },
      createGameConfig: () => ({ scene: [] }),
    };

    expect(() =>
      assertCartridgeBoundary(
        fakeManifestCartridge,
        "dragon-rider",
        "vocabulary",
        "fake manifest",
      ),
    ).not.toThrow();
    expect(() =>
      assertNonEmptyCartridgeScene(
        fakeManifestCartridge.createGameConfig({} as never),
        "fake manifest",
      ),
    ).toThrow(/empty scene list/);
    expect(() =>
      assertNonEmptyCartridgeScene({ scene: {} }, "empty scene object"),
    ).toThrow(/scene entry is empty/);
    expect(() =>
      assertNonEmptyCartridgeScene(
        { scene: { key: "accepted-boundary" } },
        "scene boundary",
      ),
    ).not.toThrow();
  });

  it("resolves every title and contract evidence pointer to its declared claim", () => {
    const document = loadFixtureDocument();
    expect(document.titles.map((title) => title.title_id)).toEqual(TITLE_IDS);

    for (const title of document.titles) {
      const evidenceContracts = [
        title.mechanics.evidence,
        title.mechanics.input_evidence,
        title.responsive.evidence,
        title.learning.evidence,
      ];
      for (const evidence of evidenceContracts) {
        const artifact = JSON.parse(
          readFileSync(resolve(REPO_ROOT, evidence.artifact), "utf8"),
        ) as unknown;
        const resolved = resolveJsonPointer(artifact, evidence.json_pointer);
        expect(
          resolved,
          `${title.title_id}:${evidence.claim_id}`,
        ).toBeDefined();
        expect(
          (resolved as Record<string, unknown>).claim_id,
          `${title.title_id}:${evidence.json_pointer}`,
        ).toBe(evidence.claim_id);
      }
    }
  });

  it("keeps all fifteen Red contracts substantive and renderer-agnostic", () => {
    for (const fileName of RED_FILES) {
      const source = readFileSync(
        resolve(REPO_ROOT, "packages/game-cartridges/src", fileName),
        "utf8",
      );
      expect(source).toContain("assertNonEmptyCartridgeScene");
      expect(source).not.toMatch(/from ["']phaser["']/);
      expect(source).not.toContain("createPhaserGameFactory");

      if (fileName.endsWith(".mechanics.test.ts")) {
        expect(source).toContain("createInputActionNormalizer");
        expect(source).toContain("createDeterministicSpawner");
        expect(source).toContain("createBoundedFrameScheduler");
      } else if (fileName.endsWith(".responsive.test.ts")) {
        expect(source).toContain("createResponsiveTransitionCoordinator");
        expect(source).toContain("coordinator.transition");
        expect(source).toContain("recompose:");
        expect(source).toContain("restoreState");
      } else {
        expect(source).toContain("createLanguageTargetProgression");
        expect(source).toContain("finalizeResult");
        expect(source).toContain("createCompletionLatch");
      }
    }
  });
});
