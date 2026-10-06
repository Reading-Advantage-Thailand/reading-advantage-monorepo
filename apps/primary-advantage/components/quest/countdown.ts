/**
 * Formats the seconds left to an instant as m:ss, never below 0:00.
 * @param endsAt The end instant as ISO text, or null.
 * @param now The current time.
 * @returns The countdown text, or null without an end.
 */
export function countdownText(endsAt: string | null, now: Date): string | null {
  if (!endsAt) return null;
  const left = Math.max(0, Math.ceil((Date.parse(endsAt) - now.getTime()) / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}
