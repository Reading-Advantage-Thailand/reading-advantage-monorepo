import type { ResponsiveRuntimeOptions } from "@reading-advantage/advantage-play-kit/runtime";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG } from "@reading-advantage/advantage-play-kit/responsive";

/** Compact and wide layout policy for the student APK host. */
export const APK_HOST_RESPONSIVE_OPTIONS: ResponsiveRuntimeOptions = Object.freeze({
  config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  safeArea: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 }),
  inputCapabilities: Object.freeze({ touch: true, pointer: true, keyboard: true }),
  accessibility: Object.freeze({ textScale: 1, touchScale: 1 }),
});

/** Shared layout classes for the student APK canvas. */
export const APK_HOST_LAYOUT_CLASS = [
  "min-w-0",
  "[&_[data-apk-canvas-host]]:h-[844px]",
  "sm:[&_[data-apk-canvas-host]]:h-[560px]",
  "[&_[data-apk-canvas-host]_canvas]:h-auto",
  "[&_[data-apk-canvas-host]_canvas]:max-w-full",
  "[&_[data-apk-canvas-host]_canvas]:w-full",
].join(" ");
