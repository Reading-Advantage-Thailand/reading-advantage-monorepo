/** Small DOM helpers for HUD code. */

/** Escapes text for use inside HTML markup and attribute values. */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** True when the text has Thai letters (Thai text gets a larger size to read well). */
export const hasThai = (s: string): boolean => /[฀-๿]/.test(s);

/** A point on screen in CSS pixels relative to the stage canvas. */
export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}
