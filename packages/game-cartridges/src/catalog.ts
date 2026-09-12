import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

/** Public metadata for one loadable cartridge. */
export interface CartridgeCatalogEntry {
  /** Stable cartridge identifier. */
  readonly id: string;
  /** Human-readable cartridge title. */
  readonly title: string;
  /** Short description shown by a host catalog. */
  readonly description: string;
  /** Runtime API version required by the cartridge. */
  readonly runtimeApiVersion: string;
  /** Educational input mode accepted by the cartridge. */
  readonly inputMode: "vocabulary" | "sentence";
  /** Semantic asset bindings required by the cartridge. */
  readonly requiredAssetBindings: readonly string[];
  /** Shared capability families used by the cartridge. */
  readonly capabilities: readonly string[];
}

const DRAGON_FLIGHT_CATALOG_ENTRY: CartridgeCatalogEntry = Object.freeze({
  id: "dragon-flight",
  title: "Dragon Flight",
  description: "Choose English gates, grow the dragon flock, and face the guardian.",
  runtimeApiVersion: "1.0.0",
  inputMode: "vocabulary",
  requiredAssetBindings: Object.freeze([]),
  capabilities: Object.freeze([
    "capability:bounded-frame-delta",
    "capability:input-action-normalization",
    "capability:language-target-progression",
    "capability:nonempty-content-precondition",
    "capability:result-accounting",
    "capability:single-completion-emission",
    "capability:time-and-frame-loop",
  ]),
});

const ASTRAL_MAGE_CATALOG_ENTRY: CartridgeCatalogEntry = Object.freeze({
  id: "astral-mage",
  title: "Astral Mage",
  description: "Move a mage through a star arena and cast sentence words in order.",
  runtimeApiVersion: "1.0.0",
  inputMode: "sentence",
  requiredAssetBindings: Object.freeze([]),
  capabilities: Object.freeze([
    "capability:bounded-frame-delta",
    "capability:input-action-normalization",
    "capability:language-target-progression",
    "capability:nonempty-content-precondition",
    "capability:result-accounting",
    "capability:single-completion-emission",
  ]),
});

const SORCERER_ZIGGURAT_CATALOG_ENTRY: CartridgeCatalogEntry = Object.freeze({
  id: "sorcerer-ziggurat",
  title: "The Sorcerer's Ziggurat",
  description: "Climb adjacent rune cubes to rebuild each sentence in order.",
  runtimeApiVersion: "1.0.0",
  inputMode: "sentence",
  requiredAssetBindings: Object.freeze([]),
  capabilities: Object.freeze([
    "capability:bounded-frame-delta",
    "capability:input-action-normalization",
    "capability:language-target-progression",
    "capability:nonempty-content-precondition",
    "capability:result-accounting",
    "capability:single-completion-emission",
  ]),
});

const LEGACY_TRAVERSAL_CATALOG: readonly CartridgeCatalogEntry[] = Object.freeze([
  Object.freeze({
    id: "dragon-rider",
    title: "Dragon Rider",
    description: "Choose English gates, grow the dragon flock, and face the guardian.",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    requiredAssetBindings: Object.freeze(["dragon-rider/player-flight"]),
    capabilities: Object.freeze([
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:time-and-frame-loop",
    ]),
  }),
  Object.freeze({
    id: "spellweavers-run",
    title: "Spellweaver's Run",
    description: "Change lanes to collect falling word orbs in sentence order.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["spellweavers-run/player-lane"]),
    capabilities: Object.freeze([
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:time-and-frame-loop",
    ]),
  }),
  Object.freeze({
    id: "shadow-gate-dungeon",
    title: "Shadow Gate Dungeon",
    description: "Explore the dungeon and collect ordered word crystals before opening the gate.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["shadow-gate-dungeon/player"]),
    capabilities: Object.freeze([
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:time-and-frame-loop",
    ]),
  }),
  Object.freeze({
    id: "labyrinth-goblin-king",
    title: "Labyrinth of the Goblin King",
    description: "Navigate the maze, collect ordered word orbs, and avoid goblin hazards.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["labyrinth-goblin-king/player"]),
    capabilities: Object.freeze([
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:time-and-frame-loop",
    ]),
  }),
  Object.freeze({
    id: "griffin-riders-escape",
    title: "Griffin Rider's Escape",
    description: "Switch sky lanes and pass through sentence gates in order.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["griffin-riders-escape/player-lane"]),
    capabilities: Object.freeze([
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:time-and-frame-loop",
    ]),
  }),
]);

const LEGACY_CATALOG_COMPLETION: readonly CartridgeCatalogEntry[] = Object.freeze([
  Object.freeze({
    id: "castle-defense",
    title: "Castle Defense",
    description: "Build a castle defense by placing sentence words in order.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["legacy-catalog/castle-defense/fortress"]),
    capabilities: Object.freeze([
      "capability:four-direction-defense",
      "capability:sentence-chain-reset",
      "capability:castle-health-hazards",
    ]),
  }),
  Object.freeze({
    id: "magic-defense",
    title: "Magic Defense",
    description: "Choose translation lanes to protect the castle from incoming magic.",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    requiredAssetBindings: Object.freeze(["legacy-catalog/magic-defense/arcane-castle"]),
    capabilities: Object.freeze([
      "capability:three-answer-lanes",
      "capability:spell-energy-cost",
      "capability:castle-ward-hazards",
    ]),
  }),
  Object.freeze({
    id: "rpg-battle",
    title: "RPG Battle",
    description: "Defeat a fantasy enemy by translating vocabulary in a turn-based duel.",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    requiredAssetBindings: Object.freeze(["legacy-catalog/rpg-battle/arena"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:typed-translation-buffer",
      "capability:turn-based-counterattack",
      "capability:responsive-battle-state",
    ]),
  }),
  Object.freeze({
    id: "wizard-vs-zombie",
    title: "Wizard vs Zombie",
    description: "Match Thai words to their English meanings while you avoid zombies.",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    requiredAssetBindings: Object.freeze(["legacy-catalog/wizard-vs-zombie/zombie-orbs"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:orb-lane-collection",
      "capability:shockwave-energy-charge",
      "capability:zombie-hazard-pressure",
    ]),
  }),
  Object.freeze({
    id: "enchanted-library",
    title: "Enchanted Library",
    description: "Match Thai prompts with English books, restore mana, and protect the stacks from spirits.",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    requiredAssetBindings: Object.freeze(["enchanted-library/arcane-shelves"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:book-collision-collection",
      "capability:four-way-library-movement",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:library-shield",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:spirit-mana-hazard",
      "capability:time-and-frame-loop",
    ]),
  }),
  Object.freeze({
    id: "rune-match",
    title: "Rune Match",
    description: "Match adjacent vocabulary runes to defeat a monster.",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    requiredAssetBindings: Object.freeze(["rune-match/monster-rune-board"]),
    capabilities: Object.freeze([
      "capability:deterministic-rune-board",
      "capability:cursor-and-pointer-selection",
      "capability:language-target-progression",
      "capability:monster-counterattack",
      "capability:power-rune-effects",
      "capability:result-accounting",
      "capability:single-completion-emission",
    ]),
  }),
  Object.freeze({
    id: "alchemists-synthesis",
    title: "Alchemist's Synthesis",
    description: "Select the term that matches each translation before the cauldron cools.",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    requiredAssetBindings: Object.freeze(["alchemists-synthesis/alchemy-vessel"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:timed-multiple-choice",
    ]),
  }),
  Object.freeze({
    id: "potion-rush",
    title: "Potion Rush",
    description: "Brew sentence ingredients in order and serve the waiting customers.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["potion-rush/customer-cauldron"]),
    capabilities: Object.freeze([
      "capability:cauldron-brewing",
      "capability:deterministic-customer-queue",
      "capability:conveyor-ingredients",
      "capability:spoiled-cauldron-dump",
      "capability:matching-customer-service",
      "capability:patience-reputation",
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
    ]),
  }),
  Object.freeze({
    id: "dungeon-liberator",
    title: "Dungeon Liberator",
    description: "Move through a torchlit dungeon and rescue sentence prisoners in order.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["dungeon-liberator/prisoner-rescue"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:four-way-player-movement",
      "capability:positioned-prisoner-collision",
      "capability:ordered-rescue-trail",
      "capability:monster-collision-effects",
      "capability:portal-gated-sentence-transition",
    ]),
  }),
  Object.freeze({
    id: "rune-forge-chamber",
    title: "Rune Forge Chamber",
    description: "Forge ordered sentence words as orbiting runes inside a living chamber.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["rune-forge-chamber/orbiting-sigils"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:orbiting-rune-selection",
    ]),
  }),
  Object.freeze({
    id: "village-guardian",
    title: "Village Guardian",
    description: "Guide ordered villagers through danger and into sanctuary.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["village-guardian/sanctuary-guide"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:four-way-guardian-movement",
      "capability:ordered-villager-trail",
      "capability:wrong-villager-hide-penalty",
      "capability:monster-trail-disruption",
      "capability:sanctuary-level-progression",
    ]),
  }),
  Object.freeze({
    id: "abyssal-well",
    title: "The Abyssal Well",
    description: "Rotate around a dark well and shoot ordered word enemies before they reach the rim.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["abyssal-well/rim-and-enemies"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:projectile-collision",
      "capability:radial-lane-rotation",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:touch-control-zones",
      "capability:wrong-enemy-removal",
    ]),
  }),
  Object.freeze({
    id: "archers-revenge",
    title: "Archer's Revenge",
    description: "Aim a precision archer at the translation target and break enemy formations.",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    requiredAssetBindings: Object.freeze(["archers-revenge/player-bow"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:formation-edge-reversal",
      "capability:formation-shooter",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:projectile-collision",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:timed-target-rotation",
    ]),
  }),
  Object.freeze({
    id: "storm-castle-tower",
    title: "Storm the Castle Tower",
    description: "Climb a four-column castle tower and collect sentence windows while oil and rocks fall.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["storm-castle-tower/player-climber"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:camera-follow",
      "capability:deterministic-hazards",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
    ]),
  }),
  Object.freeze({
    id: "griffin-sky-joust",
    title: "Griffin Sky-Joust",
    description: "Ride a griffin through the clouds and strike airborne word knights in sentence order.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["griffin-sky-joust/player-griffin"]),
    capabilities: Object.freeze([
      "capability:aerial-physics",
      "capability:moving-word-knights",
      "capability:collision-classification",
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
    ]),
  }),
  Object.freeze({
    id: "realm-carver",
    title: "Realm Carver",
    description: "Carve safe territory through wild magic and capture sentence words in order.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["realm-carver/player-carver"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:bounded-territory-grid",
      "capability:territory-trail-capture",
      "capability:monster-trail-hazard",
    ]),
  }),
  Object.freeze({
    id: "paladins-twin-soul",
    title: "Paladin's Twin-Soul",
    description: "Move a paladin beneath a vocabulary formation and rescue the captured twin.",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    requiredAssetBindings: Object.freeze(["paladins-twin-soul/player"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:deterministic-enemy-formation",
      "capability:timed-auto-fire",
      "capability:twin-soul-rescue",
      "capability:enemy-projectiles",
    ]),
  }),
  Object.freeze({
    id: "devourer-slime",
    title: "Devourer Slime",
    description: "Eat ordered words, grow larger, and overpower the knights in your path.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["devourer-slime/player"]),
    capabilities: Object.freeze([
      "capability:four-way-movement",
      "capability:ordered-word-orbs",
      "capability:slime-growth",
      "capability:knight-size-collisions",
      "capability:bounded-frame-delta",
      "capability:single-completion-emission",
    ]),
  }),
  Object.freeze({
    id: "haunted-library",
    title: "The Haunted Library",
    description: "Open ordered word doors across haunted library floors while avoiding ghosts and bats.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["haunted-library/player"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:gravity-jump-traversal",
      "capability:edge-trampoline-floor-traversal",
      "capability:host-seeded-placements",
      "capability:horizontal-wrap",
      "capability:ordered-word-doors",
      "capability:ghost-stun",
      "capability:bat-hazards",
      "capability:invulnerability-window",
      "capability:input-action-normalization",
      "capability:result-accounting",
      "capability:single-completion-emission",
    ]),
  }),
  Object.freeze({
    id: "gryphon-patrol",
    title: "Gryphon Patrol",
    description: "Fly a gryphon through a wrapped sky, shoot word-marked enemies, and collect their orbs.",
    runtimeApiVersion: "1.0.0",
    inputMode: "sentence",
    requiredAssetBindings: Object.freeze(["gryphon-patrol/player"]),
    capabilities: Object.freeze([
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:horizontal-world-wrap",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:projectile-collision",
      "capability:result-accounting",
      "capability:single-completion-emission",
    ]),
  }),
]);

const PUBLIC_CARTRIDGE_CATALOG = Object.freeze([
  DRAGON_FLIGHT_CATALOG_ENTRY,
  ASTRAL_MAGE_CATALOG_ENTRY,
  SORCERER_ZIGGURAT_CATALOG_ENTRY,
  ...LEGACY_TRAVERSAL_CATALOG,
  ...LEGACY_CATALOG_COMPLETION,
]);

/**
 * Lists public cartridge metadata in stable display order.
 * @returns The immutable public cartridge catalog.
 */
export function listCartridgeCatalog(): readonly CartridgeCatalogEntry[] {
  return PUBLIC_CARTRIDGE_CATALOG;
}

/** Public cartridge catalog. */
export const cartridgeCatalog = listCartridgeCatalog();

/** Lazily resolves each public cartridge so catalog reads do not load Phaser code. */
export const cartridgeLoaders = Object.freeze({
  "dragon-flight": async (): Promise<StandardExperienceCartridge> =>
    (await import("./dragon-flight.js")).createDragonFlightCartridge(),
  "astral-mage": async (): Promise<StandardExperienceCartridge> =>
    (await import("./astral-mage.js")).createAstralMageCartridge(),
  "sorcerer-ziggurat": async (): Promise<StandardExperienceCartridge> =>
    (await import("./sorcerer-ziggurat.js")).createSorcererZigguratCartridge(),
  "dragon-rider": async (): Promise<StandardExperienceCartridge> =>
    (await import("./dragon-flight.js")).createDragonRiderCartridge(),
  "spellweavers-run": async (): Promise<StandardExperienceCartridge> =>
    (await import("./spellweavers-run.js")).createSpellweaversRunCartridge(),
  "shadow-gate-dungeon": async (): Promise<StandardExperienceCartridge> =>
    (await import("./shadow-gate-dungeon.js")).createShadowGateDungeonCartridge(),
  "labyrinth-goblin-king": async (): Promise<StandardExperienceCartridge> =>
    (await import("./labyrinth-goblin-king.js")).createLabyrinthGoblinKingCartridge(),
  "griffin-riders-escape": async (): Promise<StandardExperienceCartridge> =>
    (await import("./legacy-traversal-cartridges.js")).createGriffinRidersEscapeCartridge(),
  "castle-defense": async (): Promise<StandardExperienceCartridge> =>
    (await import("./castle-defense.js")).createCastleDefenseCartridge(),
  "magic-defense": async (): Promise<StandardExperienceCartridge> =>
    (await import("./magic-defense.js")).createMagicDefenseCartridge(),
  "rpg-battle": async (): Promise<StandardExperienceCartridge> =>
    (await import("./rpg-battle.js")).createRpgBattleCartridge(),
  "wizard-vs-zombie": async (): Promise<StandardExperienceCartridge> =>
    (await import("./wizard-vs-zombie.js")).createWizardVsZombieCartridge(),
  "enchanted-library": async (): Promise<StandardExperienceCartridge> =>
    (await import("./enchanted-library.js")).createEnchantedLibraryCartridge(),
  "rune-match": async (): Promise<StandardExperienceCartridge> =>
    (await import("./rune-match.js")).createRuneMatchCartridge(),
  "alchemists-synthesis": async (): Promise<StandardExperienceCartridge> =>
    (await import("./alchemists-synthesis.js")).createAlchemistsSynthesisCartridge(),
  "potion-rush": async (): Promise<StandardExperienceCartridge> =>
    (await import("./potion-rush.js")).createPotionRushCartridge(),
  "dungeon-liberator": async (): Promise<StandardExperienceCartridge> =>
    (await import("./dungeon-liberator.js")).createDungeonLiberatorCartridge(),
  "rune-forge-chamber": async (): Promise<StandardExperienceCartridge> =>
    (await import("./rune-forge-chamber.js")).createRuneForgeChamberCartridge(),
  "village-guardian": async (): Promise<StandardExperienceCartridge> =>
    (await import("./village-guardian.js")).createVillageGuardianCartridge(),
  "abyssal-well": async (): Promise<StandardExperienceCartridge> =>
    (await import("./abyssal-well.js")).createAbyssalWellCartridge(),
  "archers-revenge": async (): Promise<StandardExperienceCartridge> =>
    (await import("./archers-revenge.js")).createArchersRevengeCartridge(),
  "storm-castle-tower": async (): Promise<StandardExperienceCartridge> =>
    (await import("./storm-castle-tower.js")).createStormCastleTowerCartridge(),
  "griffin-sky-joust": async (): Promise<StandardExperienceCartridge> =>
    (await import("./griffin-sky-joust.js")).createGriffinSkyJoustCartridge(),
  "realm-carver": async (): Promise<StandardExperienceCartridge> =>
    (await import("./realm-carver.js")).createRealmCarverCartridge(),
  "paladins-twin-soul": async (): Promise<StandardExperienceCartridge> =>
    (await import("./paladins-twin-soul.js")).createPaladinsTwinSoulCartridge(),
  "devourer-slime": async (): Promise<StandardExperienceCartridge> =>
    (await import("./devourer-slime.js")).createDevourerSlimeCartridge(),
  "haunted-library": async (): Promise<StandardExperienceCartridge> =>
    (await import("./haunted-library.js")).createHauntedLibraryCartridge(),
  "gryphon-patrol": async (): Promise<StandardExperienceCartridge> =>
    (await import("./gryphon-patrol.js")).createGryphonPatrolCartridge(),
});

/** Public cartridge identifiers. */
export type CartridgeId = keyof typeof cartridgeLoaders;

/**
 * Finds public metadata for a cartridge identifier.
 * @param cartridgeId Untrusted cartridge identifier.
 * @returns The matching catalog entry, or undefined for an unknown identifier.
 */
export function getCartridgeCatalogEntry(
  cartridgeId: string,
): CartridgeCatalogEntry | undefined {
  return cartridgeCatalog.find((entry) => entry.id === cartridgeId);
}
