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
} from "@reading-advantage/advantage-play-kit";
import { describe, expect, it } from "vitest";

import { cartridgeLoaders, getCartridgeCatalogEntry } from "./catalog.js";
import {
  assertCartridgeBoundary,
  assertNonEmptyCartridgeScene,
  createPhase3InputController,
  PHASE3_RUNTIME_EDITION,
} from "./legacy-traversal-phase3-test-helpers.js";

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
};
type FixtureDocument = { readonly titles: readonly TitleFixture[] };

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXTURE_PATH = resolve(
  REPO_ROOT,
  "measure/tracks/apk_legacy_traversal_cutover_20260727/phase3-red-fixtures.json",
);

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
  assertCartridgeBoundary(
    cartridge,
    fixture.title_id,
    fixture.input_mode,
    missing,
  );
  const config = cartridge.createGameConfig({
    input: fixture.input as GameInput,
    edition: PHASE3_RUNTIME_EDITION,
    complete: () => undefined,
    diagnostic: () => undefined,
    inputController: createPhase3InputController(),
    seed: 0,
  });
  assertNonEmptyCartridgeScene(config, missing);
  return cartridge;
}

describe("legacy traversal Phase 3 Shadow Gate Dungeon mechanics", () => {
  it("requires the accepted movement-to-gate traversal loop and deterministic input contract", async () => {
    const fixture = loadFixture("shadow-gate-dungeon");
    expect(fixture.mechanics.steps).toEqual([
      "bounded-movement",
      "creature-hazard",
      "ordered-crystals",
      "gate-transition",
    ]);
    expect(new Set(fixture.mechanics.steps).size).toBe(
      fixture.mechanics.steps.length,
    );
    expect(fixture.mechanics.capabilities.length).toBeGreaterThan(0);
    expect(new Set(fixture.mechanics.capabilities).size).toBe(
      fixture.mechanics.capabilities.length,
    );

    const keyboard = Object.fromEntries(
      Object.entries(fixture.mechanics.keyboard).map(([code, action]) => [
        code,
        action as InputActionId,
      ]),
    ) as Record<string, InputActionId>;
    expect(Object.keys(keyboard).length).toBeGreaterThan(0);
    const normalize = createInputActionNormalizer({ keyboard });
    for (const [code, action] of Object.entries(keyboard)) {
      expect(normalize({ modality: "keyboard", code })).toEqual([
        { action, edge: "press" },
      ]);
    }
    expect(normalize({ modality: "keyboard", code: "UnboundKey" })).toEqual([]);

    expect(fixture.mechanics.spawn_interval_ms).toBeGreaterThan(0);
    expect(fixture.mechanics.frame_delta_ms).toBeGreaterThan(0);
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
      fixture.mechanics.capabilities,
    );
    expect(new Set(cartridge.manifest.capabilities).size).toBe(
      cartridge.manifest.capabilities.length,
    );
  });
});
