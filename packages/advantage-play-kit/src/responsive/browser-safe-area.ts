import type { SafeAreaInsets } from "./responsive-composition.js";

const ZERO_SAFE_AREA: SafeAreaInsets = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
const probes = new WeakMap<Document, HTMLDivElement>();

const finiteNonNegative = (value: string | number): number => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const finite = (value: number): number => Number.isFinite(value) ? value : 0;

const getProbe = (document: Document): HTMLDivElement | undefined => {
  const parent = document.body ?? document.documentElement;
  if (!parent) return undefined;
  let probe = probes.get(document);
  if (!probe) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    Object.assign(probe.style, {
      position: "fixed",
      visibility: "hidden",
      pointerEvents: "none",
      width: "0",
      height: "0",
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingRight: "env(safe-area-inset-right, 0px)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      paddingLeft: "env(safe-area-inset-left, 0px)",
    });
    probes.set(document, probe);
  }
  if (!probe.isConnected) parent.append(probe);
  return probe;
};

const overlap = (start: number, end: number, bandStart: number, bandEnd: number): number =>
  finiteNonNegative(Math.min(end, bandEnd) - Math.max(start, bandStart));

/**
 * Measures the browser safe area that still overlaps a game container.
 * @param container The game container whose local unsafe overlap is required.
 * @returns Finite nonnegative insets in container coordinates.
 */
export function resolveBrowserSafeAreaInsets(container: HTMLElement): SafeAreaInsets {
  const document = container.ownerDocument;
  const view = document.defaultView;
  const probe = view ? getProbe(document) : undefined;
  if (!view || !probe) return ZERO_SAFE_AREA;

  const styles = view.getComputedStyle(probe);
  const raw = {
    top: finiteNonNegative(styles.paddingTop),
    right: finiteNonNegative(styles.paddingRight),
    bottom: finiteNonNegative(styles.paddingBottom),
    left: finiteNonNegative(styles.paddingLeft),
  };
  const visualViewport = view.visualViewport;
  const viewportLeft = finiteNonNegative(visualViewport?.offsetLeft ?? 0);
  const viewportTop = finiteNonNegative(visualViewport?.offsetTop ?? 0);
  const viewportWidth = finiteNonNegative(visualViewport?.width ?? view.innerWidth);
  const viewportHeight = finiteNonNegative(visualViewport?.height ?? view.innerHeight);
  const viewportRight = viewportLeft + viewportWidth;
  const viewportBottom = viewportTop + viewportHeight;
  const rect = container.getBoundingClientRect();
  const left = finite(rect.left);
  const top = finite(rect.top);
  const width = finiteNonNegative(rect.width);
  const height = finiteNonNegative(rect.height);
  const right = left + width;
  const bottom = top + height;
  const horizontalScale = width > 0 && container.clientWidth > 0 ? container.clientWidth / width : 1;
  const verticalScale = height > 0 && container.clientHeight > 0 ? container.clientHeight / height : 1;

  return {
    top: overlap(top, bottom, viewportTop, viewportTop + raw.top) * verticalScale,
    right: overlap(left, right, viewportRight - raw.right, viewportRight) * horizontalScale,
    bottom: overlap(top, bottom, viewportBottom - raw.bottom, viewportBottom) * verticalScale,
    left: overlap(left, right, viewportLeft, viewportLeft + raw.left) * horizontalScale,
  };
}
