import type {
  CartridgeCatalogEntry,
  GameCartridgeDefinition,
} from "./internal/types";

export { runnerWaveBlueprints } from "./runner-wave-blueprints";

/** Browser-safe public APK cartridge metadata. */
export const cartridgeCatalog = [
  {
    id: "dragon-flight",
    title: "Dragon Flight",
    description: "Choose the correct translation gate while racing forward.",
    inputMode: "vocabulary",
    mechanic: "gate-runner",
    editions: ["primary-chibi", "secondary-epic"],
  },
  {
    id: "dungeon-liberator",
    title: "Dungeon Liberator",
    description: "Collect word runes in order to rebuild each sentence.",
    inputMode: "sentence",
    mechanic: "sentence-order-collection",
    editions: ["primary-chibi", "secondary-epic"],
  },
  {
    id: "magic-defense",
    title: "Magic Defense",
    description: "Type translations to stop enemies before they reach the wall.",
    inputMode: "vocabulary",
    mechanic: "typing-defense",
    editions: ["primary-chibi", "secondary-epic"],
  },
  {
    id: "astral-mage",
    title: "Astral Mage",
    description: "Navigate the magical void and shoot word crystals in sentence order.",
    inputMode: "sentence",
    mechanic: "target-action",
    editions: ["primary-chibi", "secondary-epic"],
  },
  {
    id: "sorcerer-ziggurat",
    title: "The Sorcerer's Ziggurat",
    description: "Jump across adjacent rune cubes in the correct order to complete ancient rituals.",
    inputMode: "sentence",
    mechanic: "step-traversal",
    editions: ["primary-chibi", "secondary-epic"],
  },
  {
    id: "dragon-rider",
    title: "Dragon Rider",
    description: "Choose translation gates to assemble a dragon flight and defeat the boss.",
    inputMode: "vocabulary",
    mechanic: "two-lane-gate-traversal",
    editions: ["primary-chibi", "secondary-epic"],
  },
  {
    id: "spellweavers-run",
    title: "Spellweavers Run",
    description: "Collect approaching word orbs in order before the spell loses its mana.",
    inputMode: "sentence",
    mechanic: "three-lane-ordered-collector",
    editions: ["primary-chibi", "secondary-epic"],
  },
  {
    id: "griffin-riders-escape",
    title: "Griffin Riders Escape",
    description: "Switch lanes to clear ordered word gates and evade sky obstacles.",
    inputMode: "sentence",
    mechanic: "three-lane-perspective-gates",
    editions: ["primary-chibi", "secondary-epic"],
  },
  {
    id: "storm-castle-tower",
    title: "Storm Castle Tower",
    description: "Climb ordered word windows while avoiding falling tower hazards.",
    inputMode: "sentence",
    mechanic: "vertical-ordered-traversal",
    editions: ["primary-chibi", "secondary-epic"],
  },
] as const satisfies readonly CartridgeCatalogEntry[];

/** Literal dynamic imports that keep unused Phaser cartridges out of host entry bundles. */
export const cartridgeLoaders = {
  "dragon-flight": () =>
    import("./gate-runner").then(
      ({ dragonFlightCartridge }) => dragonFlightCartridge,
    ),
  "dungeon-liberator": () =>
    import("./sentence-collector").then(
      ({ dungeonLiberatorCartridge }) => dungeonLiberatorCartridge,
    ),
  "magic-defense": () =>
    import("./typing-defense").then(
      ({ magicDefenseCartridge }) => magicDefenseCartridge,
    ),
  "astral-mage": () =>
    import("./cartridges/astral-mage").then(
      ({ astralMageCartridge }) => astralMageCartridge,
    ),
  "sorcerer-ziggurat": () =>
    import("./cartridges/sorcerer-ziggurat").then(
      ({ sorcererZigguratCartridge }) => sorcererZigguratCartridge,
    ),
  "dragon-rider": () =>
    import("./cartridges/dragon-rider").then(
      ({ dragonRiderCartridge }) => dragonRiderCartridge,
    ),
  "spellweavers-run": () =>
    import("./cartridges/spellweavers-run").then(
      ({ spellweaversRunCartridge }) => spellweaversRunCartridge,
    ),
  "griffin-riders-escape": () =>
    import("./cartridges/griffin-riders-escape").then(
      ({ griffinRidersEscapeCartridge }) => griffinRidersEscapeCartridge,
    ),
  "storm-castle-tower": () =>
    import("./cartridges/storm-castle-tower").then(
      ({ stormCastleTowerCartridge }) => stormCastleTowerCartridge,
    ),
} satisfies Record<
  (typeof cartridgeCatalog)[number]["id"],
  () => Promise<GameCartridgeDefinition>
>;

/** Stable cartridge identifier accepted by shared host registries. */
export type CartridgeId = keyof typeof cartridgeLoaders;

/** Finds browser-safe metadata without importing cartridge gameplay code.
 * @param cartridgeId Stable cartridge identifier from a route or host registry.
 * @returns Matching catalog metadata, or undefined for an unknown ID.
 */
export function getCartridgeCatalogEntry(
  cartridgeId: string,
): (typeof cartridgeCatalog)[number] | undefined {
  return cartridgeCatalog.find((entry) => entry.id === cartridgeId);
}
