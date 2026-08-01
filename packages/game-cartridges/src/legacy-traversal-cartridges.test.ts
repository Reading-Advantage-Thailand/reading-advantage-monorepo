import { describe, expect, it, vi } from "vitest";

import { inspectCompositionGeometry } from "@reading-advantage/advantage-play-kit/responsive";

import {
  DRAGON_RIDER_TRAVERSAL_CARTRIDGE,
  createDragonRiderTraversalMechanic,
} from "./dragon-rider-cartridge.js";
import {
  GRIFFIN_RIDERS_ESCAPE_TRAVERSAL_CARTRIDGE,
  createGriffinRidersEscapeTraversalMechanic,
} from "./griffin-riders-escape-cartridge.js";
import {
  LABYRINTH_GOBLIN_KING_TRAVERSAL_CARTRIDGE,
  createLabyrinthGoblinKingTraversalMechanic,
} from "./labyrinth-goblin-king-cartridge.js";
import {
  SHADOW_GATE_DUNGEON_TRAVERSAL_CARTRIDGE,
  createShadowGateDungeonTraversalMechanic,
} from "./shadow-gate-dungeon-cartridge.js";
import {
  SPELLWEAVERS_RUN_TRAVERSAL_CARTRIDGE,
  createSpellweaversRunTraversalMechanic,
} from "./spellweavers-run-cartridge.js";

const vocabulary = [{ term: "fire wing", translation: "ปีกไฟ" }];
const sentences = [
  { term: "moon path", translation: "เส้นทางดวงจันทร์" },
  { term: "silver gate", translation: "ประตูเงิน" },
];

const cartridges = [
  DRAGON_RIDER_TRAVERSAL_CARTRIDGE,
  SPELLWEAVERS_RUN_TRAVERSAL_CARTRIDGE,
  SHADOW_GATE_DUNGEON_TRAVERSAL_CARTRIDGE,
  LABYRINTH_GOBLIN_KING_TRAVERSAL_CARTRIDGE,
  GRIFFIN_RIDERS_ESCAPE_TRAVERSAL_CARTRIDGE,
] as const;

describe("legacy traversal public-API cartridges", () => {
  it.each(cartridges)("pins selected canonical assets and T11 responsive/input APIs for $manifest.id", (cartridge) => {
    expect(cartridge.manifest.selectedUnionMaterialization).toBe("accepted-cartridge-selected-union-only");
    expect(cartridge.manifest.semanticAssetRequirements.length).toBeGreaterThan(0);
    expect(JSON.stringify(cartridge.manifest.semanticAssetRequirements)).not.toMatch(/\.(?:png|ogg|mp3|wav)\b|apps\/|legacy\//iu);
    expect(cartridge.manifest.qcRegistration.route).toBe("/qc");
    expect(cartridge.manifest.responsive).toMatchObject({
      profiles: ["compact", "wide"],
      statePreservation: "capture-recompose-restore",
    });
    expect(cartridge.inputSupport).toEqual({ keyboard: true, pointer: true, touch: true });

    const compact = cartridge.compose({ width: 390, height: 844 });
    const wide = cartridge.compose({ width: 1440, height: 900 });
    expect(compact.supported && compact.profile).toBe("compact");
    expect(wide.supported && wide.profile).toBe("wide");
    if (compact.supported) expect(inspectCompositionGeometry(compact)).toEqual([]);
    if (wide.supported) expect(inspectCompositionGeometry(wide)).toEqual([]);

    expect(cartridge.normalizeInput({ modality: "keyboard", code: "ArrowRight" })).toEqual([
      { action: "move-right", edge: "press" },
    ]);
    expect(cartridge.normalizeInput({ modality: "pointer", phase: "drag", x: 120, y: 160, deltaX: -48 })).toEqual([
      { action: "move-left", edge: "press" },
    ]);
    expect(cartridge.normalizeInput({ modality: "pointer", phase: "down", x: 120, y: 160 })).toEqual([
      { action: "confirm", edge: "press" },
    ]);
    expect(cartridge.normalizeInput({ modality: "pointer", phase: "up", x: 120, y: 160 })).toEqual([
      { action: "confirm", edge: "release" },
    ]);
  });

  it("preserves each title's mechanic state across compact-to-wide resize QC", () => {
    const dragon = createDragonRiderTraversalMechanic(vocabulary);
    dragon.selectGate("right");
    const spellweaver = createSpellweaversRunTraversalMechanic(sentences);
    spellweaver.collectOrb("moon");
    const shadowGate = createShadowGateDungeonTraversalMechanic(sentences);
    shadowGate.collectCrystal("moon");
    const labyrinth = createLabyrinthGoblinKingTraversalMechanic(sentences);
    labyrinth.collectOrb("moon");
    const griffin = createGriffinRidersEscapeTraversalMechanic(sentences);
    griffin.passGate("moon");

    const snapshots = [
      dragon.snapshot(),
      spellweaver.snapshot(),
      shadowGate.snapshot(),
      labyrinth.snapshot(),
      griffin.snapshot(),
    ];
    for (const cartridge of cartridges) {
      cartridge.compose({ width: 390, height: 844 });
      cartridge.compose({ width: 1440, height: 900 });
    }
    expect([
      dragon.snapshot(),
      spellweaver.snapshot(),
      shadowGate.snapshot(),
      labyrinth.snapshot(),
      griffin.snapshot(),
    ]).toEqual(snapshots);
  });

  it("keeps Dragon Rider gate choice, dragon growth, and boss transition deterministic", () => {
    const complete = vi.fn();
    const mechanic = createDragonRiderTraversalMechanic(vocabulary, complete);
    mechanic.selectGate("right");
    mechanic.advanceTime(60);
    mechanic.selectGate("left");
    mechanic.advanceTime(150_000);
    mechanic.complete();
    mechanic.complete();

    expect(mechanic.snapshot()).toMatchObject({ attempts: 2, correctAnswers: 1, dragonCount: 1, phase: "boss" });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("retains the cited timed gate-to-boss path rather than making a direct boss shortcut", () => {
    const mechanic = createDragonRiderTraversalMechanic(vocabulary);

    mechanic.advanceTime(150_000);

    expect(mechanic.snapshot()).toMatchObject({
      phase: "boss",
      elapsedMs: 150_000,
      claimIds: expect.arrayContaining(["DR-TRANS-001", "DR-TRANS-003"]),
    });
  });

  it("keeps Spellweaver's Run ordered lane-orb sentence construction and mana penalty deterministic", () => {
    const complete = vi.fn();
    const mechanic = createSpellweaversRunTraversalMechanic(sentences, complete);
    mechanic.collectOrb("decoy");
    mechanic.collectOrb("moon");
    mechanic.collectOrb("path");
    mechanic.collectOrb("silver");
    mechanic.collectOrb("gate");

    expect(mechanic.snapshot()).toMatchObject({ mana: 80, correctAnswers: 4, sentencesCompleted: 2, phase: "victory" });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("models Spellweaver lane spawning, fixed logical projection, and collection-zone gating", () => {
    const mechanic = createSpellweaversRunTraversalMechanic(sentences);

    mechanic.selectLane("left");
    mechanic.advanceTime(3_000);

    expect(mechanic.snapshot()).toMatchObject({
      lane: "left",
      camera: { mode: "fixed-logical-projection" },
      claimIds: expect.arrayContaining(["SW-MOVE-002", "SW-COLL-001", "SW-STATE-005"]),
    });
    expect(mechanic.collectLane()).toBe(true);
  });

  it("keeps Shadow Gate's ordered crystal path, gate unlock, and danger penalty deterministic", () => {
    const mechanic = createShadowGateDungeonTraversalMechanic(sentences);
    mechanic.collectCrystal("silver");
    mechanic.collectCrystal("moon");
    mechanic.collectCrystal("path");
    mechanic.collectCrystal("silver");
    mechanic.collectCrystal("gate");

    expect(mechanic.snapshot()).toMatchObject({ health: 80, correctAnswers: 4, gateUnlocked: true, phase: "escaped" });
  });

  it("models cited Shadow Gate movement bounds, creature chase, and collision penalties", () => {
    const mechanic = createShadowGateDungeonTraversalMechanic(sentences);

    mechanic.move({ x: 1, y: 0 }, 500);
    mechanic.setCreaturePosition({ x: 100, y: 100 });
    mechanic.setPlayerPosition({ x: 100, y: 100 });
    mechanic.advanceTime(16);

    expect(mechanic.snapshot()).toMatchObject({
      creatureMode: "chase",
      health: 75,
      claimIds: expect.arrayContaining(["SGD-MOVE-001", "SGD-STEALTH-002", "SGD-COLL-001"]),
    });
  });

  it("keeps Goblin King ordered orbs, life loss, and heroic-aura transition deterministic", () => {
    const complete = vi.fn();
    const mechanic = createLabyrinthGoblinKingTraversalMechanic(sentences, complete);
    mechanic.collectOrb("gate");
    mechanic.collectOrb("moon");
    mechanic.collectOrb("path");
    mechanic.collectOrb("silver");
    mechanic.collectOrb("gate");
    mechanic.collectOrb("gate");

    expect(mechanic.snapshot()).toMatchObject({ lives: 2, correctAnswers: 4, heroicAura: true, goblinsFlee: true, phase: "victory" });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("models the cited maze walls, goblin behavior, and non-terminal empowered transition", () => {
    const mechanic = createLabyrinthGoblinKingTraversalMechanic(sentences);

    mechanic.collectOrb("moon");
    mechanic.collectOrb("path");

    expect(mechanic.snapshot()).toMatchObject({
      heroicAura: true,
      goblinsFlee: true,
      maze: { columns: 11, rows: 15 },
      claimIds: expect.arrayContaining(["LGK-MAZE-001", "LGK-GOBLIN-001", "LGK-TRANS-001"]),
    });
  });

  it("keeps Griffin Rider lane gates, obstacle loss, and ordered sentence escape deterministic", () => {
    const complete = vi.fn();
    const mechanic = createGriffinRidersEscapeTraversalMechanic(sentences, complete);
    mechanic.switchLane("right");
    mechanic.passGate("moon");
    mechanic.hitObstacle();
    mechanic.passGate("path");
    mechanic.passGate("silver");
    mechanic.passGate("gate");
    mechanic.passGate("gate");

    expect(mechanic.snapshot()).toMatchObject({ lane: "right", hearts: 2, correctAnswers: 4, sentencesCompleted: 2, phase: "escaped" });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("models Griffin's cited z-wave, perspective projection, and collision plane", () => {
    const mechanic = createGriffinRidersEscapeTraversalMechanic(sentences);

    mechanic.advanceTime(2_000);
    mechanic.switchLane("left");
    mechanic.advanceTime(20_000);

    expect(mechanic.snapshot()).toMatchObject({
      perspective: { horizonY: 200, playerY: 700 },
      claimIds: expect.arrayContaining(["GRF-WAVE-001", "GRF-COLL-001", "GRF-RESP-001"]),
    });
  });

  it("rejects empty playable content for every title", () => {
    expect(() => createDragonRiderTraversalMechanic([])).toThrow(/nonempty/i);
    expect(() => createSpellweaversRunTraversalMechanic([])).toThrow(/nonempty/i);
    expect(() => createShadowGateDungeonTraversalMechanic([])).toThrow(/nonempty/i);
    expect(() => createLabyrinthGoblinKingTraversalMechanic([])).toThrow(/nonempty/i);
    expect(() => createGriffinRidersEscapeTraversalMechanic([])).toThrow(/nonempty/i);
  });
});
