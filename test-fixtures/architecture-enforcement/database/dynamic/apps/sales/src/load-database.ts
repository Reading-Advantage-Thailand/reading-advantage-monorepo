/**
 * Loads the database package through a static-string dynamic import.
 * @returns Imported database package namespace.
 */
export async function loadDatabase() {
  return import("@reading-advantage/db");
}
