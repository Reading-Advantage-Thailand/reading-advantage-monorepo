import type { ResponsiveRuntimeOptions } from "@reading-advantage/advantage-play-kit/runtime";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG, resolveBrowserSafeAreaInsets } from "@reading-advantage/advantage-play-kit/responsive";

/** Responsive policy for public and authenticated arcade hosts. */
export const APK_HOST_RESPONSIVE_OPTIONS: ResponsiveRuntimeOptions = Object.freeze({
  config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  safeArea: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 }),
  resolveSafeArea: resolveBrowserSafeAreaInsets,
  inputCapabilities: Object.freeze({ touch: true, pointer: true, keyboard: true }),
  accessibility: Object.freeze({ textScale: 1, touchScale: 1 }),
});

/** Shared layout and control styles for the production arcade hosts. */
export const APK_HOST_LAYOUT_CLASS = [
  "min-w-0",
  "min-h-[calc(100svh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))]",
  "pb-[env(safe-area-inset-bottom)]",
  "[&_[data-apk-canvas-host]]:h-[min(844px,calc(100svh_-_140px_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)))]",
  "sm:[&_[data-apk-canvas-host]]:h-[min(560px,calc(100svh_-_140px_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)))]",
  "[&[data-apk-session-phase=tutorial]_[data-apk-canvas-host]]:h-[clamp(592px,calc(100svh_-_252px_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)),844px)]",
  "[&_[data-apk-canvas-host]_canvas]:h-auto",
  "[&_[data-apk-canvas-host]_canvas]:max-w-full",
  "[&_[data-apk-canvas-host]_canvas]:w-full",
  "[&_[data-apk-game-controls]]:mt-3",
  "[&_[data-apk-game-controls]]:mx-2",
  "[&_[data-apk-game-controls]]:flex",
  "[&_[data-apk-game-controls]]:flex-wrap",
  "[&_[data-apk-game-controls]]:gap-2",
  "[&_[data-apk-game-controls]_button]:min-h-12",
  "[&_[data-apk-game-controls]_button]:rounded-md",
  "[&_[data-apk-game-controls]_button]:border",
  "[&_[data-apk-game-controls]_button]:border-slate-600",
  "[&_[data-apk-game-controls]_button]:bg-slate-900",
  "[&_[data-apk-game-controls]_button]:px-3",
  "[&_[data-apk-game-controls]_button]:py-2",
  "[&_[data-apk-game-controls]_button]:text-sm",
  "[&_[data-apk-game-controls]_button]:font-semibold",
  "[&_[data-apk-game-controls]_button]:text-slate-100",
].join(" ");
