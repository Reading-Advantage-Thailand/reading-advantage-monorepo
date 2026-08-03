"use client";

/** Explicit proof-only cartridge loaders; the package root remains catalog-free. */
export {
  loadDragonFlightHostProofCartridge,
  loadMagicDefenseHostProofCartridge,
  loadDungeonLiberatorHostProofCartridge,
  loadExistingCoreHostProofCartridge,
  isHostProofSourceBlocked,
  HostProofSourceBlockedError,
} from "@reading-advantage/game-cartridges/host-proof";
