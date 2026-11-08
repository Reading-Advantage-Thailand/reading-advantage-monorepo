/**
 * The per-device record of finished parts (look task 2.3f).
 *
 * The app keeps no server progress row, so a finished part is a flag in `localStorage`: one JSON
 * object under `storytime:done`, keyed `<level>:<week>:<part>` with `true`. A blocked or full
 * store leaves the part unmarked and never throws.
 */

/** The localStorage key of the completion record. */
export const DONE_STORAGE_KEY = "storytime:done";

/**
 * Reports whether a part is finished on this device.
 * @param doneKey The `<level>:<week>:<part>` key.
 * @returns `true` when the record holds the key.
 */
export function isPartDone(doneKey: string): boolean {
  try {
    return JSON.parse(window.localStorage.getItem(DONE_STORAGE_KEY) ?? "{}")[doneKey] === true;
  } catch {
    return false;
  }
}

/**
 * Records a finished part on this device.
 * @param doneKey The `<level>:<week>:<part>` key; no key writes nothing.
 */
export function markPartDone(doneKey: string | undefined): void {
  if (!doneKey) return;
  try {
    const record = JSON.parse(window.localStorage.getItem(DONE_STORAGE_KEY) ?? "{}");
    record[doneKey] = true;
    window.localStorage.setItem(DONE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // A blocked store leaves the part unmarked.
  }
}
