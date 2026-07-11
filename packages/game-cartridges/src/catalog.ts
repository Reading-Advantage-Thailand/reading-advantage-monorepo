/**
 * Cartridge metadata intentionally withheld while the sprite asset ABI is rebuilt.
 * @returns No public cartridge entries.
 */
export function listCartridgeCatalog(): readonly never[] {
  return [];
}

/** Public cartridge catalog; intentionally empty until sprite-contract acceptance. */
export const cartridgeCatalog = listCartridgeCatalog();

/** Dynamic cartridge loaders; intentionally empty during the rebuild. */
export const cartridgeLoaders = {} as const;

/** No cartridge identifier is public while the catalog is quarantined. */
export type CartridgeId = never;

/**
 * Resolves no cartridge while the catalog is quarantined.
 * @param cartridgeId Untrusted cartridge identifier.
 * @returns Always undefined until a compliant cartridge is accepted.
 */
export function getCartridgeCatalogEntry(cartridgeId: string): undefined {
  void cartridgeId;
  return undefined;
}
