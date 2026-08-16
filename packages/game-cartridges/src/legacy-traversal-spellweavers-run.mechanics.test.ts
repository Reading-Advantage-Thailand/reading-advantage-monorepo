import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createBoundedFrameScheduler,
  createDeterministicSpawner,
  createInputActionNormalizer,
  type InputActionId,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit";
import { describe, expect, it } from "vitest";

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
  expect(cartridge.manifest.id, `${missing}; manifest id is absent`).toBe(
    fixture.title_id,
  );
  expect(cartridge.manifest.inputMode, `${missing}; input mode is absent`).toBe(
    fixture.input_mode,
  );
  return cartridge;
}

describe("legacy traversal Phase 3 Spellweaver's Run mechanics", () => {
  it("requires the accepted falling-orb lane loop and deterministic input contract", async () => {
    const fixture = loadFixture("spellweavers-run");
    expect(fixture.mechanics.steps).toEqual([
      "orb-scroll",
      "lane-collection",
      "ordered-sentence-result",
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
