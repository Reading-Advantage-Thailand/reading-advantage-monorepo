/**
 * The 2D/3D selector of the skin (docs/primary-rpg-skin.md rule 5): the play kit's shared
 * "2D mode (older phones)" setting, so the pages and the ported games read one value.
 */
export { RENDERER_SETTINGS_KEY, chooseRenderer, detectRenderer, readFlatMode, saveFlatMode } from "@reading-advantage/advantage-play-kit/responsive";
export type { Renderer, RendererInputs } from "@reading-advantage/advantage-play-kit/responsive";
