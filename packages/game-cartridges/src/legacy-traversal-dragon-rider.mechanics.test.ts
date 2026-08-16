import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createBoundedFrameScheduler,
  createDeterministicSpawner,
  createInputActionNormalizer,
  type GameInput,
  type InputActionId,
  type RuntimeCartridge,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import { beforeAll, describe, expect, it } from "vitest";

import { cartridgeLoaders, getCartridgeCatalogEntry } from "./catalog.js";

type Evidence = {
  readonly artifact: string;
  readonly json_pointer: string;
  readonly claim_id: string;
};
type MechanicsFixture = {
  readonly evidence: Evidence;
  readonly input_evidence: Evidence;
  readonly loop: string;
  readonly steps: readonly string[];
  readonly capabilities: readonly string[];
  readonly spawn_interval_ms: number;
  readonly frame_delta_ms: number;
  readonly keyboard: Readonly<Record<string, string>>;
};
type TitleFixture = {
  readonly title_id: string;
  readonly input: unknown;
  readonly input_mode: "vocabulary" | "sentence";
  readonly mechanics: MechanicsFixture;
  readonly responsive: { readonly evidence: Evidence };
  readonly learning: { readonly evidence: Evidence };
};
type FixtureDocument = { readonly titles: readonly TitleFixture[] };

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXTURE_PATH = resolve(
  REPO_ROOT,
  "measure/tracks/apk_legacy_traversal_cutover_20260727/phase3-red-fixtures.json",
);

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

function assertFixtureEvidencePointers(document: FixtureDocument): void {
  for (const title of document.titles) {
    const evidenceContracts = [
      ["mechanics", title.mechanics.evidence],
      ["mechanics-input", title.mechanics.input_evidence],
      ["responsive", title.responsive.evidence],
      ["learning", title.learning.evidence],
    ] as const;
    for (const [section, evidence] of evidenceContracts) {
      const artifact = JSON.parse(
        readFileSync(resolve(REPO_ROOT, evidence.artifact), "utf8"),
      ) as unknown;
      const resolved = resolveJsonPointer(artifact, evidence.json_pointer);
      expect(
        resolved,
        `EVIDENCE_POINTER_MISSING: ${title.title_id}:${section}`,
      ).toBeDefined();
      const claimId =
        typeof resolved === "object" && resolved !== null
          ? (resolved as Record<string, unknown>).claim_id
          : undefined;
      expect(
        claimId,
        `EVIDENCE_POINTER_DRIFT: ${title.title_id}:${section}`,
      ).toBe(evidence.claim_id);
    }
  }
}

beforeAll(() => {
  const document = JSON.parse(
    readFileSync(FIXTURE_PATH, "utf8"),
  ) as FixtureDocument;
  assertFixtureEvidencePointers(document);
});

function loadFixture(titleId: string): TitleFixture {
  const document = JSON.parse(
    readFileSync(FIXTURE_PATH, "utf8"),
  ) as FixtureDocument;
  const fixture = document.titles.find((title) => title.title_id === titleId);
  if (!fixture) throw new Error(`MISSING_PHASE3_FIXTURE: ${titleId}`);
  return fixture;
}

async function requireCartridge(
  fixture: TitleFixture,
  evidence: Evidence,
  behavior: string,
): Promise<RuntimeCartridge> {
  const missing = `MISSING_CARTRIDGE_BEHAVIOR: ${fixture.title_id}; evidence=${evidence.claim_id}; ${behavior}`;
  const entry = getCartridgeCatalogEntry(fixture.title_id);
  expect(entry, missing).toBeDefined();
  const loader = (
    cartridgeLoaders as unknown as Readonly<
      Record<string, () => Promise<RuntimeCartridge>>
    >
  )[fixture.title_id];
  expect(loader, `${missing}; the public loader is absent`).toBeTypeOf(
    "function",
  );
  const cartridge = await (loader as () => Promise<RuntimeCartridge>)();
  expect(cartridge, missing).toBeDefined();
  expect(cartridge.manifest.id, `${missing}; manifest id is absent`).toBe(
    fixture.title_id,
  );
  expect(cartridge.manifest.inputMode, `${missing}; input mode is absent`).toBe(
    fixture.input_mode,
  );
  const config = cartridge.createGameConfig({
    input: fixture.input as GameInput,
    edition: {} as RuntimeEdition,
    complete: () => undefined,
    diagnostic: () => undefined,
    inputController: {
      snapshot: () => ({
        keys: [],
        pointer: {
          down: false,
          cancelled: false,
          id: null,
          kind: null,
          startX: 0,
          startY: 0,
          x: 0,
          y: 0,
        },
        destroyed: false,
      }),
      cancelActiveGesture: () => undefined,
      destroy: () => undefined,
    },
  });
  expect(
    config,
    `${missing}; createGameConfig returned a no-op config`,
  ).toEqual(expect.objectContaining({ scene: expect.anything() }));
  return cartridge;
}

describe("legacy traversal Phase 3 Dragon Rider mechanics", () => {
  it("requires the accepted gate-to-boss traversal loop and deterministic input contract", async () => {
    const fixture = loadFixture("dragon-rider");
    expect(fixture.mechanics.steps).toEqual([
      "gate-selection",
      "flight-growth",
      "boss-resolution",
    ]);
    expect(new Set(fixture.mechanics.steps).size).toBe(
      fixture.mechanics.steps.length,
    );

    const keyboard = Object.fromEntries(
      Object.entries(fixture.mechanics.keyboard).map(([code, action]) => [
        code,
        action as InputActionId,
      ]),
    ) as Record<string, InputActionId>;
    const normalize = createInputActionNormalizer({ keyboard });
    for (const [code, action] of Object.entries(keyboard)) {
      expect(normalize({ modality: "keyboard", code })).toEqual([
        { action, edge: "press" },
      ]);
    }

    const spawner = createDeterministicSpawner({
      intervalMs: fixture.mechanics.spawn_interval_ms,
      maxPerTick: 1,
    });
    expect(spawner.advance(fixture.mechanics.spawn_interval_ms)).toBe(1);
    expect(spawner.elapsedMs).toBe(0);
    const deltas: number[] = [];
    const scheduler = createBoundedFrameScheduler((deltaMs) =>
      deltas.push(deltaMs),
    );
    scheduler.tick(fixture.mechanics.frame_delta_ms);
    expect(deltas).toEqual([50]);

    const cartridge = await requireCartridge(
      fixture,
      fixture.mechanics.evidence,
      `the cartridge must implement ${fixture.mechanics.loop}; input evidence=${fixture.mechanics.input_evidence.claim_id}`,
    );
    expect(cartridge.manifest.capabilities).toEqual(
      expect.arrayContaining([...fixture.mechanics.capabilities]),
    );
  });
});
