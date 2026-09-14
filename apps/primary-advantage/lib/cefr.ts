/**
 * Resolves the CEFR badge colours for a CEFR level.
 * @param cefrLevel CEFR level label, or null when unknown.
 * @returns Tailwind classes for the badge.
 */
export function getCefrLevelColor(cefrLevel?: string | null): string {
  if (!cefrLevel) return "bg-gray-100 text-gray-800";
  const level = cefrLevel.toLowerCase();
  if (level.startsWith("a1")) return "bg-red-100 text-red-800";
  if (level.startsWith("a2")) return "bg-orange-100 text-orange-800";
  if (level.startsWith("b1")) return "bg-yellow-100 text-yellow-800";
  if (level.startsWith("b2")) return "bg-green-100 text-green-800";
  if (level.startsWith("c1")) return "bg-blue-100 text-blue-800";
  if (level.startsWith("c2")) return "bg-purple-100 text-purple-800";
  return "bg-gray-100 text-gray-800";
}
