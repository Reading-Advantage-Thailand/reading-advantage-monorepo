/**
 * Opens a page with a full page load and replaces the current history entry.
 * A full load drops the client state of the student who used the tab before.
 * @param url The path to open.
 */
export function replaceLocation(url: string): void {
  window.location.replace(url);
}
