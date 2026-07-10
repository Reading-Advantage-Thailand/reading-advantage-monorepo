import type {
  CartridgeCatalogEntry,
  GameCartridgeDefinition,
} from "./internal/types";

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
