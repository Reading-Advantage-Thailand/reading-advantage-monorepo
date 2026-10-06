/**
 * The display name of a catalog piece from its id (`rogue-hood` → `Rogue hood`). The pack has no
 * name table yet; Thai names are an open item of the avatar shop track.
 * @param id The catalog id.
 * @returns The name.
 */
export function pieceName(id: string): string {
  const words = id.replace(/^avatar-/, "").split("-");
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}
