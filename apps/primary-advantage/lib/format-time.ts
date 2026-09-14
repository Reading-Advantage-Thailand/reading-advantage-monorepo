/**
 * Formats seconds as m:ss for game timers.
 * @param seconds Elapsed or remaining seconds.
 * @returns Time string like 1:05.
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formats seconds as mm:ss with a padded minute part.
 * @param seconds Elapsed or remaining seconds.
 * @returns Time string like 01:05.
 */
export function formatTimePadded(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
