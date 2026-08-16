import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createResponsiveTransitionCoordinator,
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  inspectCompositionGeometry,
  resolveResponsiveComposition,
  type GameInput,
  type RuntimeCartridge,
  type SupportedResponsiveComposition,
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
type ResponsiveFixture = {
  readonly evidence: Evidence;
  readonly compact: Readonly<{ width: number; height: number }>;
  readonly wide: Readonly<{ width: number; height: number }>;
  readonly strategy: string;
};
type TitleFixture = {
  readonly title_id: string;
  readonly input: unknown;
  readonly input_mode: "vocabulary" | "sentence";
  readonly responsive: ResponsiveFixture;
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
  composition?: SupportedResponsiveComposition,
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
    ...(composition ? { composition } : {}),
    seed: 0,
  });
  assertNonEmptyCartridgeScene(config, missing);
  return cartridge;
}

describe("legacy traversal Phase 3 Shadow Gate Dungeon responsive composition", () => {
  it("requires compact and wide composition with state-preserving reflow", async () => {
    const fixture = loadFixture("shadow-gate-dungeon");
    const compact = resolveResponsiveComposition({
      viewport: fixture.responsive.compact,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      inputCapabilities: { touch: true, pointer: false, keyboard: false },
      accessibility: { textScale: 1, touchScale: 1 },
      config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
    });
    expect(compact.supported).toBe(true);
    if (!compact.supported) throw new Error("Expected compact composition");
    expect(compact.profile).toBe("compact");
    expect(compact.strategy).toBe(fixture.responsive.strategy);
    expect(inspectCompositionGeometry(compact)).toEqual([]);

    const wide = resolveResponsiveComposition({
      viewport: fixture.responsive.wide,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      inputCapabilities: { touch: false, pointer: true, keyboard: true },
      accessibility: { textScale: 1, touchScale: 1 },
      config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
    });
    expect(wide.supported).toBe(true);
    if (!wide.supported) throw new Error("Expected wide composition");
    expect(wide.profile).toBe("wide");
    expect(wide.regions.gameplay.width).toBeGreaterThan(0);
    expect(inspectCompositionGeometry(wide)).toEqual([]);

    const calls: string[] = [];
    const state = { targetIndex: 1, score: 20 };
    const coordinator = createResponsiveTransitionCoordinator({
      captureState: () => ({ ...state }),
      restoreState: (snapshot) => {
        expect(snapshot).toEqual(state);
        calls.push("restore");
      },
      pause: () => calls.push("pause"),
      resume: () => calls.push("resume"),
      cancelGesture: () => calls.push("cancel"),
      recompose: (next) => {
        expect(next).toBe(wide);
        expect(next.safeRect).not.toEqual(compact.safeRect);
        calls.push("recompose");
      },
      diagnostic: (diagnostic) => {
        expect(diagnostic.code).toBe("RESPONSIVE_TRANSITION");
        expect(diagnostic.details).toMatchObject({
          oldProfile: "compact",
          newProfile: "wide",
        });
        calls.push("diagnostic");
      },
    });
    coordinator.transition(compact, wide, "resize");
    expect(calls).toEqual([
      "pause",
      "cancel",
      "recompose",
      "restore",
      "diagnostic",
      "resume",
    ]);

    await requireCartridge(
      fixture,
      fixture.responsive.evidence,
      `the cartridge must expose ${fixture.responsive.strategy} compact and wide composition and preserve its traversal state`,
      compact,
    );
  });
});
