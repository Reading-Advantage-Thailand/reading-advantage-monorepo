/** Cartridge manifest schema pinning the accepted canonical standard-pack release. */
export {
  ACCEPTED_STANDARD_PACK_BINDING,
  cartridgeManifestSchema,
  validateCartridgeManifest,
} from "./cartridge-manifest.js";
export type { CartridgeManifest } from "./cartridge-manifest.js";

/** Noninteractive cartridge scaffold generator. */
export {
  generateCartridgeScaffold,
} from "./scaffold.js";
export type {
  CartridgeScaffold,
  ScaffoldFile,
  ScaffoldOptions,
} from "./scaffold.js";

/** Representative exemplar cartridge built through public APK APIs. */
export {
  buildExemplarCartridgeDefinition,
  buildExemplarPublicApiSurface,
  EXEMPLAR_CARTRIDGE_ID,
  EXEMPLAR_SEMANTIC_ASSET_REQUIREMENTS,
  EXEMPLAR_XP_POLICY,
  runExemplarSimulation,
} from "./exemplar.js";
export type {
  ExemplarCartridgeDefinition,
  ExemplarPublicApiSurface,
  ExemplarSimulationOptions,
  ExemplarSimulationResult,
} from "./exemplar.js";
