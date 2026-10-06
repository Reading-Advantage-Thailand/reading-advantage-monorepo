/**
 * The one "2D mode (older phones)" setting of the Advantage Play Kit. The monorepo owns it in
 * `@reading-advantage/advantage-play-kit/responsive` (`renderer.ts`); the ported 3D games and the
 * Primary Advantage skin pages read the same value, so a student who picks 2D once gets 2D
 * everywhere. Forge keeps a byte copy for its demo and checks drift against it (OWNER_COPIES);
 * the port script lists this file as monorepo-owned, so a Forge release never overwrites it.
 */
export {
  RENDERER_SETTINGS_KEY,
  chooseRenderer,
  detectRenderer,
  readFlatMode,
  saveFlatMode,
} from "@reading-advantage/advantage-play-kit/responsive";
export type { Renderer, RendererInputs } from "@reading-advantage/advantage-play-kit/responsive";
