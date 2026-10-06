import type { CSSProperties } from "react";

const STANDARD_UI_ROOT = "/assets/apk/standard-pack-qc";

/** Public image paths used by the common retro arcade presentation. */
export const RETRO_ARCADE_UI_ASSETS = Object.freeze({
  primaryButton: `${STANDARD_UI_ROOT}/apk-ui-button-primary.png`,
  secondaryButton: `${STANDARD_UI_ROOT}/apk-ui-button-secondary.png`,
  squarePanel: `${STANDARD_UI_ROOT}/apk-ui-panel-square.png`,
});

/**
 * Nine-slice panel frame that keeps the source corners intact. A host theme replaces the frame
 * through CSS variables: `--apk-arcade-panel-image: none` with a border width and a radius gives
 * a plain framed panel in the host's colours.
 */
export const RETRO_ARCADE_PANEL_STYLE: CSSProperties = Object.freeze({
  border: "var(--apk-arcade-panel-border-width, 12px) solid var(--apk-arcade-panel-fallback, #31577d)",
  borderImageSource: `var(--apk-arcade-panel-image, url("${RETRO_ARCADE_UI_ASSETS.squarePanel}"))`,
  borderImageSlice: "16",
  borderImageWidth: "var(--apk-arcade-panel-border-width, 12px)",
  borderImageRepeat: "stretch",
  borderRadius: "var(--apk-arcade-panel-radius, 0)",
  boxSizing: "border-box",
  imageRendering: "pixelated",
});

/**
 * Creates a sliced arcade button style with a visible CSS fallback.
 * @param emphasis Visual priority for the button action.
 * @returns A button style that preserves the source end caps.
 */
export function getRetroArcadeButtonStyle(
  emphasis: "primary" | "secondary",
): CSSProperties {
  const primary = emphasis === "primary";
  return {
    minBlockSize: "48px",
    border: "var(--apk-arcade-button-border-width, 8px) solid var(--apk-arcade-button-fallback, #38bdf8)",
    // A host theme replaces the sliced caps with `--apk-arcade-button-primary-image: none` (and the secondary one).
    borderImageSource: primary
      ? `var(--apk-arcade-button-primary-image, url("${RETRO_ARCADE_UI_ASSETS.primaryButton}"))`
      : `var(--apk-arcade-button-secondary-image, url("${RETRO_ARCADE_UI_ASSETS.secondaryButton}"))`,
    borderImageSlice: primary ? "4 6 fill" : "4 6",
    borderImageWidth: "var(--apk-arcade-button-border-width, 8px) var(--apk-arcade-button-border-inline-width, 12px)",
    borderImageRepeat: "stretch",
    borderRadius: "var(--apk-arcade-button-radius, 0)",
    background: primary
      ? "var(--apk-arcade-primary-fallback, #22d3ee)"
      : "var(--apk-arcade-secondary-fallback, #081225)",
    boxSizing: "border-box",
    color: primary
      ? "var(--apk-arcade-primary-text, #04111f)"
      : "var(--apk-arcade-secondary-text, #f7f2d0)",
    imageRendering: "pixelated",
    lineHeight: 1.2,
    maxInlineSize: "100%",
    outlineOffset: "3px",
    overflowWrap: "anywhere",
    whiteSpace: "normal",
  };
}
