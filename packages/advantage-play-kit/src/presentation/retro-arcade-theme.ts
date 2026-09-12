import type { CSSProperties } from "react";

const STANDARD_UI_ROOT = "/assets/apk/standard-pack-qc";

/** Public image paths used by the common retro arcade presentation. */
export const RETRO_ARCADE_UI_ASSETS = Object.freeze({
  primaryButton: `${STANDARD_UI_ROOT}/apk-ui-button-primary.png`,
  secondaryButton: `${STANDARD_UI_ROOT}/apk-ui-button-secondary.png`,
  squarePanel: `${STANDARD_UI_ROOT}/apk-ui-panel-square.png`,
});

/** Nine-slice panel frame that keeps the source corners intact. */
export const RETRO_ARCADE_PANEL_STYLE: CSSProperties = Object.freeze({
  border: "12px solid var(--apk-arcade-panel-fallback, #31577d)",
  borderImageSource: `url("${RETRO_ARCADE_UI_ASSETS.squarePanel}")`,
  borderImageSlice: "16",
  borderImageWidth: "12px",
  borderImageRepeat: "stretch",
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
    border: "8px solid var(--apk-arcade-button-fallback, #38bdf8)",
    borderImageSource: `url("${primary
      ? RETRO_ARCADE_UI_ASSETS.primaryButton
      : RETRO_ARCADE_UI_ASSETS.secondaryButton}")`,
    borderImageSlice: primary ? "4 6 fill" : "4 6",
    borderImageWidth: "8px 12px",
    borderImageRepeat: "stretch",
    borderRadius: 0,
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
