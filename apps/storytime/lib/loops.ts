/**
 * The loops approval rule of a Storytime week (spec FR-13).
 *
 * The app reads the approval part on the server and in the question screen. The rule stays in a
 * small module with no schema import, so a client screen does not load the week contract.
 */

/** The name of the loops approval part. It is not one of the six approval parts. */
export const STORYTIME_LOOPS_PART = "loops";

/**
 * Tells whether the loops of a week are approved (spec FR-13).
 *
 * An absent loops part counts as a draft, so the app shows no routine for it. The rule reads the
 * week and never changes it.
 * @param week The week, or a value of another shape.
 * @returns `true` only when the loops part holds the status `approved`.
 */
export function loopsApproved(week: unknown): boolean {
  if (!week || typeof week !== "object") return false;
  const approval = (week as Record<string, unknown>).approval;
  if (!approval || typeof approval !== "object") return false;
  const loops = (approval as Record<string, unknown>)[STORYTIME_LOOPS_PART];
  if (!loops || typeof loops !== "object") return false;
  return (loops as Record<string, unknown>).status === "approved";
}
